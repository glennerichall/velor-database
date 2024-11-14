import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();


describe('beginTransact', function() {
    let client;
    let transaction;

    beforeEach(function() {
        client = {
            query: sinon.stub(),
            release: sinon.stub()
        };
    });

    afterEach(function() {
        sinon.restore();
    });

    describe('begin transaction', function() {
        it('should call BEGIN query on client', async function() {
            await beginTransactFct(client);

            expect(client.query.calledOnceWithExactly('BEGIN')).to.be.true;
        });

        it('should release client when an error occurs', async function() {
            client.query.rejects(new Error('Fake Error'));

            try {
                await beginTransactFct(client);
            } catch (e) {
                expect(e).to.be.instanceOf(Error);
                expect(e.message).to.equal('Fake Error');
                expect(client.release.calledOnce).to.be.true;
            }
        });
    });

    describe('commit transaction', function() {
        beforeEach(async function() {
            transaction = await beginTransactFct(client);
        });

        it('should call COMMIT query on client', async function() {
            await transaction.commit();

            expect(client.query.calledOnceWithExactly('COMMIT')).to.be.true;
        });

        it('should release client even if an error happens', async function() {
            client.query.onCall(1).rejects(new Error('Fake Error'));

            try {
                await transaction.commit();
            } catch (e) {
                expect(e).to.be.instanceOf(Error);
                expect(e.message).to.equal('Fake Error');
                expect(client.release.calledOnce).to.be.true;
            }
        });
    });

    describe('rollback transaction', function() {
        beforeEach(async function() {
            transaction = await beginTransactFct(client);
        });

        it('should call ROLLBACK query on client', async function() {
            await transaction.rollback();

            expect(client.query.calledOnceWithExactly('ROLLBACK')).to.be.true;
        });

        it('should release client even if an error happens', async function() {
            client.query.onCall(1).rejects(new Error('Fake Error'));

            try {
                await transaction.rollback();
            } catch (e) {
                expect(e).to.be.instanceOf(Error);
                expect(e.message).to.equal('Fake Error');
                expect(client.release.calledOnce).to.be.true;
            }
        });
    });
});