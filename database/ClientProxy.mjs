import {NotImplementedError} from "velor-utils/utils/errors/NotImplementedError.mjs";

const kp_client = Symbol();

export class ClientProxy {

    constructor(client) {
        this[kp_client] = client;
    }

    _query(client, query, args) {
        throw new NotImplementedError();
    }

    query(query, args) {
        return this._query(this[kp_client], query, args);
    }

    release() {
        return this[kp_client].release()
    }
}