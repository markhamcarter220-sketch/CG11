const dotenv = require('dotenv');
const path = require('path');

// Load environment variables once here
// Check both backend/.env and root .env for flexibility
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

const config = {
  nodeEnv: NODE_ENV,
  port: process.env.PORT || 4000,
  oddsApiKey: process.env.ODDS_API_KEY,
  betterBetsApiKey: process.env.BETTERBETS_API_KEY || null,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:4000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

if (!config.oddsApiKey) {
  console.error('[BetterBets] ODDS_API_KEY is required');
  process.exit(1);
}

module.exports = { config };
