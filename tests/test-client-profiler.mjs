import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {Timer} from "velor-utils/utils/Timer.mjs";
import {ClientProvider} from "../database/ClientProvider.mjs";
import {
    createAppServicesInstance,
    getInstanceBinder,
    getServiceBinder
} from "velor-services/injection/ServicesContext.mjs";
import {s_poolManager} from "../application/services/serviceKeys.mjs";
import {s_logger} from "velor-services/application/services/serviceKeys.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe('ClientProfiler', function () {
    let sandbox;
    let clientProfiler;
    let mockClient;
    let mockTimer;
    let poolManager;
    let provider;
    let logger;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        logger = {
            debug: sinon.stub(),
            warn: sinon.stub(),
        };

        mockClient = {
            release: sandbox.stub(),
            query: sandbox.stub().resolves('query result')
        };

        mockTimer = {
            stop: sandbox.stub()
        };
        Timer.start = () => mockTimer;


        sandbox.stub(console, 'debug');

        poolManager = {
            connect: sinon.stub(),
            acquireClient: sinon.stub().resolves(mockClient),
        };

        provider = getServiceBinder().createInstance(ClientProvider, {
            profileQueries: true
        });

        getInstanceBinder(provider)
            .setInstance(s_logger, logger)
            .setInstance(s_poolManager, poolManager);


        clientProfiler = await provider.acquireClient();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('query', function () {
        it('should return result from client.query', async function () {
            const queryResult = await clientProfiler.query('query', ['arg']);
            expect(queryResult).to.equal('query result');
            expect(mockClient.query).to.have.been.calledWith('query', ['arg']);
        });

        it('should log output if span >= 4000 ', async function () {

            mockTimer.stop.returns(4000);
            await clientProfiler.query('query', ['arg']);
            expect(logger.warn).to.have.been.calledWith('Database query took 4000 ms');
        });

        it('should not log output if span < 4000 ', async function () {
            mockTimer.stop.returns(3999);
            await clientProfiler.query('query', ['arg']);
            expect(logger.warn).not.to.have.been.called;
        });
    });

    describe('release', function () {
        it('should call client.release', function () {
            clientProfiler.release();

            expect(mockClient.release).to.have.been.calledOnce;
        });
    })
});