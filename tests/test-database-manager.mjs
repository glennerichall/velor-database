import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {databaseManagerPolicy} from "../database/DatabaseManager.mjs";
import {ClientLogger} from "../database/ClientLogger.mjs";
import {ClientProfiler} from "../database/ClientProfiler.mjs";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";
import {timeoutAsync} from "velor-utils/utils/sync.mjs";
import {noOp} from "velor-utils/utils/functional.mjs";
import {poolManagerPolicy} from "../database/PoolManager.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe('DatabaseManager', function () {
    let DatabaseManagerMock;
    let dbManager;
    let logQueries, createConnectionPool, beginTransact,
        bindStatements, queryRaw, getLogger;

    beforeEach(function () {
        logQueries = false;
        createConnectionPool = sinon.stub();
        beginTransact = sinon.stub();
        bindStatements = sinon.stub();
        queryRaw = sinon.stub();
        getLogger = sinon.stub().returns(noOpLogger);
        DatabaseManagerMock = databaseManagerPolicy({
            logQueries, createConnectionPool, beginTransact,
            bindStatements, queryRaw, getLogger
        });
    });


    describe('initialize', () => {
        it('constructor should initialize expected properties', function () {
            dbManager = new DatabaseManagerMock("schema", "connectionString");
            expect(dbManager).to.have.property('schema').to.equal("schema");
        });

        it('Should correctly initialize a DatabaseManager', async function () {

            let error;
            try {
                const dbm = await new DatabaseManagerMock('schema', 'connectionString').initialize();
            } catch (err) {
                error = err;
            }

            expect(error).to.be.an('error');
            expect(error.message).to.equal('Missing boundStatements');
        });

        it('getDatabase() should correctly initialize the database when it is null initially', async function () {
            const dbManager = new DatabaseManagerMock('schema', 'connection');
            const initializeSpy = sinon.spy(dbManager, 'initialize');
            bindStatements.returns({})
            dbManager.bindStatements({})
            dbManager.getDatabase();
            expect(initializeSpy).to.have.been.calledOnce;
        });

        it('getDatabase() should NOT call initialize when database is already set', function () {
            dbManager = new DatabaseManagerMock('schema', 'connection');
            bindStatements.returns({})
            dbManager.bindStatements({})
            dbManager.initialize();
            const initializeSpy = sinon.spy(dbManager, 'initialize');
            dbManager.getDatabase();
            expect(initializeSpy).to.have.not.been.called;
        });

    })

    describe('acquireClient', () => {
        it('Should correctly create ClientLogger object when logQueries is true', async function () {
            const PoolManagerMock = poolManagerPolicy({logQueries: true, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');

            createConnectionPool.returns({
                on() {
                },
                connect() {
                    return {}
                }
            })
            const acquireClientResult = await pool.acquireClient();
            expect(acquireClientResult).to.be.instanceOf(ClientLogger);
        });

        it('Should correctly create ClientProfiler object when logQueries is false', async function () {
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');
            createConnectionPool.returns({
                on() {
                },
                connect() {
                    return {}
                }
            })
            const acquireClientResult = await pool.acquireClient();
            expect(acquireClientResult).to.be.instanceOf(ClientProfiler);
        });

        it('Should throw exception when getConnectionPool.connect throws an exception', async function () {
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');
            const testError = new Error("Test Exception");

            sinon.stub(pool, "getConnectionPool").returns({
                connect: () => {
                    throw testError;
                }
            });

            let error;
            try {
                await pool.acquireClient();
            } catch (e) {
                error = e;
            }
            expect(error).to.equal(testError);
        });

    })

    it('Should correctly bind statements', function () {
        const dbManager = new DatabaseManagerMock('schema', 'connection');
        const statements = {
            users: {
                getUsersByPlace: sinon.stub(),
                getUsersByGender: sinon.stub(),
            },
            places: {
                getPlaces: sinon.stub()
            }
        };
        dbManager.bindStatements(statements);
        expect(bindStatements).to.have.been.called;
        expect(bindStatements).calledWith(statements);
    });

    it('Should not throw on close pool if pool is null', async function () {
        const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
        const pool = new PoolManagerMock( 'connection');
        await pool.closeDBClientPool();
    });

    describe('getConnectionPool', () => {
        it('connect() should correctly call getConnectionPool', function () {
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');
            const getConnectionPoolSpy = sinon.stub(pool, 'getConnectionPool');
            pool.connect();
            expect(getConnectionPoolSpy).to.have.been.called;
        });

        it('Should correctly get a connection pool if not present', function () {
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');
            createConnectionPool.returns({
                on() {
                }
            })
            pool.getConnectionPool();
            pool.getConnectionPool();
            expect(createConnectionPool).calledOnce;
        });

        it('Should not retry connection pool connection on client acquire if unknown error', async function () {
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');

            let err = new Error();
            let connect = sinon.stub().throws(err);
            createConnectionPool.returns({
                on(event, listener) {
                },
                connect
            })
            let error;
            try {
                await pool.acquireClient();
            } catch (e) {
                error = e;
            }
            expect(error).to.be.an.instanceof(Error);
            expect(error.code).to.eq(err.code);

            expect(connect).calledOnce;

        });

        it('Should retry connection pool connection on client acquire', async function () {
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');

            let err = new Error();
            err.code = '53300';
            createConnectionPool.returns({
                on(event, listener) {
                },
                connect: sinon.stub().onFirstCall().throws(err)
                    .onSecondCall().throws(err)
                    .onThirdCall().resolves()
            })
            let client = pool.acquireClient();
            expect(client).to.not.be.null;

        });

        it('Should retry connection pool connection at ax 3 times on client acquire', async function () {
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');

            let err = new Error();
            err.code = '53300';

            let connect = sinon.stub().throws(err);
            createConnectionPool.returns({
                on(event, listener) {
                },
                connect
            })
            let error;
            try {
                await pool.acquireClient();
            } catch (e) {
                error = e;
            }
            expect(error).to.be.an.instanceof(Error);
            expect(error.code).to.eq(err.code);

            expect(connect).callCount(4);

        });

    })

    describe('database', () => {
        let database, client;
        beforeEach(function () {
            const DatabaseManagerMock = databaseManagerPolicy({getLogger})
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            dbManager = new DatabaseManagerMock('schema-name', new PoolManagerMock( 'connection'));
            client = {
                query: sinon.stub().resolves({
                    rows: [{}]
                }),
                release: sinon.stub()
            };
            let pool = {
                on: sinon.stub(),
                connect: sinon.stub().resolves(client)
            };
            createConnectionPool.returns(pool);
        })

        it('should get database', async () => {
            const dbManager = new DatabaseManagerMock('schema-name', 'connection');
            let client = {};
            let pool = {
                on: sinon.stub(),
                connect: sinon.stub().resolves(client)
            };
            createConnectionPool.returns(pool);

            let statements = {
                users: {
                    getUserByPlace: sinon.stub()
                }
            };
            bindStatements.returns(statements);
            dbManager.bindStatements(statements);
            let database = dbManager.getDatabase();

            expect(database).to.have.property('queryRaw');
            expect(database).to.have.property('close');
            expect(database).to.have.property('beginTransact');
            expect(database).to.have.property('transact');
            expect(database).to.have.property('schema', 'schema-name');
            expect(database).to.have.property('users');
            expect(database.users).to.have.property('getUserByPlace');
        })

        it('should database rawQuery call client with sql and args', async () => {
            dbManager.bindStatements({});
            database = dbManager.getDatabase();
            let args = [1, 34];
            let sql = 'select * from users';
            await database.queryRaw(sql, args);
            expect(client.query).calledWith(sql, args);
            expect(client.release).calledOnce;
        })

        it('should database close pool', async () => {
            const PoolManagerMock = poolManagerPolicy({logQueries, createConnectionPool});
            const pool = new PoolManagerMock( 'connection');

            sinon.spy(pool, 'closeDBClientPool');
            pool.close();

            expect(pool.closeDBClientPool).calledOnce;
        })

        describe('transact', () => {
            it('should get transaction', async () => {
                let statements = {
                    users: {
                        getUserByPlace: sinon.stub()
                    }
                };
                bindStatements.returns(statements);
                dbManager.bindStatements(statements);
                let database = dbManager.getDatabase();
                let transact = await database.beginTransact();

                expect(transact).to.have.property('queryRaw');
                expect(transact).to.have.property('commit');
                expect(transact).to.have.property('rollback');
                expect(transact).to.have.property('schema', 'schema-name');
                expect(transact).to.have.property('isTransact', true);
                expect(transact).to.have.property('users');
                expect(transact.users).to.have.property('getUserByPlace');
            })

            it('should begin transaction', async () => {
                dbManager.bindStatements({});
                let database = dbManager.getDatabase();
                await database.beginTransact();
                expect(client.query).calledWith('BEGIN');
            })

            it('should call client with args', async () => {
                let statements = {
                    users: {
                        getUserByPlace: (client, schema, place) => {
                            client.query(`select * from ${schema}.users where place = $1"`,
                                [place])
                        },
                    }
                };
                dbManager.bindStatements(statements);
                let database = dbManager.getDatabase();
                let transact = await database.beginTransact();

                await transact.users.getUserByPlace('canada');

                let argsFirstCall = client.query.args[0];
                let argsSecondCall = client.query.args[1];

                expect(argsFirstCall[0]).to.eq('BEGIN');

                expect(argsSecondCall[0]).to
                    .eq(`select * from schema-name.users where place = $1"`);

                expect(argsSecondCall[1]).deep.eq(['canada']);
            })

            it('should not auto-release client', async () => {
                let statements = {
                    users: {
                        getUserByPlace: sinon.stub()
                    }
                };
                bindStatements.returns(statements);
                dbManager.bindStatements(statements);
                let database = dbManager.getDatabase();
                let transact = await database.beginTransact();

                await transact.users.getUserByPlace('canada');

                expect(client.release).not.called;

                transact.commit();

                expect(client.release).calledOnce;
            })

            it('should call transact callback', async () => {
                dbManager.bindStatements({});
                let database = dbManager.getDatabase();
                await database.transact(async transact => {
                    expect(transact).to.not.eq(database);
                });
            })

            it('should call await callback to finish', async () => {
                dbManager.bindStatements({});
                let database = dbManager.getDatabase();
                let value = 0;
                await database.transact(async transact => {
                    await timeoutAsync(10);
                    value = 1;
                });
                expect(value).to.equal(1, 'Did not await to transaction to finish');
            })

            it('should auto-commit transaction with callback', async () => {
                dbManager.bindStatements({});
                let database = dbManager.getDatabase();
                await database.transact(noOp);
                expect(client.query.getCall(0)).calledWith('BEGIN');
                expect(client.query.getCall(1)).calledWith('COMMIT');
                expect(client.release).calledOnce;
            })

            it('should auto-rollback transaction on error with callback', async () => {
                dbManager.bindStatements({});
                let database = dbManager.getDatabase();
                let error;
                try {
                    await database.transact(() => {
                        throw new Error('Fake Error')
                    });
                } catch (e) {
                    error = e;
                }
                expect(error).to.be.instanceOf(Error);
                expect(client.query.getCall(0)).calledWith('BEGIN');
                expect(client.query.getCall(1)).calledWith('ROLLBACK');
                expect(client.release).calledOnce;
            })
        })


    })


});


