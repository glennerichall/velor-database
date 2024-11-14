import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {ClientRetry} from "../database/ClientRetry.mjs";

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

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        mockClient = {
            query: sandbox.stub(),
            release: sandbox.stub(),
        };
        clientRetry = new ClientRetry(mockClient);
        sandbox.stub(console, 'debug');
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
            expect(console.debug).to.have.been.calledWith('Deadlock detected, retrying request');
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
            expect(console.debug).to.have.been.callCount(4);
        });
    });

    describe('release', function () {
        it('should release client connection', async function () {
            await clientRetry.release();
            expect(mockClient.release).to.have.been.calledOnce;
        });
    });
});