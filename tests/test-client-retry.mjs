import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {ClientRetry} from "../database/ClientRetry.mjs";
import {s_logger} from "velor-services/application/services/serviceKeys.mjs";
import {
    getInstanceBinder,
    getServiceBinder
} from "velor-services/injection/ServicesContext.mjs";
import {ClientProvider} from "../database/ClientProvider.mjs";
import {s_poolManager} from "../application/services/serviceKeys.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();


describe('ClientRetry', function () {
    let mockClient;
    let sandbox;
    let clientRetry;
    let logger;
    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        logger = {
            debug: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        };

        mockClient = {
            query: sandbox.stub(),
            release: sandbox.stub(),
        };

        let poolManager = {
            connect: sinon.stub().resolves(mockClient)
        };

        let provider = getServiceBinder().createInstance(ClientProvider, {
            profileQueries: true
        });


        getInstanceBinder(provider)
            .setInstance(s_logger, logger)
            .setInstance(s_poolManager, poolManager);

        clientRetry = await provider.acquireClient();

        getInstanceBinder(clientRetry)
            .setInstance(s_logger, logger)

    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('query', function () {
        it('should retry when deadlock error occurs', async function () {
            const mockError = new Error('deadlock');
            mockError.code = '40P01';
            mockClient.query.onFirstCall().throws(mockError);
            mockClient.query.onSecondCall().resolves('result');

            const result = await clientRetry.query('query', 'args');
            expect(result).to.equal('result');
            expect(mockClient.query).calledTwice;
            expect(logger.warn).to.have.been.calledWith('Deadlock detected, retrying request');
        });

        it('should not retry when non-deadlock error occurs', async function () {
            mockClient.query.throws(new Error('error'));

            let error;
            try {
                await clientRetry.query('query', 'args');
            } catch (e) {
                error = e;
            }
            expect(error).to.be.an('error');
            expect(mockClient.query).calledOnce;
        });

        it('should not retry more than 3 times', async function () {
            const mockError = new Error('deadlock');
            mockError.code = '40P01';
            mockClient.query.throws(mockError);

            let error;
            try {
                await clientRetry.query('query', 'args');
            } catch (e) {
                error = e;
            }
            expect(error).to.be.an('error');
            expect(logger.warn).to.have.been.callCount(3);
            expect(logger.error).to.have.been.callCount(2);
        });
    });

    describe('release', function () {
        it('should release client connection', async function () {
            await clientRetry.release();
            expect(mockClient.release).to.have.been.calledOnce;
        });
    });
});