import React from "react";

function ResultsList({
  mode,
  oddsFormat,
  evResults,
  arbResults,
  bonusBets,
  parlayLegs,
  toggleLeg,
  formatOddsWithUnit,
  renderLineMoveArrow,
  evLoading,
  evError,
  evNoResults,
  loading,
}) {
  let mainResults;

  if (mode === "ev") {
    mainResults = evResults.map((leg) => {
      const inParlay = parlayLegs.some((l) => l.id === leg.id);
      return (
        <div key={leg.id} className="result-card">
          <div className="flex-between">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{leg.match}</div>
            <div className="tag tag-ev">
              {leg.evPercent >= 0 ? "+" : ""}
              {leg.evPercent.toFixed(1)}% Edge
            </div>
          </div>
          <div
            className="small"
            style={{ color: "var(--text-muted)", marginTop: 2 }}
          >
            {leg.league || ""}
            {leg.time ? " • " + leg.time : ""}
          </div>
          <div className="pill-row">
            <span className="pill pill-strong">{leg.bookName}</span>
            <span className="pill">
              {leg.marketLabel}
              {leg.point != null ? ` (${leg.point})` : ""}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <strong>{leg.outcomeName}</strong>
          </div>
          <div className="small" style={{ marginTop: 2 }}>
            Book:{" "}
            <strong>{formatOddsWithUnit(leg.odds, oddsFormat)}</strong>
            {renderLineMoveArrow(leg.lineMove)}
            &nbsp;• Fair:{" "}
            <strong>{formatOddsWithUnit(leg.fairAm, oddsFormat)}</strong>
            &nbsp;• Edge:{" "}
            <span
              className={leg.evPercent >= 0 ? "ev-positive" : "ev-negative"}
            >
              {leg.evPercent >= 0 ? "+" : ""}
              {leg.evPercent.toFixed(1)}%
            </span>
          </div>
          <button
            className="btn-outline"
            style={{ marginTop: 6 }}
            onClick={() => toggleLeg(leg)}
          >
            {inParlay ? "Remove from Parlay" : "Add to Parlay"}
          </button>
        </div>
      );
    });
  } else if (mode === "arb") {
    mainResults = arbResults.map((arb) => {
      return (
        <div key={arb.id} className="result-card">
          <div className="flex-between">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{arb.match}</div>
            <div className="tag tag-ev">{arb.roi.toFixed(2)}% Arb ROI</div>
          </div>
          <div
            className="small"
            style={{ color: "var(--text-muted)", marginTop: 2 }}
          >
            {arb.league || ""}
            {arb.time ? " • " + arb.time : ""}
          </div>
          <div className="small" style={{ marginTop: 4 }}>
            Stake split for $100 total:
          </div>
          <ul className="small" style={{ marginTop: 4, paddingLeft: 18 }}>
            {arb.stakes.map((s, idx) => (
              <li key={idx}>
                <strong>{s.outcomeName}</strong> @{" "}
                {formatOddsWithUnit(s.bestOdds, oddsFormat)} ({s.bookName}) –{" "}
                {s.sharePercent.toFixed(1)}% ≈ ${s.stake.toFixed(2)}
              </li>
            ))}
          </ul>
          <div className="small" style={{ marginTop: 4 }}>
            Locked profit regardless of outcome:{" "}
            <strong>{arb.roi.toFixed(2)}%</strong> on total stake (before
            fees).
          </div>
        </div>
      );
    });
  } else if (mode === "bonus") {
    mainResults = bonusBets.map((bet) => {
      return (
        <div key={bet.id} className="result-card">
          <div className="flex-between">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{bet.match}</div>
            <div
              className="tag"
              style={{
                background: "rgba(251,191,36,0.15)",
                color: "#fbbf24",
              }}
            >
              ${bet.expectedValue} EV
            </div>
          </div>
          <div
            className="small"
            style={{ color: "var(--text-muted)", marginTop: 2 }}
          >
            {bet.league || ""}
            {bet.time ? " • " + bet.time : ""}
          </div>
          <div className="pill-row">
            <span className="pill pill-strong">{bet.bookName}</span>
            <span
              className="pill"
              style={{
                background: "rgba(251,191,36,0.15)",
                color: "#fbbf24",
              }}
            >
              {bet.bonusType.replace("-", " ").toUpperCase()}
            </span>
            <span className="pill">
              {bet.marketLabel}
              {bet.point != null ? ` (${bet.point})` : ""}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <strong>{bet.outcomeName}</strong>
          </div>
          <div className="small" style={{ marginTop: 2 }}>
            Odds: <strong>{formatOddsWithUnit(bet.odds, oddsFormat)}</strong>
            &nbsp;• Edge:{" "}
            <span className="ev-positive">
              +{bet.edgePercent.toFixed(1)}%
            </span>
          </div>
          <div
            className="small"
            style={{
              marginTop: 6,
              padding: 8,
              background: "rgba(251,191,36,0.1)",
              borderRadius: 4,
            }}
          >
            <strong>💡 Strategy:</strong> {bet.strategy}
          </div>
        </div>
      );
    });
  }

  const count =
    mode === "ev"
      ? evResults.length
      : mode === "arb"
      ? arbResults.length
      : bonusBets.length;

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">
            {mode === "ev"
              ? "Live +EV Opportunities"
              : mode === "arb"
              ? "Arbitrage Opportunities"
              : "🎁 Bonus Bet Opportunities"}
          </div>
          <div className="panel-subtitle">
            Tap "Scan" to fetch live odds and surface pricing edges.
          </div>
        </div>
        <div className="results-meta">
          <span className="tag">{count} bets</span>
        </div>
      </div>

      {/* EV mode state messages */}
      {mode === "ev" && evLoading && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          Scanning the books for +EV edges…
        </div>
      )}

      {mode === "ev" && evError && !evLoading && (
        <div
          style={{
            background: "rgba(220, 38, 38, 0.1)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#fca5a5",
            marginBottom: "12px",
            fontSize: "14px",
          }}
        >
          {evError}
        </div>
      )}

      {mode === "ev" &&
        !evLoading &&
        !evError &&
        evNoResults &&
        evResults.length === 0 && (
          <div
            style={{
              background: "rgba(148, 163, 184, 0.1)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            No +EV edges found with your current filters. Try lowering minimum
            edge, changing books, or switching sports.
          </div>
        )}

      {mode === "bonus" && !loading && bonusBets.length === 0 && (
        <div
          style={{
            background: "rgba(148, 163, 184, 0.1)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "12px",
            fontSize: "14px",
          }}
        >
          No bonus bet opportunities found for your current settings. Try
          adjusting the minimum odds or bonus amount.
        </div>
      )}

      <div className="results-list">
        {mode === "ev" &&
        (evLoading || evError || (evNoResults && evResults.length === 0))
          ? null
          : mainResults}
      </div>
    </>
  );
}

export default ResultsList;
