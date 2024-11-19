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

export async function createDatabase(client, database) {
    const sqlFindDatabase = 'SELECT 1 FROM pg_database WHERE datname = $1';
    const sqlCreateDatabase = `CREATE DATABASE ${database}`;
    const res = await client.query(sqlFindDatabase, [database]);
    if (res.rowCount === 0) {
        await client.query(sqlCreateDatabase);
    }
}

