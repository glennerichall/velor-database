import {queryToString} from "./queryToString.mjs";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";

export async function queryRaw(client, query, args, logger = noOpLogger) {
    try {
        const res = await client.query(query, args);
        return res.rows;
    } catch (e) {
        let str = queryToString(query, args);
        logger.debug(str);
        throw e;
    }
}