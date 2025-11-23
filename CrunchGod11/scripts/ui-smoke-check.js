/**
 * Simple UI smoke check for Better Bets.
 * Ensures the root HTML is served and basic text markers exist.
 *
 * Usage:
 *   node scripts/ui-smoke-check.js
 */

const http = require('http');

const BASE_URL = process.env.BETTERBETS_BASE_URL || 'http://localhost:4000';

function fetchRoot() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

(async () => {
  console.log('🔍 Running UI smoke check against', BASE_URL);
  const res = await fetchRoot();
  if (res.error) {
    console.error('❌ UI smoke check failed:', res.error);
    process.exit(1);
  }
  if (res.status !== 200) {
    console.error('❌ Root did not return 200. Status:', res.status);
    process.exit(1);
  }
  const body = res.body || '';
  const lowered = body.toLowerCase();

  // Look for generic markers that should always be present in the app shell.
  const markers = ['scan', 'edge', 'odds'];

  const missing = markers.filter(m => !lowered.includes(m));
  if (missing.length) {
    console.error('❌ UI smoke check: missing expected markers in HTML:', missing);
    process.exit(1);
  }

  console.log('✅ UI smoke check passed.');
})();
