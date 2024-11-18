import PG from 'pg';

const {Pool} = PG;

export function createConnectionPool(connectionString) {
    return new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false,
        }
    });
}

