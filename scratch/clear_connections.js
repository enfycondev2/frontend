const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://enfysync:StrongBackendPass123@187.77.189.225:5432/odisha-tender' });
client.connect().then(() => {
    return client.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND state = 'idle'");
}).then(() => {
    console.log('Idle connections killed');
    process.exit(0);
}).catch(e => {
    console.error('Failed to kill connections:', e.message);
    process.exit(1);
});
