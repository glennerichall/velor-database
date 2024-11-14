export async function beginTransact(client) {
    // start a new transaction with the current client
    try {
        await client.query('BEGIN');
    } catch (e) {
        client.release();
        throw e;
    }

    // the calling code has the responsibility to end the transaction
    // once done, the client is auto-released.
    return {
        commit: async () => {
            try {
                return client.query('COMMIT');
            } finally {
                client.release();
            }
        },
        rollback: async () => {
            try {
                return client.query('ROLLBACK');
            } finally {
                client.release();
            }
        }
    };
}