import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {databaseManagerPolicy} from "../database/DatabaseManager.mjs";
import {ClientLogger} from "../database/ClientLogger.mjs";
import {ClientProfiler} from "../database/ClientProfiler.mjs";
import {broadcast} from "velor-utils/utils/functional.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe('DatabaseManager', function () {
    let DatabaseManager;
    let dbManager;
    let logQueries, createConnectionPool, beginTransact,
        bindStatements, queryRaw, getLogger;

    beforeEach(function () {
        logQueries = false;
        createConnectionPool = sinon.stub();
        beginTransact = sinon.stub();
        bindStatements = sinon.stub();
        queryRaw = sinon.stub();
        DatabaseManager = databaseManagerPolicy({
            logQueries, createConnectionPool, beginTransact,
            bindStatements, queryRaw, getLogger
        });
        dbManager = new DatabaseManager("schema", "connectionString");
    });

    it('constructor should initialize expected properties', function () {
        expect(dbManager).to.have.property('schema').to.equal("schema");
    });


    it('Should correctly initialize a DatabaseManager', async function () {

        let error;
        try {
            const initializedDatabaseManager = await new DatabaseManager('schema', 'connectionString').initialize();
        } catch (err) {
            error = err;
        }

        expect(error).to.be.an('error');
        expect(error.message).to.equal('Missing boundStatements');
    });

    it('getDatabase() should correctly initialize the database when it is null initially', async function () {
        const dbManager = new DatabaseManager('schema', 'connection');
        const initializeSpy = sinon.spy(dbManager, 'initialize');
        bindStatements.returns({})
        dbManager.bindStatements({})
        dbManager.getDatabase();
        expect(initializeSpy).to.have.been.calledOnce;
    });

    it('getDatabase() should NOT call initialize when database is already set', function () {
        dbManager = new DatabaseManager('schema', 'connection');
        bindStatements.returns({})
        dbManager.bindStatements({})
        dbManager.initialize();
        const initializeSpy = sinon.spy(dbManager, 'initialize');
        dbManager.getDatabase();
        expect(initializeSpy).to.have.not.been.called;
    });

    it('connect() should correctly call getConnectionPool', function () {
        const getConnectionPoolSpy = sinon.stub(dbManager, 'getConnectionPool');
        dbManager.connect();
        expect(getConnectionPoolSpy).to.have.been.called;
    });

    it('Should correctly get a connection pool if not present', function () {
        const dbManager = new DatabaseManager('schema', 'connection');
        createConnectionPool.returns({
            on() {
            }
        })
        dbManager.getConnectionPool();
        dbManager.getConnectionPool();
        expect(createConnectionPool).calledOnce;
    });


    it('Should correctly create ClientLogger object when logQueries is true', async function () {
        let DatabaseManager = databaseManagerPolicy({
            logQueries: true, createConnectionPool, beginTransact,
            bindStatements, queryRaw, getLogger
        });

        dbManager = new DatabaseManager('schema', 'connection');

        createConnectionPool.returns({
            on() {
            },
            connect() {
                return {}
            }
        })
        const acquireClientResult = await dbManager.acquireClient();
        expect(acquireClientResult).to.be.instanceOf(ClientLogger);
    });

    it('Should correctly create ClientProfiler object when logQueries is false', async function () {
        dbManager = new DatabaseManager('schema', 'connection');
        createConnectionPool.returns({
            on() {
            },
            connect() {
                return {}
            }
        })
        const acquireClientResult = await dbManager.acquireClient();
        expect(acquireClientResult).to.be.instanceOf(ClientProfiler);
    });

    it('Should throw exception when getConnectionPool.connect throws an exception', async function () {
        dbManager = new DatabaseManager('schema', 'connection');
        const testError = new Error("Test Exception");

        sinon.stub(dbManager, "getConnectionPool").returns({
            connect: () => {
                throw testError;
            }
        });

        let error;
        try {
            await dbManager.acquireClient();
        } catch (e) {
            error = e;
        }
        expect(error).to.equal(testError);
    });

    it('Should correctly bind statements', function () {
        const dbManager = new DatabaseManager('schema', 'connection');
        dbManager.bindStatements({});
        expect(bindStatements).to.have.been.called;
    });

    it('Should not throw on close pool if pool is null', async function () {
        const dbManager = new DatabaseManager('schema', 'connection');
        dbManager.closeDBClientPool();
    });

    it('Should not retry connection pool connection on client acquire if unknown error', async function () {
        // Create a instance
        const dbManager = new DatabaseManager('schema', 'connection');

        let err = new Error();
        let connect = sinon.stub().throws(err);
        createConnectionPool.returns({
            on(event, listener) {
            },
            connect
        })
        let error;
        try {
            await dbManager.acquireClient();
        } catch (e) {
            error = e;
        }
        expect(error).to.be.an.instanceof(Error);
        expect(error.code).to.eq(err.code);

        expect(connect).calledOnce;

    });

    it('Should retry connection pool connection on client acquire', async function () {
        // Create a instance
        const dbManager = new DatabaseManager('schema', 'connection');

        let err = new Error();
        err.code = '53300';
        createConnectionPool.returns({
            on(event, listener) {
            },
            connect: sinon.stub().onFirstCall().throws(err)
                .onSecondCall().throws(err)
                .onThirdCall().resolves()
        })
        let client = dbManager.acquireClient();
        expect(client).to.not.be.null;

    });

    it('Should retry connection pool connection at ax 3 times on client acquire', async function () {
        const dbManager = new DatabaseManager('schema', 'connection');

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
            await dbManager.acquireClient();
        } catch (e) {
            error = e;
        }
        expect(error).to.be.an.instanceof(Error);
        expect(error.code).to.eq(err.code);

        expect(connect).callCount(4);

    });

    it('should get database', async()=>{

    })


    // it('Should correctly close DB Client Pool and retry if needed', async function () {
    //     // Create a instance
    //     const dbManager = new DatabaseManager('schema', 'connection');
    //
    //     let listeners = [];
    //     createConnectionPool.returns({
    //         on(event, listener) {
    //             listeners.push(listener);
    //         },
    //         connect() {
    //             broadcast(listeners)();
    //             return {}
    //         }
    //     })
    //     dbManager.acquireClient();
    //
    //
    //     // Call the method
    //     await dbManager.closeDBClientPool();
    //
    // });
});


