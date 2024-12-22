import {retry} from "velor-utils/utils/functional.mjs";
import {ClientProxy} from "./ClientProxy.mjs";
import {getLogger} from "velor-services/application/services/services.mjs";

export class ClientRetry extends ClientProxy {

    constructor(client) {
        super(client);
    }

    async _query(target, query, args) {
        return retry(() => target.query(query, args), {
            retry: (err, i) => {
                let isDeadLock = err.code === '40P01';
                if (isDeadLock) {
                    if (i < 3) {
                        getLogger(this).warn("Deadlock detected, retrying request");
                    } else {
                        getLogger(this).error("Deadlock detected");
                    }
                }
                return (isDeadLock) && i < 3;
            }
        });
    }
}