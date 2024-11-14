import {retry} from "velor-utils/utils/functional.mjs";

export class ClientRetry {
    constructor(client) {
        this._client = client;
    }

    async query(query, args) {
        return retry(() => this._client.query(query, args), {
            retry: (err, i) => {
                let isDeadLock = err.code === '40P01';
                if (isDeadLock) {
                    if (i < 3) {
                        console.debug("Deadlock detected, retrying request");
                    } else {
                        console.debug("Deadlock detected");
                    }
                }
                return (isDeadLock) && i < 3;
            }
        });
    }

    release() {
        return this._client.release()
    }
}