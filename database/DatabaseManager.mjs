import {bindOnAfterMethods} from "velor-utils/utils/proxy.mjs";
import {isTrue} from "velor-utils/utils/predicates.mjs";
import {beginTransact as beginTransactFct} from "./beginTransact.mjs";
import {queryRaw as queryRawFct} from "./queryRaw.mjs";
import {bindStatements as bindStatementsFct} from "./bindStatements.mjs";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";
import {poolManagerPolicy} from "./PoolManager.mjs";

export const databaseManagerPolicy = ({
                                          logQueries = isTrue(process.env.LOG_DATABASE_QUERIES),
                                          beginTransact = beginTransactFct,
                                          bindStatements = bindStatementsFct,
                                          queryRaw = queryRawFct,
                                          getLogger = () => noOpLogger,
                                          ...others
                                      } = {}) => {
    return class DatabaseManager extends poolManagerPolicy({
        logQueries,
        ...others,
    }) {
        #boundStatements;
        #rawStatements;
        #database;
        #transact;
        #schema;

        constructor(schema, connectionString) {
            super(connectionString);
            this.#boundStatements = null;
            this.#rawStatements = null;
            this.#database = null;
            this.#transact = null;
            this.#schema = schema;
        }

        get schema() {
            return this.#schema;
        }

        initialize() {

            if (!this.#boundStatements) {
                throw new Error("Missing boundStatements");
            }

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

        bindStatements(statements) {
            let schema = this.schema;
            this.#rawStatements = statements;
            this.#boundStatements = bindStatements(statements, schema, () => this.acquireClient());
            return this;
        }

    }
}


export const DatabaseManager = databaseManagerPolicy();