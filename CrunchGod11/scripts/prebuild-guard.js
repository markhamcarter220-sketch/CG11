// Better Bets Prebuild Guard
// Fails the build if known-corrupt patterns are detected.

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

function exists(relPath) {
  return fs.existsSync(path.join(projectRoot, relPath));
}

function fail(msg) {
  console.error('❌ Prebuild guard failed:', msg);
  process.exit(1);
}

function checkForbiddenPaths() {
  const forbidden = [
    'frontend/src/components/ui',
    'frontend/plugins/visual-edits',
    'frontend/plugins/health-check',
    'backend/server-old.js',
    'backend/server.py'
  ];

  for (const p of forbidden) {
    if (exists(p)) {
      fail(`Forbidden path present: ${p}`);
    }
  }
}

function checkTailwindConfig() {
  const twPath = path.join(projectRoot, 'frontend', 'tailwind.config.js');
  if (!fs.existsSync(twPath)) return;
  const content = fs.readFileSync(twPath, 'utf8');

  if (content.includes('@import "tailwindcss"')) {
    fail('Tailwind v4-style import detected. Tailwind must remain v3-style config.');
  }
}

function main() {
  console.log('🔍 Running Better Bets prebuild guard...');
  checkForbiddenPaths();
  checkTailwindConfig();
  console.log('✅ Prebuild checks passed.');
}

main();
