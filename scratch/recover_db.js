const { Client } = require('pg');

async function tryClear() {
    console.log("Attempting to connect to PostgreSQL and clear zombie connections...");
    const client = new Client({ connectionString: 'postgresql://enfysync:StrongBackendPass123@187.77.189.225:5432/odisha-tender' });
    try {
        await client.connect();
        console.log("Connection successful! Running termination query...");
        await client.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND state = 'idle'");
        console.log("SUCCESS: All idle zombie connections have been killed.");
        process.exit(0);
    } catch (e) {
        console.error("Still waiting for a slot: ", e.message);
    } finally {
        try { await client.end(); } catch (e) {}
    }
}

setInterval(tryClear, 2000);
tryClear();
