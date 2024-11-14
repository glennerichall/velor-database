import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {ClientLogger} from "../database/ClientLogger.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();


describe('ClientLogger', () => {


    describe('query', () => {
        it('should log and pass query to parent class', async () => {
            let client = {query: sinon.stub().resolves('QUERY_RESULT')};
            let logger = {debug: sinon.stub()};
            let clientLogger = new ClientLogger(client, logger);

            let result = await clientLogger.query('SOME_QUERY $1 $2', ['arg1', 'arg2']);

            expect(clientLogger._client.query).calledOnce;
            expect(clientLogger._logger.debug).calledBefore(client.query);
            expect(clientLogger._logger.debug).calledWith("SOME_QUERY 'arg1' 'arg2'");
            expect(result).to.equal('QUERY_RESULT');
        });

        it('should still work if no args are passed', async () => {
            let client = {query: sinon.stub().resolves('QUERY_RESULT')};
            let logger = {debug: sinon.stub()};
            let clientLogger = new ClientLogger(client, logger);

            let result = await clientLogger.query('SOME_QUERY');

            expect(clientLogger._client.query.calledOnce).is.true;
            expect(clientLogger._logger.debug.calledBefore(client.query)).is.true;
            expect(result).to.equal('QUERY_RESULT');
        });

    });

    describe('release', () => {
        it('should call client.release', () => {
            let client = {release: sinon.stub()};
            let logger = {};
            let clientLogger = new ClientLogger(client, logger);

            clientLogger.release()

            expect(client.release.calledOnce).is.true;
        });
    });
});