export function bindStatementAutoRelease(statement, schema, clientProvider) {
    return async (...args) => {
        let client = await clientProvider();
        try {
            return statement(client, schema, ...args);
        } finally {
            client.release();
        }
    }
}

export function bindStatement(statement, schema, client) {
    return (...args) => statement(client, schema, ...args);
}

export function bindStatements(statements, schema, clientOrProvider) {

    let bind = typeof clientOrProvider === 'function' ?
        bindStatementAutoRelease :
        bindStatement;

    let result = {};
    for (let group in statements) {
        result[group] = {};
        for (let statement in statements[group]) {
            result[group][statement] = bind(statements[group][statement], schema, clientOrProvider);
        }
    }

    return result;
}