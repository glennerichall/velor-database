import {NotImplementedError} from "velor-utils/utils/errors/NotImplementedError.mjs";

export class ClientProxy {
    #client;

    constructor(client) {
        this.#client = client;
    }

    _query(client, query, args) {
        throw new NotImplementedError();
    }

    query(query, args) {
        return this._query(this.#client, query, args);
    }

    release() {
        return this.#client.release()
    }
}