import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {beginTransact} from "../database/beginTransact.mjs";

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
            await beginTransact(client);

            expect(client.query).calledOnceWith('BEGIN');
        });

        it('should release client when an error occurs', async function() {
            client.query.rejects(new Error('Fake Error'));

            try {
                await beginTransact(client);
                throw new Error('should not get here')
            } catch (e) {
                expect(e).to.be.instanceOf(Error);
                expect(e.message).to.equal('Fake Error');
                expect(client.release).calledOnce;
            }
        });
    });

    describe('commit transaction', function() {
        beforeEach(async function() {
            transaction = await beginTransact(client);
        });

        it('should call COMMIT query on client', async function() {
            await transaction.commit();

            expect(client.query).calledWithExactly('COMMIT');
        });

        it('should release client even if an error happens', async function() {
            client.query.onCall(1).rejects(new Error('Fake Error'));

            try {
                await transaction.commit();
                throw new Error('should not get here')
            } catch (e) {
                expect(e).to.be.instanceOf(Error);
                expect(e.message).to.equal('Fake Error');
                expect(client.release).calledOnce;
            }
        });
    });

    describe('rollback transaction', function() {
        beforeEach(async function() {
            transaction = await beginTransact(client);
        });

        it('should call ROLLBACK query on client', async function() {
            await transaction.rollback();

            expect(client.query).calledWithExactly('ROLLBACK');
        });

        it('should release client even if an error happens', async function() {
            client.query.onCall(1).rejects(new Error('Fake Error'));

            try {
                await transaction.rollback();
                throw new Error('should not get here')
            } catch (e) {
                expect(e).to.be.instanceOf(Error);
                expect(e.message).to.equal('Fake Error');
                expect(client.release).calledOnce;
            }
        });
    });
});