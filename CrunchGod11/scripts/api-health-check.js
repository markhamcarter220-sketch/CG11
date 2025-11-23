
/**
 * Simple API health check script for Better Bets.
 * Usage:
 *   node scripts/api-health-check.js
 *
 * Assumes backend is running on http://localhost:4000
 */

const http = require('http');

const BASE_URL = process.env.BETTERBETS_BASE_URL || 'http://localhost:4000';

function check(path) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const start = Date.now();
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const ms = Date.now() - start;
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = null;
        }
        resolve({ path: url.toString(), status: res.statusCode, ms, body: parsed });
      });
    });
    req.on('error', (err) => {
      resolve({ path: path, error: err.message });
    });
  });
}

async function run() {
  const checks = ['/api/health', '/api/odds?sport=basketball_nba', '/api/scan?sport=basketball_nba&minEdge=0'];
  console.log('Running Better Bets API health checks against', BASE_URL);
  const results = [];
  for (const p of checks) {
    // eslint-disable-next-line no-await-in-loop
    const result = await check(p);
    results.push(result);
  }
  console.log(JSON.stringify(results, null, 2));
  const failures = results.filter(r => r.status !== 200 || r.error);
  if (failures.length) {
    console.error('Some health checks failed.');
    process.exitCode = 1;
  } else {
    console.log('All health checks passed.');
  }
}

run();
