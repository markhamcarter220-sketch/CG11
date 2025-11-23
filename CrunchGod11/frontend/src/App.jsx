import { americanToDecimal, impliedProbability, decimalToAmerican } from './utils/evHelpers';
import { formatDateTime } from './utils/format';
// App.jsx
import { apiGet } from './apiClient';
import React, { useState, useEffect } from "react";
import "./App.css";
import FiltersPanel from "./components/FiltersPanel";
import ParlayBuilderPanel from "./components/ParlayBuilderPanel";
import ResultsList from "./components/ResultsList";


// =========================
// CONFIG
// =========================
// Backend base URL – the React app only talks to our backend, which in turn
// calls The Odds API. Configure this via VITE_BACKEND_URL when deploying.
const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";

// Common market keys used throughout the scanning functions. Defining this once
// prevents re‑creating identical arrays on every scan and keeps the code
// intention clear. These are the core market types that work across all
// sports on The Odds API.
const COMMON_MARKETS = ["h2h", "spreads", "totals"];

const SPORTS = [
  { group: "🏈 Pro Football", value: "americanfootball_nfl", label: "NFL" },
  { group: "🏈 Pro Football", value: "americanfootball_cfl", label: "CFL" },
  { group: "🎓 College Football", value: "americanfootball_ncaaf", label: "NCAAF" },

  { group: "🏀 Pro Basketball", value: "basketball_nba", label: "NBA" },
  { group: "🏀 Pro Basketball", value: "basketball_wnba", label: "WNBA" },
  { group: "🎓 College Basketball", value: "basketball_ncaab", label: "NCAAB" },

  { group: "⚾ Baseball", value: "baseball_mlb", label: "MLB" },

  { group: "🏒 Hockey", value: "icehockey_nhl", label: "NHL" },

  { group: "⚽ Soccer", value: "soccer_usa_mls", label: "MLS" },
  { group: "⚽ Soccer", value: "soccer_epl", label: "EPL" },
  {
    group: "⚽ Soccer",
    value: "soccer_uefa_champs_league",
    label: "UEFA Champions League",
  },
  { group: "⚽ Soccer", value: "soccer_spain_la_liga", label: "La Liga" },
  { group: "⚽ Soccer", value: "soccer_italy_serie_a", label: "Serie A" },
  { group: "⚽ Soccer", value: "soccer_france_ligue_one", label: "Ligue 1" },
  {
    group: "⚽ Soccer",
    value: "soccer_germany_bundesliga",
    label: "Bundesliga",
  },

  { group: "🥊 Combat", value: "mma_mixed_martial_arts", label: "MMA" },
  { group: "🥊 Combat", value: "mma_ufc", label: "UFC" },

  { group: "🎾 Tennis", value: "tennis_atp", label: "ATP" },
  { group: "🎾 Tennis", value: "tennis_wta", label: "WTA" },
];

// =========================
// HELPER FUNCTIONS
// =========================

