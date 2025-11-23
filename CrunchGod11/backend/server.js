const express = require('express');
const cors = require('cors');
const { config } = require('./config');


const app = express();
const PORT = config.port;

// Move the Odds API key to the backend so it is not exposed in the frontend bundle.
// You can override this via the ODDS_API_KEY environment variable in production.
const ODDS_API_KEY = config.oddsApiKey;

if (!ODDS_API_KEY) {
  console.error('[BetterBets] ODDS_API_KEY is required');
  process.exit(1);
}

// Simple in-memory cache for odds responses.
// Keyed by sport+markets+regions+oddsFormat with a short TTL to reduce
// upstream API calls and rate limit pressure while keeping data fresh.
const oddsCache = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds; tune as needed.


const ALLOWED_SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'baseball_mlb',
  'icehockey_nhl',
  'soccer_epl',
];

function sanitizeSport(raw) {
  if (!raw) return null;
  if (ALLOWED_SPORTS.includes(raw)) return raw;
  return null;
}

function parseNumber(value, { min, max, defaultValue }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultValue;
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

function getCacheKey({ sport, markets, regions, oddsFormat }) {
  return [sport, markets, regions, oddsFormat].join('|');
}

// Helper: fetch odds from The Odds API with caching
async function fetchOddsFromApi({ sport, markets = 'h2h,spreads,totals', regions = 'us', oddsFormat = 'american' }) {
  if (!sport) {
    throw new Error('Missing required param: sport');
  }

  const cacheKey = getCacheKey({ sport, markets, regions, oddsFormat });
  const now = Date.now();
  const cached = oddsCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set('apiKey', ODDS_API_KEY);
  url.searchParams.set('markets', markets);
  url.searchParams.set('regions', regions);
  url.searchParams.set('oddsFormat', oddsFormat);

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const err = new Error(`Odds API error ${response.status}`);
    err.details = text;
    throw err;
  }

  const data = await response.json();
  oddsCache.set(cacheKey, { data, timestamp: now });
  return data;
}

// Odds / probability helpers
function americanToDecimal(odds) {
  if (odds > 0) return 1 + odds / 100;
  return 1 - 100 / odds;
}

