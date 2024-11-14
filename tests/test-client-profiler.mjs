import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {ClientProfiler} from "../database/ClientProfiler.mjs";
import {Timer} from "velor-utils/utils/Timer.mjs";

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

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        // Stubbing the release method of the client
        mockClient = {
            release: sandbox.stub(),
            query: sandbox.stub().resolves('query result')
        };

        mockTimer = {
            stop: sandbox.stub()
        };
        Timer.start = () => mockTimer;

        clientProfiler = new ClientProfiler(mockClient);
        sandbox.stub(console, 'debug');
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

        it('should log output if span > 4000 ', async function () {

            mockTimer.stop.returns(4001);
            await clientProfiler.query('query', ['arg']);
            expect(console.debug).to.have.been.calledWith('Database query (ms)', 4001);
        });

        it('should not log output if span <= 4000 ', async function () {
            mockTimer.stop.returns(4000);
            await clientProfiler.query('query', ['arg']);
            expect(console.debug).not.to.have.been.called;
        });
    });

    describe('release', function () {
        it('should call client.release', function () {
            clientProfiler.release();

            expect(mockClient.release).to.have.been.calledOnce;
        });
    })
});