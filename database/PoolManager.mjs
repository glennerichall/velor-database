import {retry} from "velor-utils/utils/functional.mjs";
import {createConnectionPool as createConnectionPoolFct} from "./impl/postgres.mjs";
import {isTrue} from "velor-utils/utils/predicates.mjs";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";
import {acquireClient as acquireClientFct} from "./acquireClient.mjs";


export const poolManagerPolicy = ({
                                      logQueries = isTrue(process.env.LOG_DATABASE_QUERIES),
                                      createConnectionPool = createConnectionPoolFct,
                                      getLogger = () => noOpLogger,
                                      acquireClient = acquireClientFct
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

        async acquireClient() {
            return await acquireClient(this.getConnectionPool(),
                {
                    logQueries,
                    getLogger
                });
        }

        connect() {
            this.getConnectionPool();
        }

        getConnectionPool() {
            if (this.#pool === null) {
                getLogger(this).debug(`Creating database connection pool`);
                this.#pool = createConnectionPool(this.#connectionString)

                this.#pool.on('acquire', () => {
                    this.#acquiredCount++;
                    getLogger(this).silly('Database client acquired [${this.schema}]: ' + this.#acquiredCount);
                });
                this.#pool.on('release', () => {
                    this.#acquiredCount--;
                    getLogger(this).silly('Database client released [${this.schema}]: ' + this.#acquiredCount);
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