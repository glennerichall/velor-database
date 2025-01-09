import {beginTransact as beginTransactFct} from "./beginTransact.mjs";
import {bindStatements as bindStatementsFct} from "./bindStatements.mjs";
import {
    getClientProvider,
    getPoolManager
} from "../application/services/services.mjs";

const kp_boundStatements = Symbol();
const kp_rawStatements = Symbol();
const kp_database = Symbol();
const kp_schema = Symbol();
const km_createDatabase = Symbol();

export const databaseManagerPolicy = ({
                                          beginTransact = beginTransactFct,
                                          bindStatements = bindStatementsFct,
                                      } = {}) => {
    return class DatabaseManager {

        constructor(schema) {
            this[kp_boundStatements] = null;
            this[kp_rawStatements] = null;
            this[kp_database] = null;
            // this[k_transact] = null;
            this[kp_schema] = schema;
        }

        get schema() {
            return this[kp_schema];
        }

        connect() {
            return getPoolManager(this).connect();
        }

        [km_createDatabase]() {

            if (!this[kp_boundStatements]) {
                throw new Error("Missing boundStatements");
            }

            const database = this[kp_boundStatements];

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
                const statements = bindStatements(this[kp_rawStatements], client);
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
                //             self[k_transact] = null;
                //         },
                //         onRollback() {
                //             self[k_transact] = null;
                //         }
                //     });
                //
                // this[k_transact] = transact;

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

            this[kp_database] = database;

            Object.defineProperty(this[kp_database], "schema", {
                enumerable: true,
                configurable: false,
                get: () => this.schema,
            });

            return this;
        }

        // getCurrentTransaction() {
        //     return this[k_transact];
        // }

        getDatabase() {
            if (!this[kp_database]) {
                this[km_createDatabase]();
            }
            return this[kp_database];
        }

        bindStatements(statements) {
            this[kp_rawStatements] = statements;
            this[kp_boundStatements] = bindStatements(statements, () => getClientProvider(this).acquireClient());
            return this;
        }

    }
}


export const DatabaseManager = databaseManagerPolicy();