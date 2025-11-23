import React from "react";

function ParlayBuilderPanel({
  parlayLegs,
  parlayStats,
  parlayMessage,
  stake,
  setStake,
  clearParlay,
  removeParlayIndex,
  calculateParlay,
  formatOddsWithUnit,
  oddsFormat,
}) {
  return (
    <div
      style={{
        marginTop: 14,
        borderTop: "1px solid var(--border-subtle)",
        paddingTop: 10,
      }}
    >
      <div className="panel-header" style={{ marginBottom: 6 }}>
        <div>
          <div className="panel-title">Parlay Builder (2–10 Legs)</div>
          <div className="panel-subtitle">
            Tap "Add to Parlay" on EV bets, then plug in your stake.
          </div>
        </div>
      </div>

      <div
        id="parlayBox"
        className="small"
        style={{ color: "var(--text-muted)" }}
      >
        {parlayLegs.length === 0 ? (
          <>No legs selected yet. Tap "Add to Parlay" above.</>
        ) : (
          <>
            <div className="parlay-leg-list">
              <div className="parlay-leg-header">
                <div className="small">
                  Legs selected: <strong>{parlayLegs.length}</strong> (min 2 /
                  max 10)
                </div>
                <button className="parlay-remove" onClick={clearParlay}>
                  Clear all
                </button>
              </div>
              {parlayLegs.map((leg, i) => (
                <div key={leg.id} className="parlay-leg">
                  <div className="parlay-leg-header">
                    <div>
                      <strong>{i + 1}.</strong> {leg.outcomeName}
                    </div>
                    <button
                      className="parlay-remove"
                      onClick={() => removeParlayIndex(i)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="parlay-meta">
                    {leg.match}
                    <br />
                    {leg.bookName} • {leg.marketLabel}
                    {leg.point != null ? ` (${leg.point})` : ""} •{" "}
                    {formatOddsWithUnit(leg.odds, oddsFormat)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="parlay-controls">
        <div className="field">
          <label htmlFor="parlayStake">Stake ($)</label>
          <input
            id="parlayStake"
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
        </div>
        <button className="btn-outline" onClick={calculateParlay}>
          Calculate Parlay EV
        </button>
      </div>

      <div id="parlayResult" style={{ marginTop: 8 }}>
        {parlayMessage && (
          <div className="result-card small ev-negative">{parlayMessage}</div>
        )}
        {parlayStats && (
          <div className="result-card small">
            <div>
              <strong>Parlay Summary ({parlayLegs.length} legs)</strong>
            </div>
            <div style={{ marginTop: 4 }}>
              Stake: <strong>${parseFloat(stake || "0").toFixed(2)}</strong>
              <br />
              Combined book decimal odds:{" "}
              <strong>{parlayStats.bookDec.toFixed(2)}x</strong>
              <br />
              Combined fair probability:{" "}
              <strong>
                {(parlayStats.fairProbProduct * 100).toFixed(1)}%
              </strong>
              <br />
              Implied fair decimal:{" "}
              <strong>
                {parlayStats.fairProbProduct > 0
                  ? (1 / parlayStats.fairProbProduct).toFixed(2) + "x"
                  : "-"}
              </strong>
              <br />
              Expected payout if it hits:{" "}
              <strong>${parlayStats.payout.toFixed(2)}</strong>
              <br />
              Profit on win:{" "}
              <strong>${parlayStats.profit.toFixed(2)}</strong>
              <br />
              Parlay EV vs fair:{" "}
              <strong
                className={parlayStats.ev >= 0 ? "ev-positive" : "ev-negative"}
              >
                {parlayStats.ev >= 0 ? "+" : ""}
                {parlayStats.ev.toFixed(1)}%
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParlayBuilderPanel;
