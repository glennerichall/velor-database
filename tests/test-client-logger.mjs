import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {ClientProvider} from "../database/ClientProvider.mjs";
import {
    getInstanceBinder,
    getServiceBinder
} from "velor-services/injection/ServicesContext.mjs";
import {s_logger} from "velor-services/application/services/serviceKeys.mjs";
import {s_poolManager} from "../application/services/serviceKeys.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();


describe('ClientLogger', () => {

    let provider, logger, client, poolManager;

    beforeEach(async () => {
        logger = {
            debug: sinon.stub(),
            warn: sinon.stub(),
        };
        client = {
            query: sinon.stub().resolves('QUERY_RESULT'),
            release: sinon.stub()
        };

        poolManager = {connect: sinon.stub().resolves(client)};
        provider = getServiceBinder().createInstance(ClientProvider, {
            profileQueries: true
        });
        getInstanceBinder(provider)
            .setInstance(s_logger, logger)
            .setInstance(s_poolManager, poolManager);
    })


    describe('query', () => {
        it('should log and pass query to parent class', async () => {
            provider.logQueries = true;
            let clientLogger = await provider.acquireClient();

            let result = await clientLogger.query('SOME_QUERY $1 $2', ['arg1', 'arg2']);

            expect(client.query).calledOnce;
            expect(logger.debug).calledBefore(client.query);
            expect(logger.debug).calledWith("SOME_QUERY 'arg1' 'arg2'");
            expect(result).to.equal('QUERY_RESULT');
        });

        it('should still work if no args are passed', async () => {
            provider.logQueries = true;
            let clientLogger = await provider.acquireClient();

            let result = await clientLogger.query('SOME_QUERY');

            expect(client.query).calledOnce;
            expect(logger.debug).calledBefore(client.query);
            expect(result).to.equal('QUERY_RESULT');
        });

    });

    describe('release', () => {
        it('should call client.release', async () => {
            provider.logQueries = true;
            let clientLogger = await provider.acquireClient();

            clientLogger.release()

            expect(client.release.calledOnce).is.true;
        });
    });
});