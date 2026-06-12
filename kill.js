const { execSync } = require('child_process');
try {
  const out = execSync('netstat -ano | findstr :3000').toString();
  const lines = out.trim().split('\n');
  for (const line of lines) {
    if (line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      console.log('Killing PID', pid);
      execSync(`taskkill /F /PID ${pid}`);
    }
  }
} catch (e) {
  console.log('No process found or already killed.', e.message);
}
