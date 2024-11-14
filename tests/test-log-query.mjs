import {logQuery} from "../database/logQuery.mjs";
import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe('logQuery function tests', () => {
    let logger, log = '';

    beforeEach(() => {
        log = '';
        logger = {
            debug: msg => log += msg,
        };
    });

    it('should log query without args', () => {
        logQuery('SELECT * FROM users;', logger, undefined);
        expect(log).to.equal('SELECT * FROM users;');
    });

    it('should log query with args and replace placeholders', () => {
        logQuery('INSERT INTO users VALUES($1, $2);', logger, ['John', 'john@example.com']);
        expect(log).to.equal("INSERT INTO users VALUES('John', 'john@example.com');");
    });

    it('should log query with numeric args and replace placeholders', () => {
        logQuery('INSERT INTO numbers VALUES($1, $2);', logger, [1, 2]);
        expect(log).to.equal('INSERT INTO numbers VALUES(1, 2);');
    });

    it('should log query with mixed type args and replace placeholders', () => {
        logQuery('INSERT INTO data VALUES($1, $2);', logger, ['John', 1]);
        expect(log).to.equal("INSERT INTO data VALUES('John', 1);");
    });

    it('should properly escape string arguments', () => {
        logQuery('SELECT * FROM users WHERE name=$1;', logger, ["O'Reilly"]);
        expect(log).to.equal("SELECT * FROM users WHERE name='O\'Reilly';");
    });

    it('should handle multiple same placeholders', () => {
        logQuery('SELECT * FROM users WHERE name=$1 AND email=$1;', logger, ['john@example.com']);
        expect(log).to.equal("SELECT * FROM users WHERE name='john@example.com' AND email='john@example.com';");
    });

    it('should not replace placeholders when not enough args provided', () => {
        logQuery('INSERT INTO numbers VALUES($1, $2);', logger, [1]);
        expect(log).to.equal('INSERT INTO numbers VALUES(1, $2);');
    });
});