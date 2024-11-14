import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {queryRaw} from "../database/queryRaw.mjs";
const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe("Testing queryRaw function", () => {
    let client;
    let logger;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        client = { query: sandbox.stub() };
        logger = { debug: sandbox.stub() };
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("Normal case: should return rows when the query is successful", async () => {
        const expectedRows = [{ name: "John Doe" }];
        client.query.resolves({ rows: expectedRows });

        const result = await queryRaw(client, "SELECT * FROM users", [], logger);

        expect(result).to.deep.equal(expectedRows);
        expect(logger.debug.called).to.be.false;
    });

    it("Edge case: should log error and throw when there is an exception", async () => {
        client.query.rejects(new Error("mock error"));

        try {
            await queryRaw(client, "SELECT * FROM users WHERE id=$1", [101], logger);
        } catch (e) {
            expect(e).to.be.instanceOf(Error);
            expect(logger.debug.calledOnce).to.be.true;
            expect(logger.debug.calledWith("SELECT * FROM users WHERE id=101"))
        }
    });
});