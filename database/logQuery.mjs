export function logQuery(query, logger, args) {
    let q = query;
    for (let i = 0; i < args?.length; i++) {
        let arg = args[i];
        if (typeof arg === 'string') {
            arg = `'${arg}'`;
        }
        q = q.replaceAll(`$${i + 1}`, arg);
    }
    logger.debug(q);
}