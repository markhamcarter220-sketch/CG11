import React from "react";

function FiltersPanel({
  mode,
  setMode,
  oddsFormat,
  setOddsFormat,
  autoRefresh,
  setAutoRefresh,
  refreshSeconds,
  setRefreshSeconds,
  sport,
  setSport,
  marketType,
  setMarketType,
  book,
  setBook,
  minEdge,
  setMinEdge,
  bonusBetType,
  setBonusBetType,
  bonusAmount,
  setBonusAmount,
  bonusOddsMin,
  setBonusOddsMin,
  loading,
  onScanClick,
  SPORTS,
  parlayLegs,
  parlayStats,
  parlayMessage,
  stake,
  setStake,
  clearParlay,
  removeParlayIndex,
  calculateParlay,
  formatOddsWithUnit,
}) {
  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">Filters & Parlay Builder</div>
          <div className="panel-subtitle">
            Choose mode, dial in filters, then stack legs into 2–10 leg parlays.
          </div>
        </div>
      </div>

      {/* MODE + ODDS FORMAT + AUTO REFRESH */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <button
            className="btn-outline"
            style={{
              borderColor:
                mode === "ev"
                  ? "rgba(34,197,94,0.9)"
                  : "rgba(148,163,184,0.5)",
              color: mode === "ev" ? "#bbf7d0" : "var(--text-muted)",
              marginRight: 4,
            }}
            onClick={() => setMode("ev")}
          >
            EV
          </button>
          <button
            className="btn-outline"
            style={{
              borderColor:
                mode === "arb"
                  ? "rgba(34,197,94,0.9)"
                  : "rgba(148,163,184,0.5)",
              color: mode === "arb" ? "#bbf7d0" : "var(--text-muted)",
              marginRight: 4,
            }}
            onClick={() => setMode("arb")}
          >
            Arbitrage
          </button>
          <button
            className="btn-outline"
            style={{
              borderColor:
                mode === "bonus"
                  ? "rgba(251,191,36,0.9)"
                  : "rgba(148,163,184,0.5)",
              color: mode === "bonus" ? "#fbbf24" : "var(--text-muted)",
            }}
            onClick={() => setMode("bonus")}
          >
            🎁 Bonus Bets
          </button>
        </div>

        <div style={{ marginLeft: "auto", fontSize: 11 }}>
          <span style={{ marginRight: 6, color: "var(--text-muted)" }}>
            Odds:
          </span>
          <button
            className="btn-outline"
            style={{
              borderColor:
                oddsFormat === "american"
                  ? "rgba(34,197,94,0.9)"
                  : "rgba(148,163,184,0.5)",
              color:
                oddsFormat === "american" ? "#bbf7d0" : "var(--text-muted)",
              marginRight: 4,
              padding: "2px 8px",
            }}
            onClick={() => setOddsFormat("american")}
          >
            American
          </button>
          <button
            className="btn-outline"
            style={{
              borderColor:
                oddsFormat === "decimal"
                  ? "rgba(34,197,94,0.9)"
                  : "rgba(148,163,184,0.5)",
              color:
                oddsFormat === "decimal" ? "#bbf7d0" : "var(--text-muted)",
              padding: "2px 8px",
            }}
            onClick={() => setOddsFormat("decimal")}
          >
            Decimal
          </button>
        </div>
      </div>

      {/* AUTO REFRESH */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh
        </label>
        {autoRefresh && (
          <>
            <span>every</span>
            <select
              value={refreshSeconds}
              onChange={(e) =>
                setRefreshSeconds(Number(e.target.value) || 30)
              }
              style={{ maxWidth: 80 }}
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </>
        )}
      </div>

      {/* FILTERS */}
      <div className="filters-grid">
        <div className="field">
          <label htmlFor="sport">Sport</label>
          <select
            id="sport"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            {Array.from(
              new Map(SPORTS.map((s) => [s.group, true])).keys()
            ).map((group) => (
              <optgroup key={group} label={group}>
                {SPORTS.filter((s) => s.group === group).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="marketType">Market Type</label>
          <select
            id="marketType"
            value={marketType}
            onChange={(e) => setMarketType(e.target.value)}
          >
            <option value="all">All markets</option>
            <option value="main">Main (ML, spreads, totals)</option>
            <option value="props">Player props only</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="book">Sportsbook</label>
          <select
            id="book"
            value={book}
            onChange={(e) => setBook(e.target.value)}
          >
            <option value="">All</option>
            <option value="draftkings">DraftKings</option>
            <option value="fanduel">FanDuel</option>
            <option value="betmgm">BetMGM</option>
            <option value="caesars">Caesars</option>
            <option value="pointsbetus">PointsBet</option>
            <option value="barstool">Barstool</option>
            <option value="betrivers">BetRivers</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="minEdge">
            {mode === "ev"
              ? "Minimum Edge vs Fair (%)"
              : mode === "arb"
              ? "Min Arb ROI (%)"
              : "Bonus Amount ($)"}
          </label>
          <input
            id="minEdge"
            type="number"
            step={mode === "bonus" ? "10" : "0.1"}
            value={mode === "bonus" ? bonusAmount : minEdge}
            onChange={(e) =>
              mode === "bonus"
                ? setBonusAmount(e.target.value)
                : setMinEdge(e.target.value)
            }
          />
        </div>

        {mode === "bonus" && (
          <>
            <div className="field">
              <label htmlFor="bonusType">Bonus Type</label>
              <select
                id="bonusType"
                value={bonusBetType}
                onChange={(e) => setBonusBetType(e.target.value)}
              >
                <option value="risk-free">Risk-Free Bet</option>
                <option value="deposit-match">Deposit Match</option>
                <option value="odds-boost">Odds Boost (20%)</option>
                <option value="profit-boost">Profit Boost (50%)</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="bonusOddsMin">Minimum Odds</label>
              <input
                id="bonusOddsMin"
                type="number"
                value={bonusOddsMin}
                onChange={(e) => setBonusOddsMin(e.target.value)}
                placeholder="-200"
              />
            </div>
          </>
        )}
      </div>

      <div className="filters-footer">
        <button
          className="btn-primary"
          onClick={onScanClick}
          disabled={loading}
        >
          {loading
            ? "Scanning…"
            : mode === "bonus"
            ? "Find Bonus Bets"
            : "Scan"}
        </button>
        <small>
          {mode === "bonus"
            ? "Scans live odds to find the best bets to use your promo on."
            : "One scan powers both EV and arbitrage views for your current filters."}
        </small>
      </div>
    </>
  );
}

export default FiltersPanel;
