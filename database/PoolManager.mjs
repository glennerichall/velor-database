import {retry} from "velor-utils/utils/functional.mjs";
import {createConnectionPool as createConnectionPoolFct} from "./impl/postgres.mjs";
import {getLogger} from "velor-services/application/services/services.mjs";

const kp_pool = Symbol();
const kp_acquiredCount = Symbol();
const kp_connectionString = Symbol();

export const poolManagerPolicy = ({
                                      createConnectionPool = createConnectionPoolFct,
                                  } = {}) => {
    return class PoolManager {

        constructor(connectionString) {
            this[kp_pool] = null;
            this[kp_acquiredCount] = 0;
            this[kp_connectionString] = connectionString;
        }

        connect() {
            this.getConnectionPool();
        }

        acquireClient() {
            return this.getConnectionPool().connect();
        }

        getConnectionPool() {
            if (this[kp_pool] === null) {
                getLogger(this).debug(`Creating database connection pool`);
                this[kp_pool] = createConnectionPool(this[kp_connectionString])

                this[kp_pool].on('acquire', () => {
                    this[kp_acquiredCount]++;
                    getLogger(this).silly(`Database client acquired: ` + this[kp_acquiredCount]);
                });
                this[kp_pool].on('release', () => {
                    this[kp_acquiredCount]--;
                    getLogger(this).silly(`Database client released: ` + this[kp_acquiredCount]);
                });
            }
            return this[kp_pool];
        }

        async close() {
            // alias
            return this.closeDBClientPool();
        }

        async closeDBClientPool() {
            if (this[kp_pool] === null) return;

            await retry(() => {
                return this[kp_acquiredCount] === 0 &&
                    this[kp_pool].waitingCount === 0;
            }, {retry: 3});

            await this[kp_pool].end();

            await retry(() => {
                return this[kp_pool].idleCount === 0;
            }, {retry: 3});

            this[kp_pool] = null;
            this[kp_acquiredCount] = 0;
        }
    }
}

export const PoolManager = poolManagerPolicy();