import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import sinon from "sinon";
import {ClientProfiler} from "../database/ClientProfiler.mjs";
import {Timer} from "velor-utils/utils/Timer.mjs";
import {databaseManagerPolicy} from "../database/DatabaseManager.mjs";
import {isTrue} from "velor-utils/utils/predicates.mjs";
import {createConnectionPool as createConnectionPoolFct} from "../database/impl/postgres.mjs";
import {beginTransact as beginTransactFct} from "../database/beginTransact.mjs";
import {bindStatements as bindStatementsFct} from "../database/bindStatements.mjs";
import {queryRaw as queryRawFct} from "../database/queryRaw.mjs";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe('DatabaseManager', function () {
    let DatabaseManager;
    let dbManager;
    let logQueries, createConnectionPool, beginTransact,
        bindStatements, queryRaw, getLogger;

    beforeEach(function () {
        logQueries = false;
        createConnectionPool = sinon.stub();
        beginTransact = sinon.stub();
        bindStatements = sinon.stub();
        queryRaw = sinon.stub();
        DatabaseManager = databaseManagerPolicy({
            logQueries, createConnectionPool, beginTransact,
            bindStatements, queryRaw, getLogger
        });
        dbManager = new DatabaseManager("schema", "connectionString");
    });

    it('constructor should initialize expected properties', function () {
        expect(dbManager).to.have.property('schema').to.equal("schema");
        expect(dbManager).to.have.property('#acquiredCount').to.equal(0);
    });
});

