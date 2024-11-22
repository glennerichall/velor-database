export function bindStatementAutoRelease(statement, clientProvider) {
    return async (...args) => {
        let client = await clientProvider();
        try {
            return statement(client, ...args);
        } finally {
            client.release();
        }
    }
}

export function bindStatement(statement, client) {
    return (...args) => statement(client, ...args);
}

export function bindStatements(statements, clientOrProvider) {

    let bind = typeof clientOrProvider === 'function' ?
        bindStatementAutoRelease :
        bindStatement;

    let result = {};
    for (let group in statements) {
        result[group] = {};
        for (let statement in statements[group]) {
            result[group][statement] = bind(statements[group][statement], clientOrProvider);
        }
    }

    return result;
}