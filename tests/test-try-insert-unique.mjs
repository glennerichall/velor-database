
import {tryInsertUnique} from "../database/tryInsertUnique.mjs";
import sinon from "sinon";

import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

class Client {
    async query(){}
}
describe('tryInsertUnique', () => {

    let client, queryStub;

    beforeEach(() => {
        client = new Client();
    });

    afterEach(() => {
        if (queryStub) {
            queryStub.restore();
        }
    });

    it('should return the inserted row when the insertion is successful', async () => {
        const query = 'INSERT INTO table (column) VALUES (?)';
        const args = ['value'];
        const expectedResult = { id: 1, column: 'value' };

        queryStub = sinon.stub(client, 'query').resolves({ rows: [expectedResult] });

        const result = await tryInsertUnique(client, query, args);

        expect(queryStub.calledOnce).to.be.true;
        expect(result).to.equals(expectedResult);
    });

    it('should retry the insertion when a "23505" error is thrown', async () => {
        const query = 'INSERT INTO table (column) VALUES (?)';
        const args = ['value'];
        const expectedResult = { id: 1, column: 'value' };

        queryStub = sinon.stub(client, 'query');
        queryStub.onFirstCall().rejects({ code: '23505' });
        queryStub.onSecondCall().resolves({ rows: [expectedResult] });

        const result = await tryInsertUnique(client, query, args);

        expect(queryStub.calledTwice).to.be.true;
        expect(result).to.equals(expectedResult);
    });

    it('should throw non-"23505" errors', async () => {
        const query = 'INSERT INTO table (column) VALUES (?)';
        const args = ['value'];
        const error = new Error('test error');
        error.code = '500';

        queryStub = sinon.stub(client, 'query').rejects(error);

        try {
            await tryInsertUnique(client, query, args);
            throw new Error("This shouldn't execute.");
        } catch (e) {
            expect(e).to.equals(error);
        }

        expect(queryStub.calledOnce).to.be.true;
    });
});