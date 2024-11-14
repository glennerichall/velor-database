import PG from 'pg';

const {Pool} = PG;

export const createConnectionPool = (connectionString) => {
    return new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false,
        }
    });
};

