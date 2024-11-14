import {ClientProfiler} from "./ClientProfiler.mjs";
import {logQuery} from "./logQuery.mjs";

export class ClientLogger extends ClientProfiler {
    constructor(client, logger) {
        super(client);
        this._client = client;
        this._logger = logger;
    }

    query(query, args) {
        logQuery(query, this._logger, args);
        return super.query(query, args);
    }

    release() {
        return this._client.release()
    }
}