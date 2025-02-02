import {retry} from "velor-utils/utils/functional.mjs";
import {ClientRetry} from "./ClientRetry.mjs";
import {
    bindAroundAsyncMethod,
    bindAsyncOnThrow,
    bindBeforeMethod
} from "velor-utils/utils/proxy.mjs";
import {queryToString} from "./queryToString.mjs";
import {getPoolManager} from "../application/services/services.mjs";
import {getLogger} from "velor-services/application/services/services.mjs";
import {Timer} from "velor-utils/utils/Timer.mjs";
import {getServiceBinder} from "velor-services/injection/ServicesContext.mjs";

const kp_logQueries = Symbol();
const kp_profileQueries = Symbol();

export class ClientProvider {

    constructor({
                    logQueries = false,
                    profileQueries = true
                } = {}) {
        this[kp_logQueries] = logQueries;
        this[kp_profileQueries] = profileQueries;
    }

    set logQueries(value) {
        this[kp_logQueries] = value;
    }

    set profileQueries(value) {
        this[kp_profileQueries] = value;
    }

    async acquireClient() {
        try {
            let pool = getPoolManager(this);
            let client = await retry(() => pool.acquireClient(), {
                retry: (error, i) => {
                    let isTooManyClients = error.code === '53300';
                    if (isTooManyClients) {
                        getLogger(this).debug(`Too many clients already, retrying(${i}) connection to database`);
                    }
                    return (isTooManyClients) && i < 3;
                }
            });
            client = getServiceBinder(this)
                .createInstance(ClientRetry, client);

            if (this[kp_logQueries]) {
                bindBeforeMethod(client, 'query', ({args}) => {
                    let str = queryToString(...args);
                    getLogger(this).debug(str);
                });
            }

            if (this[kp_profileQueries]) {
                let timer;
                bindAroundAsyncMethod(client, 'query',
                    async () => {
                        timer = Timer.start();
                    },
                    async () => {
                        const span = timer.stop();
                        if (span >= 4000) {
                            getLogger(this).warn(`Database query took ${span} ms`);
                        }
                    });
            }

            bindAsyncOnThrow(client, 'query', ({error, args}) => {
                let str = queryToString(...args);
                getLogger(this).error('Error while executing query \n' + str + '\n' + error.message);
            })

            return client;
        } catch (e) {
            getLogger(this).debug(e);
            throw e;
        }
    }
}