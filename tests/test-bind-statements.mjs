import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {
    bindStatement,
    bindStatementAutoRelease,
    bindStatements
} from "../database/bindStatements.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe('statement bindings', () => {


    describe('bindStatementAutoRelease', function () {
        let clientProvider, client, statement, schema;

        beforeEach(function () {
            client = {
                release: sinon.stub()
            };
            clientProvider = sinon.stub().resolves(client);
            statement = sinon.stub().resolves('execute statement');
            schema = 'testSchema';
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should call statement with client, schema and args', async function () {
            const boundStatement = bindStatementAutoRelease(statement, clientProvider);
            const res = await boundStatement('arg1', 'arg2');
            expect(res).to.equal('execute statement');
            expect(statement).calledOnceWith(client, 'arg1', 'arg2');
            expect(client.release).calledOnce;
        });

        it('should always release the client even if error occurs', async function () {
            statement.rejects(new Error('Fake Error'));
            const boundStatement = bindStatementAutoRelease(statement, clientProvider);
            try {
                await boundStatement('arg1', 'arg2');
                throw new Error('should not get here')
            } catch (e) {
                expect(client.release).calledOnce;
                expect(e).to.be.instanceOf(Error);
                expect(e.message).to.equal('Fake Error');
            }
        });
    });

    describe('bindStatement', function () {
        let client, statement, schema;

        beforeEach(function () {
            client = {};
            statement = sinon.stub().resolves('execute statement');
            schema = 'testSchema';
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should call statement with client, schema and args', async function () {
            const boundStatement = bindStatement(statement, client);
            const res = await boundStatement('arg1', 'arg2');
            expect(res).to.equal('execute statement');
            expect(statement).calledOnceWith(client, 'arg1', 'arg2');
        });
    });

    describe('bindStatements', function () {
        let client, statement1, statement2, statement3, schema, statements;

        beforeEach(function () {
            client = {
                release(){}
            };
            statement1 = sinon.stub().resolves('execute statement1');
            statement2 = sinon.stub().resolves('execute statement2');
            statement3 = sinon.stub().resolves('execute statement3');
            schema = 'testSchema';
            statements = {
                group1: {
                    stmt1: statement1
                },
                group2: {
                    stmt2: statement2,
                    stmt3: statement3
                }
            }
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should bind statements to client when client is an object', async function () {
            const res = bindStatements(statements, client);
            expect(await res.group1.stmt1()).to.equal('execute statement1');
            expect(await res.group2.stmt2()).to.equal('execute statement2');
            expect(await res.group2.stmt3()).to.equal('execute statement3');
            expect(statement1).to.have.been.calledOnceWithExactly(client);
            expect(statement2).to.have.been.calledOnceWithExactly(client);
            expect(statement3).to.have.been.calledOnceWithExactly(client);
        });

        it('should bind statements to client when client is a function', async function () {
            const clientProvider = sinon.stub().resolves(client);
            const res = bindStatements(statements, clientProvider);
            expect(await res.group1.stmt1()).to.equal('execute statement1');
            expect(await res.group2.stmt2()).to.equal('execute statement2');
            expect(statement1).to.have.been.calledOnceWithExactly(client);
            expect(statement2).to.have.been.calledOnceWithExactly(client);
        });
    });

})