function formatAmerican(odds) {
  if (odds === null || odds === undefined) return "-";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatOddsWithUnit(americanOdds, format) {
  if (americanOdds === null || americanOdds === undefined) return "-";
  if (format === "decimal") {
    const dec = americanToDecimal(americanOdds);
    if (!isFinite(dec) || dec <= 1) return "-";
    return dec.toFixed(2);
  }
  return formatAmerican(americanOdds);
}


function classifyMarketKey(key) {
  // Use the common markets array defined above to determine if a market
  // is considered "main". Anything else is treated as a prop market.
  return COMMON_MARKETS.includes(key) ? "main" : "props";
}

/**
 * Devig fair probability using best odds across books for a given market.
 * - Collect all outcomes (for same line/point where applicable)
 * - Convert best odds -> implied probability
 * - Normalize so probabilities sum to 1 (remove vig)
 */
function computeFairProbability(
  game,
  marketKey,
  outcomeName,
  outcomePoint,
  fallbackOdds
) {
  if (!game.bookmakers) return impliedProbability(fallbackOdds);

  const marketOutcomes = {};

  game.bookmakers.forEach((bm) => {
    (bm.markets || []).forEach((mkt) => {
      if (mkt.key !== marketKey) return;
      (mkt.outcomes || []).forEach((o) => {
        const samePoint =
          outcomePoint == null ||
          typeof o.point !== "number" ||
          Math.abs(o.point - (outcomePoint || 0)) < 0.01;

        if (typeof o.price === "number" && samePoint) {
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

  // Cap at more reasonable bounds to avoid extreme odds displays
  // Changed from 0.9999 to 0.95 max to prevent -999900 fair odds bug
  return Math.max(0.05, Math.min(0.95, p));
}

// Arbitrage calculator (H2H / 1X2)
function buildArbResults(games, selectedBookKeys, minRoi) {
  const results = [];

  games.forEach((game) => {
    const matchLabel = `${game.home_team} vs ${game.away_team}`;
    const timeLabel = formatDateTime(game.commence_time);
    const league = game.sport_title || "";

    const marketsByKey = {};
    (game.bookmakers || []).forEach((bm) => {
      if (selectedBookKeys.length && !selectedBookKeys.includes(bm.key)) return;
      (bm.markets || []).forEach((mkt) => {
        if (mkt.key !== "h2h") return;
        if (!marketsByKey[mkt.key]) marketsByKey[mkt.key] = [];
        marketsByKey[mkt.key].push({ bm, mkt });
      });
    });

    Object.values(marketsByKey).forEach((entries) => {
      const bestByOutcome = {};

      entries.forEach(({ bm, mkt }) => {
        (mkt.outcomes || []).forEach((o) => {
          if (typeof o.price !== "number") return;
          const key = o.name;
          const existing = bestByOutcome[key];
          if (!existing || o.price > existing.bestOdds) {
            bestByOutcome[key] = {
              outcomeName: o.name,
              bestOdds: o.price,
              bookKey: bm.key,
              bookName: bm.title,
            };
          }
        });
      });

      const outcomes = Object.values(bestByOutcome);
      if (outcomes.length < 2) return; // need at least 2 outcomes (2-way or 3-way)

      const invs = outcomes.map((o) => 1 / americanToDecimal(o.bestOdds));
      const sumInv = invs.reduce((a, b) => a + b, 0);
      const roi = (1 / sumInv - 1) * 100;

      if (roi <= 0 || roi < minRoi) return;

      const baseStake = 100;
      const stakes = outcomes.map((o, idx) => {
        const share = invs[idx] / sumInv;
        return {
          ...o,
          sharePercent: share * 100,
          stake: baseStake * share,
        };
      });

      results.push({
        id: `${game.id || game.commence_time}-arb-${timeLabel}-${matchLabel}`,
        match: matchLabel,
        time: timeLabel,
        league,
        roi,
        stakes,
      });
    });
  });

  results.sort((a, b) => b.roi - a.roi);
  return results;
}

// Parlay EV from legs using book odds + fair probabilities
function computeParlayFromLegs(legs, stake) {
  let bookDec = 1;
  let fairProbProduct = 1;

  legs.forEach((leg) => {
    const legDec = americanToDecimal(leg.odds);
    bookDec *= legDec;
    fairProbProduct *= leg.fairProb;
  });

  const payout = bookDec * stake;
  const profit = payout - stake;
  const evPercent = bookDec * fairProbProduct - 1;
  const evPct = evPercent * 100;

  return {
    bookDec,
    fairProbProduct,
    payout,
    profit,
    ev: evPct,
  };
}

// =========================
// MAIN APP
// =========================

function App() {
  // "ev" | "arb" | "bonus"
  const [mode, setMode] = useState("ev");

  const [sport, setSport] = useState("americanfootball_nfl");
  const [marketType, setMarketType] = useState("all");
  const [book, setBook] = useState("");
  const [minEdge, setMinEdge] = useState("0"); // minimum edge / ROI
  const [stake, setStake] = useState("10");
  const [oddsFormat, setOddsFormat] = useState("american"); // "american" | "decimal"

  const [scanStatus, setScanStatus] = useState(
    'Tap "Scan" to pull live odds and surface value.'
  );
  const [loading, setLoading] = useState(false);

  const [evResults, setEvResults] = useState([]);
  const [arbResults, setArbResults] = useState([]);

  const [evLoading, setEvLoading] = useState(false);
  const [evError, setEvError] = useState(null);
  const [evNoResults, setEvNoResults] = useState(false);
  const [parlayLegs, setParlayLegs] = useState([]);
  const [parlayMessage, setParlayMessage] = useState("");
  const [parlayStats, setParlayStats] = useState(null);

  const [lastPriceMap, setLastPriceMap] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(30);

  // Bonus Bets State
  const [bonusBets, setBonusBets] = useState([]);
  const [bonusBetType, setBonusBetType] = useState("risk-free");
  const [bonusAmount, setBonusAmount] = useState("100");
  const [bonusOddsMin, setBonusOddsMin] = useState("-200");

    // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (mode === "bonus") {
        scanBonusBets();
      } else {
        scanEV(true);
      }
    }, refreshSeconds * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshSeconds, mode]);

  const scanEV = async (fromAuto = false) => {
    if (!fromAuto) {
      setEvLoading(true);
    }

    setEvError(null);
    setEvNoResults(false);
    if (!fromAuto) {
      setEvResults([]);
      setArbResults([]);
      setParlayStats(null);
      setParlayMessage("");
    }

    const minEdgeNum = parseFloat(minEdge) || 0;

    const markets = COMMON_MARKETS;
    const params = new URLSearchParams({
      sport,
      markets: markets.join(","),
      regions: "us",
      oddsFormat: "american",
      marketType,
      book,
      minEdge: String(minEdgeNum),
    });

    try {
      const payload = await apiGet(`/api/ev-full?${params.toString()}`);

      const evRows = Array.isArray(payload.ev) ? payload.ev : [];
      const arbRows = Array.isArray(payload.arbs) ? payload.arbs : [];

      setEvResults(evRows);
      setArbResults(arbRows);

      if (evRows.length === 0) {
        setEvNoResults(true);
      }
    } catch (err) {
      console.error("EV scan error:", err);
      setEvError(
        err.message ||
          "Something went wrong while scanning. Please try again or adjust your filters."
      );
    } finally {
      if (!fromAuto) {
        setEvLoading(false);
      }
    }
  };

    // Parlay handlers
  const toggleLeg = (leg) => {
    setParlayStats(null);
    setParlayMessage("");
    setParlayLegs((prev) => {
      const exists = prev.find((l) => l.id === leg.id);
      if (exists) {
        return prev.filter((l) => l.id !== leg.id);
      }
      if (prev.length >= 10) {
        setParlayMessage("Parlay supports up to 10 legs in this version.");
        return prev;
      }
      return [...prev, leg];
    });
  };

  const clearParlay = () => {
    setParlayLegs([]);
    setParlayStats(null);
    setParlayMessage("");
  };

  const removeParlayIndex = (index) => {
    setParlayStats(null);
    setParlayMessage("");
    setParlayLegs((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateParlay = () => {
    const stakeNum = parseFloat(stake) || 0;
    if (parlayLegs.length < 2) {
      setParlayMessage("Add at least 2 legs to build a parlay.");
      setParlayStats(null);
      return;
    }
    if (stakeNum <= 0) {
      setParlayMessage("Enter a positive stake amount.");
      setParlayStats(null);
      return;
    }

    const stats = computeParlayFromLegs(parlayLegs, stakeNum);
    setParlayStats(stats);
    setParlayMessage("");
  };

  // Bonus Bets Scanner
  const scanBonusBets = async () => {
    setLoading(true);
    setScanStatus("Scanning for bonus bet opportunities...");
    setBonusBets([]);

    const minOddsNum = parseFloat(bonusOddsMin) || -200;
    const bonusAmountNum = parseFloat(bonusAmount) || 100;

    const markets = COMMON_MARKETS;
    const params = new URLSearchParams({
      sport,
      markets: markets.join(","),
      regions: "us",
      oddsFormat: "american",
    });
    const path = `/api/odds?${params.toString()}`;

    try {
      const data = await apiGet(path);
      const newBonusBets = [];

      data.forEach((game) => {
        const matchLabel = `${game.home_team} vs ${game.away_team}`;
        const timeLabel = formatDateTime(game.commence_time);

        (game.bookmakers || []).forEach((bm) => {
          if (book && bm.key !== book) return;

          (bm.markets || []).forEach((mkt) => {
            const bucket = classifyMarketKey(mkt.key);
            if (marketType !== "all" && bucket !== marketType) return;

            const marketLabel = mkt.key.replace(/_/g, " ");

            (mkt.outcomes || []).forEach((o) => {
              const price = o.price;
              if (typeof price !== "number") return;
              
              // For bonus bets, we want odds better than minimum
              if (price < minOddsNum) return;

              const userDec = americanToDecimal(price);
              const fairProb = computeFairProbability(
                game,
                mkt.key,
                o.name,
                o.point,
                price
              );

              // Skip extreme probabilities
              if (fairProb >= 0.95 || fairProb <= 0.05) return;

              const fairDec = 1 / fairProb;
              const edgePercent = (userDec / fairDec - 1) * 100;

              // Calculate bonus bet value based on type
              let expectedValue = 0;
              let strategy = "";

              if (bonusBetType === "risk-free") {
                // Risk-free bet: EV = (Prob × Payout) + ((1-Prob) × BonusAmount)
                const payout = userDec * bonusAmountNum;
                const profit = payout - bonusAmountNum;
                expectedValue = (fairProb * profit) + ((1 - fairProb) * bonusAmountNum * 0.7); // 70% conversion rate
                strategy = "Use full bonus on this bet. If it loses, convert the free bet at ~70% value.";
              } else if (bonusBetType === "deposit-match") {
                // Deposit match: Standard EV with matched stake
                expectedValue = (edgePercent / 100) * bonusAmountNum * 2; // 2x because of match
                strategy = "Deposit match doubles your effective edge. Use matched funds on this bet.";
              } else if (bonusBetType === "odds-boost") {
                // Odds boost: Calculate boosted odds value
                const boostPercent = 0.20; // Assume 20% boost
                const boostedOdds = price > 0 ? price * 1.2 : price * 0.8;
                const boostedDec = americanToDecimal(boostedOdds);
                const boostedEdge = (boostedDec / fairDec - 1) * 100;
                expectedValue = (boostedEdge / 100) * bonusAmountNum;
                strategy = "With 20% odds boost, this becomes a strong value play.";
              } else if (bonusBetType === "profit-boost") {
                // Profit boost: 50% extra profit on wins
                const baseProfit = (userDec - 1) * bonusAmountNum;
                const boostedProfit = baseProfit * 1.5;
                expectedValue = fairProb * boostedProfit - (1 - fairProb) * bonusAmountNum;
                strategy = "50% profit boost significantly increases value on positive odds.";
              }

              // Only show bets with positive expected value for bonus
              if (expectedValue <= 0) return;

              const id =
                (game.id || game.commence_time) +
                "-bonus-" +
                bm.key +
                "-" +
                mkt.key +
                "-" +
                o.name +
                (o.point != null ? `-${o.point}` : "");

              newBonusBets.push({
                id,
                match: matchLabel,
                time: timeLabel,
                league: game.sport_title || sport,
                bookKey: bm.key,
                bookName: bm.title,
                marketKey: mkt.key,
                marketLabel,
                outcomeName: o.name,
                point: o.point,
                odds: price,
                fairProb,
                edgePercent,
                expectedValue: expectedValue.toFixed(2),
                strategy,
                bonusType: bonusBetType,
              });
            });
          });
        });
      });

      newBonusBets.sort((a, b) => b.expectedValue - a.expectedValue);
      setBonusBets(newBonusBets);

      setScanStatus(
        newBonusBets.length
          ? `Found ${newBonusBets.length} bonus bet opportunities. Top picks optimized for ${bonusBetType} promos.`
          : "No bonus bet opportunities found with current filters."
      );
    } catch (err) {
      console.error("Bonus scan error:", err);
      setScanStatus(
        "Error scanning bonus bets: " + (err.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  const renderLineMoveArrow = (lineMove) => {
    if (!lineMove || isNaN(lineMove) || lineMove === 0) return null;
    const up = lineMove > 0;
    const magnitude = Math.min(1.8, 1 + Math.abs(lineMove) / 50);
    const symbol = up ? "▲" : "▼";
    const color = up ? "#4ade80" : "#f97373";

    return (
      <span
        style={{
          marginLeft: 6,
          color,
          fontSize: `${12 * magnitude}px`,
          verticalAlign: "middle",
        }}
      >
        {symbol}
      </span>
    );
  };

  // Build results list
    return (
    <div className="page">
      {/* HERO */}
      <section className="hero">
        <img src="/better-bets-logo.png" alt="Better Bets Logo" className="logo" style={{ maxWidth: "400px", marginBottom: "20px" }} />
        <div className="hero-actions">
          <span className="hero-note">
            Built on The Odds API. Fair odds estimated by devigging the market.
            This is a tool, not betting advice.
          </span>
        </div>
      </section>

      {/* MAIN LAYOUT */}
      <section className="layout">
        {/* LEFT: RESULTS */}
        <div className="panel">
          <ResultsList
            mode={mode}
            oddsFormat={oddsFormat}
            evResults={evResults}
            arbResults={arbResults}
            bonusBets={bonusBets}
            parlayLegs={parlayLegs}
            toggleLeg={toggleLeg}
            formatOddsWithUnit={formatOddsWithUnit}
            renderLineMoveArrow={renderLineMoveArrow}
            evLoading={evLoading}
            evError={evError}
            evNoResults={evNoResults}
            loading={loading}
          />

          <div className="footer-note">
            Better Bets helps you find pricing edges. Always gamble
            responsibly. This is not financial or betting advice.
          </div>
        </div>

        {/* RIGHT: FILTERS + PARLAY */}
        <div className="panel">
          <FiltersPanel
            mode={mode}
            setMode={setMode}
            oddsFormat={oddsFormat}
            setOddsFormat={setOddsFormat}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            refreshSeconds={refreshSeconds}
            setRefreshSeconds={setRefreshSeconds}
            sport={sport}
            setSport={setSport}
            marketType={marketType}
            setMarketType={setMarketType}
            book={book}
            setBook={setBook}
            minEdge={minEdge}
            setMinEdge={setMinEdge}
            bonusBetType={bonusBetType}
            setBonusBetType={setBonusBetType}
            bonusAmount={bonusAmount}
            setBonusAmount={setBonusAmount}
            bonusOddsMin={bonusOddsMin}
            setBonusOddsMin={setBonusOddsMin}
            loading={loading}
            onScanClick={() =>
              mode === "bonus" ? scanBonusBets() : scanEV(false)
            }
            SPORTS={SPORTS}
            parlayLegs={parlayLegs}
            parlayStats={parlayStats}
            parlayMessage={parlayMessage}
            stake={stake}
            setStake={setStake}
            clearParlay={clearParlay}
            removeParlayIndex={removeParlayIndex}
            calculateParlay={calculateParlay}
            formatOddsWithUnit={formatOddsWithUnit}
          />

          <ParlayBuilderPanel
            parlayLegs={parlayLegs}
            parlayStats={parlayStats}
            parlayMessage={parlayMessage}
            stake={stake}
            setStake={setStake}
            clearParlay={clearParlay}
            removeParlayIndex={removeParlayIndex}
            calculateParlay={calculateParlay}
            formatOddsWithUnit={formatOddsWithUnit}
            oddsFormat={oddsFormat}
          />
        </div>
      </section>
    </div>
  );
}

}

export default App;
