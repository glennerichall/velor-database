import {beginTransact as beginTransactFct} from "./beginTransact.mjs";
import {bindStatements as bindStatementsFct} from "./bindStatements.mjs";
import {getLogger} from "velor-services/application/services/services.mjs";
import {
    getClientProvider,
    getPoolManager
} from "../application/services/services.mjs";

export const databaseManagerPolicy = ({
                                          beginTransact = beginTransactFct,
                                          bindStatements = bindStatementsFct,
                                      } = {}) => {
    return class DatabaseManager {
        #boundStatements;
        #rawStatements;
        #database;
        // #transact;
        #schema;

        constructor(schema) {
            this.#boundStatements = null;
            this.#rawStatements = null;
            this.#database = null;
            // this.#transact = null;
            this.#schema = schema;
        }

        get schema() {
            return this.#schema;
        }

        connect() {
            return getPoolManager(this).connect();
        }

        #createDatabase() {

            if (!this.#boundStatements) {
                throw new Error("Missing boundStatements");
            }

            const database = this.#boundStatements;

            database.queryRaw = async (query, args) => {
                const client = await getClientProvider(this).acquireClient();
                try {
                    return client.query(query, args);
                } finally {
                    client.release();
                }
            };

            database.close = () => getPoolManager(this).closeDBClientPool();

            database.beginTransact = async () => {
                const client = await getClientProvider(this).acquireClient();
                // bind statements with schema and client but do not auto-release client
                // as it will be reused in the current transaction.
                const statements = bindStatements(this.#rawStatements, client);
                let transactManager = await beginTransact(client);

                let transact = {
                    ...transactManager,
                    ...statements,
                    queryRaw: (query, args) => client.query(query, args)
                };
                transact.isTransact = true;

                // let self = this;
                // transact = bindOnAfterMethods(transact,
                //     {
                //         onCommit() {
                //             self.#transact = null;
                //         },
                //         onRollback() {
                //             self.#transact = null;
                //         }
                //     });
                //
                // this.#transact = transact;

                Object.defineProperty(transact, "schema", {
                    enumerable: true,
                    configurable: false,
                    get: () => this.schema,
                });

                return transact;
            };

            database.transact = async callback => {
                let transact = await database.beginTransact();
                try {
                    const result = await callback(transact);
                    await transact.commit();
                    return result;
                } catch (e) {
                    await transact.rollback();
                    throw e;
                }
            }

            this.#database = database;

            Object.defineProperty(this.#database, "schema", {
                enumerable: true,
                configurable: false,
                get: () => this.schema,
            });

            return this;
        }

        // getCurrentTransaction() {
        //     return this.#transact;
        // }

        getDatabase() {
            if (!this.#database) {
                this.#createDatabase();
            }
            return this.#database;
        }

        bindStatements(statements) {
            this.#rawStatements = statements;
            this.#boundStatements = bindStatements(statements, () => getClientProvider(this).acquireClient());
            return this;
        }

    }
}


export const DatabaseManager = databaseManagerPolicy();