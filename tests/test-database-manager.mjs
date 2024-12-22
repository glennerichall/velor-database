import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {databaseManagerPolicy} from "../database/DatabaseManager.mjs";
import {timeoutAsync} from "velor-utils/utils/sync.mjs";
import {noOp} from "velor-utils/utils/functional.mjs";
import {poolManagerPolicy} from "../database/PoolManager.mjs";
import {
    getInstanceBinder,
    getServiceBinder
} from "velor-services/injection/ServicesContext.mjs";
import {ClientProvider} from "../database/ClientProvider.mjs";
import {s_logger} from "velor-services/application/services/serviceKeys.mjs";
import {
    s_clientProvider,
    s_poolManager
} from "../application/services/serviceKeys.mjs";

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
    let createConnectionPool;
    let beginTransact,
        bindStatements;

    let logger, provider, mockClient, poolManager;

    beforeEach(function () {
        createConnectionPool = sinon.stub();

        DatabaseManagerMock = databaseManagerPolicy();

        logger = {
            debug: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        };

        mockClient = {
            query: sinon.stub(),
            release: sinon.stub(),
        };


        poolManager = {
            connect: sinon.stub().resolves(mockClient)
        };

        provider = getServiceBinder().createInstance(ClientProvider, {
            profileQueries: true
        });

        dbManager = getServiceBinder().createInstance(DatabaseManagerMock, 'schema-name');

        getInstanceBinder(dbManager)
            .setInstance(s_logger, logger)
            .setInstance(s_poolManager, poolManager)
            .setInstance(s_clientProvider, provider);

        getInstanceBinder(provider)
            .setInstance(s_logger, logger)
            .setInstance(s_poolManager, poolManager);
    });


    describe('initialize', () => {
        it('constructor should initialize expected properties', function () {
            dbManager = new DatabaseManagerMock("schema");
            expect(dbManager).to.have.property('schema').to.equal("schema");
        });

    })

    describe('acquireClient', () => {


        it('Should throw exception when getConnectionPool.connect throws an exception', async function () {
            const testError = new Error("Test Exception");
            poolManager.connect.throws(testError);

            let error;
            try {
                await provider.acquireClient();
            } catch (e) {
                error = e;
            }
            expect(error).to.equal(testError);
        });

    })

    it('Should correctly bind statements', function () {
        const statements = {
            users: {
                getUsersByPlace: sinon.stub(),
                getUsersByGender: sinon.stub(),
            },
            places: {
                getPlaces: sinon.stub()
            }
        };
        let bindStatements = sinon.stub();
        new (databaseManagerPolicy({
            bindStatements
        }))().bindStatements(statements);
        expect(bindStatements).to.have.been.called;
        expect(bindStatements).calledWith(statements);
    });

    it('Should not throw on close pool if pool is null', async function () {
        const PoolManagerMock = poolManagerPolicy({createConnectionPool});
        const pool = new PoolManagerMock('connection');
        await pool.closeDBClientPool();
    });

    describe('getConnectionPool', () => {
        it('connect() should correctly call getConnectionPool', function () {
            const PoolManagerMock = poolManagerPolicy({createConnectionPool});
            const pool = new PoolManagerMock('connection');
            const getConnectionPoolSpy = sinon.stub(pool, 'getConnectionPool');
            pool.connect();
            expect(getConnectionPoolSpy).to.have.been.called;
        });

        it('Should not retry connection pool connection on client acquire if unknown error', async function () {

            let err = new Error();
            poolManager.connect.throws(err);

            let error;
            try {
                await provider.acquireClient();
            } catch (e) {
                error = e;
            }
            expect(error).to.be.an.instanceof(Error);
            expect(error.code).to.eq(err.code);

            expect(poolManager.connect).calledOnce;

        });

        it('Should retry connection pool connection on client acquire', async function () {

            let err = new Error();
            err.code = '53300';

            poolManager.connect.onFirstCall().throws(err)
                .onSecondCall().throws(err)
                .onThirdCall().resolves();

            let client = await provider.acquireClient();
            expect(client).to.not.be.null;

        });

        it('Should retry connection pool connection at ax 3 times on client acquire', async function () {
            let err = new Error();
            err.code = '53300';

            poolManager.connect.throws(err);
            let error;
            try {
                await provider.acquireClient();
            } catch (e) {
                error = e;
            }
            expect(error).to.be.an.instanceof(Error);
            expect(error.code).to.eq(err.code);

            expect(poolManager.connect).callCount(4);

        });

    })

    describe('database', () => {
        let database, client;

        it('should get database', async () => {
            let statements = {
                users: {
                    getUserByPlace: sinon.stub()
                }
            };

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
            expect(mockClient.query).calledWith(sql, args);
            expect(mockClient.release).calledOnce;
        })

        it('should database close pool', async () => {
            const PoolManagerMock = poolManagerPolicy({createConnectionPool});
            const pool = new PoolManagerMock('connection');

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
                expect(mockClient.query).calledWith('BEGIN');
            })

            it('should call client with args', async () => {
                let schema = 'schema-name';
                let statements = {
                    users: {
                        getUserByPlace: (client, place) => {
                            client.query(`select * from ${schema}.users where place = $1"`,
                                [place])
                        },
                    }
                };
                dbManager.bindStatements(statements);
                let database = dbManager.getDatabase();
                let transact = await database.beginTransact();

                await transact.users.getUserByPlace('canada');

                let argsFirstCall = mockClient.query.args[0];
                let argsSecondCall = mockClient.query.args[1];

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
                dbManager.bindStatements(statements);
                let database = dbManager.getDatabase();
                let transact = await database.beginTransact();

                await transact.users.getUserByPlace('canada');

                expect(mockClient.release).not.called;

                transact.commit();

                expect(mockClient.release).calledOnce;
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
                expect(mockClient.query.getCall(0)).calledWith('BEGIN');
                expect(mockClient.query.getCall(1)).calledWith('COMMIT');
                expect(mockClient.release).calledOnce;
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
                expect(mockClient.query.getCall(0)).calledWith('BEGIN');
                expect(mockClient.query.getCall(1)).calledWith('ROLLBACK');
                expect(mockClient.release).calledOnce;
            })
        })


    })

});


