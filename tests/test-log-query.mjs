import {queryToString} from "../database/queryToString.mjs";
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
        let str = queryToString('SELECT * FROM users;', undefined);
        logger.debug(str);
        expect(log).to.equal('SELECT * FROM users;');
    });

    it('should log query with args and replace placeholders', () => {
        let str = queryToString('INSERT INTO users VALUES($1, $2);', ['John', 'john@example.com']);
        logger.debug(str);
        expect(log).to.equal("INSERT INTO users VALUES('John', 'john@example.com');");
    });

    it('should log query with numeric args and replace placeholders', () => {
        let str = queryToString('INSERT INTO numbers VALUES($1, $2);', [1, 2]);
        logger.debug(str);
        expect(log).to.equal('INSERT INTO numbers VALUES(1, 2);');
    });

    it('should log query with mixed type args and replace placeholders', () => {
        let str = queryToString('INSERT INTO data VALUES($1, $2);', ['John', 1]);
        logger.debug(str);
        expect(log).to.equal("INSERT INTO data VALUES('John', 1);");
    });

    it('should properly escape string arguments', () => {
        let str = queryToString('SELECT * FROM users WHERE name=$1;', ["O'Reilly"]);
        logger.debug(str);
        expect(log).to.equal("SELECT * FROM users WHERE name='O\'Reilly';");
    });

    it('should handle multiple same placeholders', () => {
        let str = queryToString('SELECT * FROM users WHERE name=$1 AND email=$1;', ['john@example.com']);
        logger.debug(str);
        expect(log).to.equal("SELECT * FROM users WHERE name='john@example.com' AND email='john@example.com';");
    });

    it('should not replace placeholders when not enough args provided', () => {
        let str = queryToString('INSERT INTO numbers VALUES($1, $2);', [1]);
        logger.debug(str);
        expect(log).to.equal('INSERT INTO numbers VALUES(1, $2);');
    });
});