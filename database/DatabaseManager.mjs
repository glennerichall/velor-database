import {bindOnAfterMethods} from "velor-utils/utils/proxy.mjs";
import {isTrue} from "velor-utils/utils/predicates.mjs";
import {retry} from "velor-utils/utils/functional.mjs";

import {ClientRetry} from "./ClientRetry.mjs";
import {ClientProfiler} from "./ClientProfiler.mjs";
import {ClientLogger} from "./ClientLogger.mjs";

import {createConnectionPool as createConnectionPoolFct} from "./impl/postgres.mjs";
import {beginTransact as beginTransactFct} from "./beginTransact.mjs";
import {queryRaw as queryRawFct} from "./queryRaw.mjs";
import {bindStatements as bindStatementsFct} from "./bindStatements.mjs";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";

export const databaseManagerPolicy = ({
                                               logQueries = isTrue(process.env.LOG_DATABASE_QUERIES),
                                               createConnectionPool = createConnectionPoolFct,
                                               beginTransact = beginTransactFct,
                                               bindStatements = bindStatementsFct,
                                               queryRaw = queryRawFct,
                                               getLogger = () => noOpLogger
                                           } = {}) => {
    return class DatabaseManager {
        #pool;
        #acquiredCount;
        #boundStatements;
        #rawStatements;
        #database;
        #transact;
        #schema;
        #connectionString;

        constructor(schema, connectionString) {
            this.#pool = null;
            this.#acquiredCount = 0;
            this.#boundStatements = null;
            this.#rawStatements = null;
            this.#database = null;
            this.#transact = null;
            this.#schema = schema;
            this.#connectionString = connectionString;
        }

        get schema() {
            return this.#schema;
        }

        initialize() {
            const statements = this.#boundStatements;

            statements.queryRaw = async (query, args) => {
                const client = await this.acquireClient();
                try {
                    return queryRaw(client, query, args, getLogger(this));
                } finally {
                    client.release();
                }
            };

            statements.close = () => this.closeDBClientPool();

            statements.beginTransact = async () => {
                const client = await this.acquireClient();
                // bind statements with schema and client but do not auto-release client
                // as it will be reused in the current transaction.
                const statements = bindStatements(this.#rawStatements, this.schema, client);
                let transactManager = await beginTransact(client);

                let transact = {
                    ...transactManager,
                    ...statements,
                    queryRaw: (query, args) => queryRaw(client, query, args, getLogger(this))
                };
                transact.isTransact = true;

                let self = this;
                transact = bindOnAfterMethods(transact,
                    {
                        onCommit() {
                            self.#transact = null;
                        },
                        onRollback() {
                            self.#transact = null;
                        }
                    });

                this.#transact = transact;

                Object.defineProperty(this.#transact, "schema", {
                    enumerable: true,
                    configurable: false,
                    get: () => this.schema,
                });

                return transact;
            };

            statements.transact = async callback => {
                let transact = await statements.beginTransact();
                try {
                    const result = await callback(transact);
                    await transact.commit();
                    return result;
                } catch (e) {
                    await transact.rollback();
                    throw e;
                }
            }

            this.#database = statements;

            Object.defineProperty(this.#database, "schema", {
                enumerable: true,
                configurable: false,
                get: () => this.schema,
            });

            return this;
        }

        getCurrentTransaction() {
            return this.#transact;
        }

        getDatabase() {
            if (!this.#database) {
                this.initialize();
            }
            return this.#database;
        }

        connect() {
            this.getConnectionPool();
        }

        getConnectionPool() {
            if (this.#pool === null) {
                getLogger(this).debug(`Creating database connection pool [${this.schema}]`);
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

        async acquireClient() {
            try {
                let client = await retry(() => this.getConnectionPool().connect(), {
                    retry: (error, i) => {
                        let isTooManyClients = error.code === '53300';
                        if (isTooManyClients) {
                            getLogger(this).debug(`Too many clients already, retrying(${i}) connection to database`);
                        }
                        return (isTooManyClients) && i < 3;
                    }
                });
                client = new ClientRetry(client);
                if (logQueries) {
                    return new ClientLogger(client, getLogger(this));
                }
                return new ClientProfiler(client);
            } catch (e) {
                getLogger(this).debug(e);
                throw e;
            }
        }

        bindStatements(statements) {
            let schema = this.schema;
            this.#rawStatements = statements;
            this.#boundStatements = bindStatements(statements, schema, () => this.acquireClient());
            return this;
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


export const DatabaseManager = databaseManagerPolicy();