function impliedProbability(odds) {
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

function decimalToAmerican(dec) {
  if (!isFinite(dec) || dec <= 1) return 0;
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
}

function formatDateTime(isoStr) {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// Main markets used throughout. Props can be added later.
const COMMON_MARKETS = ['h2h', 'spreads', 'totals'];

function classifyMarketKey(key) {
  // Use the common markets array to determine if a market is considered "main".
  // Anything else is treated as a prop market.
  return COMMON_MARKETS.includes(key) ? 'main' : 'props';
}

/**
 * Devig fair probability using best odds across books for a given market.
 * This is a port of the frontend computeFairProbability logic so that EV
 * can be computed on the server.
 */
function computeFairProbability(game, marketKey, outcomeName, outcomePoint, fallbackOdds) {
  if (!game.bookmakers) return impliedProbability(fallbackOdds);

  const marketOutcomes = {};

  game.bookmakers.forEach((bm) => {
    (bm.markets || []).forEach((mkt) => {
      if (mkt.key !== marketKey) return;
      (mkt.outcomes || []).forEach((o) => {
        const samePoint =
          outcomePoint == null ||
          typeof o.point !== 'number' ||
          Math.abs(o.point - (outcomePoint || 0)) < 0.01;

        if (samePoint && typeof o.price === 'number') {
          if (!marketOutcomes[o.name]) {
            marketOutcomes[o.name] = [];
          }
          marketOutcomes[o.name].push(o.price);
        }
      });
    });
  });

  // No usable market data – fall back to book price
  if (Object.keys(marketOutcomes).length === 0) {
    return impliedProbability(fallbackOdds);
  }

  const bestOdds = {};
  Object.keys(marketOutcomes).forEach((name) => {
    bestOdds[name] = Math.max(...marketOutcomes[name]);
  });

  const impliedProbs = {};
  Object.keys(bestOdds).forEach((name) => {
    impliedProbs[name] = impliedProbability(bestOdds[name]);
  });

  const totalImplied = Object.values(impliedProbs).reduce((a, b) => a + b, 0);

  if (!isFinite(totalImplied) || totalImplied <= 0) {
    return impliedProbability(fallbackOdds);
  }

  const fairProbs = {};
  Object.keys(impliedProbs).forEach((name) => {
    fairProbs[name] = impliedProbs[name] / totalImplied;
  });

  let p = fairProbs[outcomeName];
  if (!p || !isFinite(p)) {
    p = impliedProbability(fallbackOdds);
  }

  // Cap at more reasonable bounds to avoid extreme fair probabilities
  return Math.max(0.05, Math.min(0.95, p));
}

const allowedOrigins = (config.corsOrigins && config.corsOrigins.length) ? config.corsOrigins : ['http://localhost:4000'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());


const API_KEY = config.betterBetsApiKey;


function requireApiKey(req, res, next) {
  if (req.path === '/' || req.path.startsWith('/assets') || req.path.startsWith('/favicon')) {
    return next();
  }

  if (!API_KEY) {
    if (config.nodeEnv === 'production') {
      console.error('[BetterBets] BETTERBETS_API_KEY is required in production');
      return res.status(500).json({ error: 'server misconfiguration' });
    }
    console.warn('[BetterBets] BETTERBETS_API_KEY is not set; auth is disabled in development');
    return next();
  }

  const provided = req.header('x-betterbets-key');
  if (!provided || provided !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  next();
}
app.use('/api', requireApiKey);

// Basic health check to ensure backend is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Raw odds endpoint – exposes full odds payload for tools that still need it

app.get('/api/odds', async (req, res) => {
  try {
    const {
      sport,
      markets = 'h2h,spreads,totals',
      regions = 'us',
      oddsFormat = 'american',
    } = req.query;

    const safeSport = sanitizeSport(sport);
    if (!safeSport) {
      return res.status(400).json({ error: 'Invalid or missing sport' });
    }

    const safeMarkets = markets || 'h2h,spreads,totals';
    const safeRegions = regions || 'us';
    const safeFormat =
      oddsFormat === 'american' || oddsFormat === 'decimal' ? oddsFormat : 'american';

    const data = await fetchOddsFromApi({
      sport: safeSport,
      markets: safeMarkets,
      regions: safeRegions,
      oddsFormat: safeFormat,
    });

    res.json(data);
  } catch (err) {
    console.error('[BB]', '[BetterBets Backend Error] in /api/odds:', err);
    const status =
      err && err.message && err.message.includes('Odds API error')
        ? 502
        : 500;
    res
      .status(status)
      .json({
        error: err.message || 'Internal server error',
        details: err.details || null,
      });
  }
});

// Basic EV endpoint: server-side EV for main markets (no arbs/bonus yet)
async function handleEvFull(req, res) {
  
    try {
      const {
        sport,
        markets = 'h2h,spreads,totals',
        regions = 'us',
        oddsFormat = 'american',
        marketType = 'all',
        book = '',
        minEdge = '0',
      } = req.query;
  
  const safeSport = sanitizeSport(sport);
  if (!safeSport) {
    return res.status(400).json({ error: 'Invalid or missing sport' });
  }
  
  
  
      // removed redundant missing-sport check (handled by sanitizeSport)
  
          const minEdgeNum = parseNumber(minEdge, { min: -10, max: 100, defaultValue: 0 });
          const games = await fetchOddsFromApi({ sport: safeSport, markets, regions, oddsFormat });
  
      const results = [];
  
      games.forEach((game) => {
        const matchLabel = `${game.home_team} vs ${game.away_team}`;
        const timeLabel = formatDateTime(game.commence_time);
        const league = game.sport_title || sport;
  
        (game.bookmakers || []).forEach((bm) => {
          if (book && bm.key !== book) return;
  
          (bm.markets || []).forEach((mkt) => {
            const bucket = classifyMarketKey(mkt.key);
            if (marketType !== 'all' && bucket !== marketType) return;
  
            const marketLabel = (mkt.key || '').replace(/_/g, ' ');
  
            (mkt.outcomes || []).forEach((o) => {
              const price = o.price;
              if (typeof price !== 'number') return;
  
              const userDec = americanToDecimal(price);
              const fairProb = computeFairProbability(
                game,
                mkt.key,
                o.name,
                o.point,
                price
              );
  
              // Skip bets with extreme fair probabilities (capped values)
              if (fairProb >= 0.95 || fairProb <= 0.05) {
                return;
              }
  
              const fairDec = 1 / fairProb;
              const fairAm = decimalToAmerican(fairDec);
  
              // Edge vs fair: userDec / fairDec - 1
              const edgePercent = (userDec / fairDec - 1) * 100;
  
              // Filter unreasonable or low edges
              if (edgePercent < minEdgeNum || Math.abs(edgePercent) > 80) {
                return;
              }
  
              const id =
                (game.id || game.commence_time) +
                '-' +
                bm.key +
                '-' +
                mkt.key +
                '-' +
                o.name +
                (o.point != null ? `-${o.point}` : '');
  
              results.push({
                id,
                match: matchLabel,
                time: timeLabel,
                league,
                bookKey: bm.key,
                bookName: bm.title,
                marketKey: mkt.key,
                marketLabel,
                bucket,
                outcomeName: o.name,
                point: o.point,
                odds: price,
                userDec,
                fairProb,
                fairDec,
                fairAm,
                evPercent: edgePercent,
                lineMove: 0,
              });
            });
          });
        });
      });
  
      results.sort((a, b) => b.evPercent - a.evPercent);
      const arbs = buildArbs(games);
      res.json({ ev: results, arbs });
    } catch (e) {
      console.error('[BB]', '[BetterBets Backend Error] in /api/ev-full:', e);
      res.status(500).json({ error: 'internal' });
    }

}

app.get('/api/ev-full', handleEvFull);
app.get('/api/scan', handleEvFull);



    // Build arbitrage results (basic: H2H only)
    function buildArbs(games){
      const results=[];
      function amToDec(o){
        return o>0?1+o/100:1-100/o;
      }
      games.forEach(g=>{
        const match=`${g.home_team} vs ${g.away_team}`;
        const time=g.commence_time;
        const crosses={};
        (g.bookmakers||[]).forEach(bm=>{
          (bm.markets||[]).forEach(m=>{
            if(m.key!=='h2h')return;
            (m.outcomes||[]).forEach(o=>{
              if(typeof o.price!=='number')return;
              if(!crosses[o.name])crosses[o.name]=[];
              crosses[o.name].push({odd:o.price,book:bm.key});
            });
          });
        });
        const best=[];
        Object.keys(crosses).forEach(name=>{
          const arr=crosses[name];
          if(arr.length){
            const top=arr.reduce((a,b)=>b.odd>a.odd?b:a,arr[0]);
            best.push({name,odd:top.odd,book:top.book});
          }
        });
        if(best.length<2)return;
        const invs=best.map(b=>1/amToDec(b.odd));
        const sumInv=invs.reduce((a,b)=>a+b,0);
        const roi=(1/sumInv-1)*100;
        if(roi<=0)return;
        results.push({match,time,roi,legs:best});
      });
      results.sort((a,b)=>b.roi-a.roi);
      return results;
    }

const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});


app.listen(PORT, () => {
  console.log(`Better Bets backend running on port ${PORT}`);
});