# Better Bets

A real-time sports betting odds scanner that identifies positive Expected Value (EV) bets, arbitrage opportunities, and bonus bet optimization across multiple sportsbooks.

## Features

- **EV Scanner**: Finds positive expected value bets using devigged fair odds
- **Arbitrage Finder**: Identifies risk-free betting opportunities across books
- **Bonus Bet Optimizer**: Maximizes value from risk-free bets, deposit matches, odds boosts
- **Parlay Builder**: Calculate fair odds and EV for parlay combinations
- **Live Odds**: Real-time odds from The Odds API across NFL, NBA, MLB, NHL, Soccer, MMA, Tennis, and more
- **Mobile-First UI**: Clean, responsive interface built with React and Tailwind CSS

## Tech Stack

- **Backend**: Node.js + Express (port 4000)
- **Frontend**: React + Vite
- **API**: The Odds API for live sportsbook odds
- **Deployment**: Single Node service (backend serves built frontend)

## Local Development

### Prerequisites

- Node.js 18+ required
- The Odds API key (get one at https://the-odds-api.com)

### Setup

1. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

3. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```

4. **Configure environment variables**:
   
   Edit `backend/.env`:
   ```
   ODDS_API_KEY=your_odds_api_key_here
   BETTERBETS_API_KEY=your_secret_key_here
   NODE_ENV=development
   PORT=4000
   CORS_ORIGINS=http://localhost:4000
   ```

5. **Start the server** (from project root):
   ```bash
   node backend/server.js
   ```

6. **Access the app**:
   Open http://localhost:4000

## Deployment

### Deploy to Render

Render deploys this as a single **Web Service** that serves both backend API and frontend.

#### Quick Deploy Steps:

1. **Connect your GitHub repo** to Render

2. **Create a new Web Service** with these settings:

   **Build Command**:
   ```bash
   npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
   ```

   **Start Command**:
   ```bash
   node backend/server.js
   ```

3. **Set Environment Variables** in Render dashboard:
   ```
   ODDS_API_KEY=your_odds_api_key_here
   BETTERBETS_API_KEY=your_production_secret_key
   NODE_ENV=production
   PORT=4000
   CORS_ORIGINS=https://your-app-name.onrender.com
   ```

4. **Deploy**: Render will automatically build and deploy your app

#### Using render.yaml (Optional)

Alternatively, you can use the included `render.yaml` for infrastructure-as-code deployment:

```yaml
services:
  - type: web
    name: better-bets
    env: node
    buildCommand: npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
    startCommand: node backend/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: ODDS_API_KEY
        sync: false
      - key: BETTERBETS_API_KEY
        sync: false
      - key: PORT
        value: 4000
```

Commit this file to your repo and select "Blueprint" when creating the service.

---

### Deploy to Railway

Railway also deploys this as a single service.

#### Quick Deploy Steps:

1. **Connect your GitHub repo** to Railway

2. **Create a new Project** from your repo

3. **Railway will auto-detect** Node.js. Override build/start if needed:

   **Build Command** (if needed):
   ```bash
   npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
   ```

   **Start Command**:
   ```bash
   node backend/server.js
   ```

4. **Set Environment Variables** in Railway dashboard:
   ```
   ODDS_API_KEY=your_odds_api_key_here
   BETTERBETS_API_KEY=your_production_secret_key
   NODE_ENV=production
   PORT=4000
   CORS_ORIGINS=${{RAILWAY_PUBLIC_DOMAIN}}
   ```

   Note: Railway provides `${{RAILWAY_PUBLIC_DOMAIN}}` automatically for your app URL.

5. **Deploy**: Railway will build and deploy automatically

---

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ODDS_API_KEY` | ✅ Yes | API key from The Odds API | `abc123def456` |
| `BETTERBETS_API_KEY` | ⚠️ Recommended | Secret key for API authentication (required in production) | `my-secret-key-123` |
| `NODE_ENV` | No | Environment mode | `production` or `development` |
| `PORT` | No | Server port (defaults to 4000) | `4000` |
| `CORS_ORIGINS` | No | Allowed CORS origins (comma-separated) | `https://yourdomain.com` |

---

## API Endpoints

All API endpoints require the `x-betterbets-key` header (value from `BETTERBETS_API_KEY` env var) except in development mode.

- **GET /api/health** - Health check
- **GET /api/odds** - Raw odds data from The Odds API
  - Query params: `sport`, `markets`, `regions`, `oddsFormat`
- **GET /api/ev-full** - EV scanner with arb results
  - Query params: `sport`, `marketType`, `book`, `minEdge`
- **GET /api/scan** - Alias for `/api/ev-full`

Example:
```bash
curl -H "x-betterbets-key: your-key" "https://your-app.onrender.com/api/health"
```

---

## Project Structure

```
/
├── backend/
│   ├── config/
│   │   └── index.js          # Environment config loader
│   ├── server.js              # Main Express server
│   ├── package.json           # Backend dependencies
│   └── .env                   # Local environment variables (git-ignored)
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── components/       # React components
│   │   ├── utils/            # Helper functions
│   │   └── main.jsx          # React entry point
│   ├── dist/                 # Built frontend (created by npm run build)
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.js        # Vite configuration
│   └── .env                  # Frontend env vars (git-ignored)
├── scripts/                  # Utility scripts
├── tests/                    # Test files
└── README.md                 # This file
```

---

## How It Works

1. **Frontend** is built into static files (`frontend/dist/`)
2. **Backend** serves:
   - Frontend static files at `/`
   - API routes at `/api/*`
3. Backend proxies requests to The Odds API with your API key (keeps it secure)
4. Frontend calls backend API, never exposes API keys in the browser

---

## Odds Calculation

- **Fair Odds**: Calculated using "devigging" - removes bookmaker vig by normalizing implied probabilities across best available odds
- **Expected Value (EV)**: `EV% = (UserOdds / FairOdds - 1) × 100`
- **Arbitrage ROI**: `ROI% = (1 / ΣImpliedProbs - 1) × 100` where implied probs < 1.0

---

## Troubleshooting

### Backend won't start
- Verify `ODDS_API_KEY` is set in `backend/.env` or environment variables
- Check Node version: `node --version` (should be 18+)

### Frontend not loading
- Ensure frontend is built: `cd frontend && npm run build`
- Check that `frontend/dist/` folder exists
- Verify backend serves static files from `../frontend/dist`

### API returns 401 Unauthorized
- Check that `x-betterbets-key` header matches `BETTERBETS_API_KEY`
- In development, `BETTERBETS_API_KEY` can be empty (auth disabled)

### Odds data is stale
- The backend caches odds for 15 seconds to reduce API calls
- Wait 15+ seconds and refresh to get fresh odds

---

## License & Disclaimer

This tool is for informational and educational purposes only. It is not financial advice or betting advice. Always gamble responsibly. Check your local laws regarding sports betting.

---

## Support

- The Odds API: https://the-odds-api.com
- GitHub Issues: [Your repo URL here]

---

Built with ❤️ for sharp sports bettors
