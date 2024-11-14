export async function tryInsertUnique(client, query, args) {
    while (true) {
        try {
            const res = await client.query(query, args);
            return res.rows[0];
        } catch (e) {
            if (e.code !== '23505') {
                throw e;
            }
        }
    }
}