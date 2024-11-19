import {bindOnAfterMethods} from "velor-utils/utils/proxy.mjs";
import {beginTransact as beginTransactFct} from "./beginTransact.mjs";
import {queryRaw as queryRawFct} from "./queryRaw.mjs";
import {bindStatements as bindStatementsFct} from "./bindStatements.mjs";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";

export const databaseManagerPolicy = ({
                                          beginTransact = beginTransactFct,
                                          bindStatements = bindStatementsFct,
                                          queryRaw = queryRawFct,
                                          getLogger = () => noOpLogger,
                                      } = {}) => {
    return class DatabaseManager {
        #boundStatements;
        #rawStatements;
        #database;
        #transact;
        #schema;
        #pool;

        constructor(schema, pool) {
            this.#pool = pool;
            this.#boundStatements = null;
            this.#rawStatements = null;
            this.#database = null;
            this.#transact = null;
            this.#schema = schema;
        }

        get schema() {
            return this.#schema;
        }

        connect() {
            return this.#pool.connect();
        }

        initialize() {

            if (!this.#boundStatements) {
                throw new Error("Missing boundStatements");
            }

            const statements = this.#boundStatements;

            statements.queryRaw = async (query, args) => {
                const client = await this.#pool.acquireClient();
                try {
                    return queryRaw(client, query, args, getLogger(this));
                } finally {
                    client.release();
                }
            };

            statements.close = () => this.#pool.closeDBClientPool();

            statements.beginTransact = async () => {
                const client = await this.#pool.acquireClient();
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
            this.#boundStatements = bindStatements(statements, schema, () => this.#pool.acquireClient());
            return this;
        }

    }
}


export const DatabaseManager = databaseManagerPolicy();