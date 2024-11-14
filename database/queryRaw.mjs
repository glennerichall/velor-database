import {logQuery} from "./logQuery.mjs";

export async function queryRaw(client, query, args, logger) {
    try {
        const res = await client.query(query, args);
        return res.rows;
    } catch (e) {
        logQuery(query, logger, args);
        throw e;
    }
}