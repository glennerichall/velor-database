import {retry} from "velor-utils/utils/functional.mjs";
import {createConnectionPool as createConnectionPoolFct} from "./impl/postgres.mjs";
import {getLogger} from "velor-services/application/services/services.mjs";


export const poolManagerPolicy = ({
                                      createConnectionPool = createConnectionPoolFct,
                                  } = {}) => {
    return class PoolManager {
        #pool;
        #acquiredCount;
        #connectionString;

        constructor(connectionString, logQueries = false) {
            this.#pool = null;
            this.#acquiredCount = 0;
            this.#connectionString = connectionString;
        }

        connect() {
            this.getConnectionPool();
        }

        acquireClient() {
            return this.getConnectionPool().connect();
        }

        getConnectionPool() {
            if (this.#pool === null) {
                getLogger(this).debug(`Creating database connection pool`);
                this.#pool = createConnectionPool(this.#connectionString)

                this.#pool.on('acquire', () => {
                    this.#acquiredCount++;
                    getLogger(this).silly(`Database client acquired [${this.schema}]: ` + this.#acquiredCount);
                });
                this.#pool.on('release', () => {
                    this.#acquiredCount--;
                    getLogger(this).silly(`Database client released [${this.schema}]: ` + this.#acquiredCount);
                });
            }
            return this.#pool;
        }

        async close() {
            // alias
            return this.closeDBClientPool();
        }

        async closeDBClientPool() {
            if (this.#pool === null) return;

            await retry(() => {
                return this.#acquiredCount === 0 &&
                    this.#pool.waitingCount === 0;
            }, {retry: 3});

            await this.#pool.end();

            await retry(() => {
                return this.#pool.idleCount === 0;
            }, {retry: 3});

            this.#pool = null;
            this.#acquiredCount = 0;
        }
    }
}

export const PoolManager = poolManagerPolicy();