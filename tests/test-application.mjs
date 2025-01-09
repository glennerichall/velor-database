import {setupTestContext} from "velor-utils/test/setupTestContext.mjs";
import {
    areSame,
    createAppServicesInstance,
    isInstanceOf,
    isServiceAware
} from "velor-services/injection/ServicesContext.mjs";
import {mergeDefaultDatabaseOptions} from "../application/services/mergeDefaultDatabaseOptions.mjs";
import {
    getDatabase,
    getPoolManager
} from "../application/services/services.mjs";
import {PoolManager} from "../database/PoolManager.mjs";
import {s_databaseStatements} from "../application/services/serviceKeys.mjs";

const {
    expect,
    test,
    describe,
    afterEach,
    beforeEach,
    it,
} = setupTestContext();

describe('application', () => {

    it('should create services', async () => {
        let services = createAppServicesInstance(
            mergeDefaultDatabaseOptions()
        );

        expect(services).to.not.be.undefined;
        expect(isServiceAware(services)).to.be.true;
    })

    it('should get pool manager', async () => {
        let services = createAppServicesInstance(
            mergeDefaultDatabaseOptions()
        );

        let poolManager = getPoolManager(services);

        expect(poolManager).to.not.be.undefined;
        expect(isInstanceOf(poolManager, PoolManager)).to.be.true;

        // should be a singleton
        expect(areSame(poolManager, getPoolManager(services))).to.be.true;
    })

    it('should get database', async () => {
        let services = createAppServicesInstance(
            mergeDefaultDatabaseOptions(
                {
                    factories: {
                        [s_databaseStatements]: () => {
                            return {};
                        },
                    }
                }
            )
        );

        let database = getDatabase(services);

        expect(database).to.not.be.undefined;

        // should be a singleton
        expect(areSame(database,getDatabase(services))).to.be.true;
    })
})