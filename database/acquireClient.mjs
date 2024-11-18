import {retry} from "velor-utils/utils/functional.mjs";
import {ClientRetry} from "./ClientRetry.mjs";
import {ClientLogger} from "./ClientLogger.mjs";
import {ClientProfiler} from "./ClientProfiler.mjs";
import {noOpLogger} from "velor-utils/utils/noOpLogger.mjs";

export async function acquireClient(pool,
                                    {
                                        logQueries = false,
                                        logger = noOpLogger
                                    } = {}) {
    try {
        let client = await retry(() => pool.connect(), {
            retry: (error, i) => {
                let isTooManyClients = error.code === '53300';
                if (isTooManyClients) {
                    logger.debug(`Too many clients already, retrying(${i}) connection to database`);
                }
                return (isTooManyClients) && i < 3;
            }
        });
        client = new ClientRetry(client);
        if (logQueries) {
            return new ClientLogger(client, logger);
        }
        return new ClientProfiler(client);
    } catch (e) {
        logger.debug(e);
        throw e;
    }
}