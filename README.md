# TQQQ Momentum Scalper

Real-time TQQQ momentum scalping dashboard with 5-condition entry signal monitoring.

## Entry Conditions (all 5 must be met)

1. **ORB Breakout** — Close > first 5-min candle high (9:30–9:35 ET)
2. **EMA9 > EMA21** — Short-term bullish alignment
3. **Price > VWAP + VWAP rising** — Institutional bias bullish
4. **RSI 45–65** — Momentum starting, not overbought
5. **Volume ≥ 1.2x 20-period avg** — Confirmed breakout

## Features

- 5-min candlestick chart (Lightweight Charts)
- Real-time indicator monitoring (EMA, VWAP, RSI, Volume)
- Manual entry with custom price, shares, SL%, TP%
- Auto TP/SL exit tracking
- Trade history log
- Dark/light mode
- Real TQQQ data via yfinance

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  React Frontend │────▶│  Express Backend  │────▶│ Python yfinance│
│  (Vite + ShadCN)│     │  (Port 5000)      │     │ (Port 8001)    │
└─────────────────┘     └──────────────────┘     └────────────────┘
```

- **Frontend**: React + Tailwind CSS + shadcn/ui + Lightweight Charts
- **Backend**: Node.js Express (serves API + frontend)
- **Data**: Python FastAPI server fetching TQQQ data from Yahoo Finance via yfinance

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+

## Setup & Run (Local)

### 1. Install Node.js dependencies

```bash
npm install
```

### 2. Install Python dependencies

```bash
pip install yfinance fastapi uvicorn
```

### 3. Start the Python yfinance data server

```bash
python yfinance_server.py
```

This runs on port 8001 and fetches real TQQQ 5-min candle data every 30 seconds.

### 4. Start the app (dev mode)

Open a new terminal:

```bash
npm run dev
```

Open **http://localhost:5000** in your browser.

### 5. Production build (optional)

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

## Deploy to Railway / Render / VPS

### Option A: Railway (Recommended, easiest)

1. Push entire project to GitHub
2. Go to [railway.app](https://railway.app), connect your GitHub repo
3. Railway auto-detects Node.js — set the build command to `npm run build` and start command to `node dist/index.cjs`
4. Add a second service for the Python yfinance server (start command: `python yfinance_server.py`)
5. Set environment variable `YFINANCE_URL` if the Python service runs on a different host

### Option B: Single VPS (e.g. DigitalOcean, Vultr)

```bash
# Clone and install
git clone https://github.com/YOUR_USER/TQQQ-Momentum-Scalper.git
cd TQQQ-Momentum-Scalper
npm install
pip install yfinance fastapi uvicorn

# Start yfinance server in background
nohup python yfinance_server.py &

# Build and start production server
npm run build
NODE_ENV=production node dist/index.cjs
```

Use `pm2` or `systemd` to keep both processes running.

### Important: GitHub Pages will NOT work

This app requires a Node.js backend server. GitHub Pages only serves static files and cannot run server-side code. You need a platform that supports Node.js (Railway, Render, Fly.io, VPS, etc.).

## Project Structure

```
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page routes
│   │   ├── lib/             # Utilities
│   │   └── index.css        # Tailwind styles
│   └── index.html           # HTML entry
├── server/                  # Express backend
│   ├── routes.ts            # API routes + indicator calculations
│   ├── index.ts             # Server entry
│   └── storage.ts           # Storage interface
├── shared/                  # Shared types
│   └── schema.ts            # Data models
├── yfinance_server.py       # Python yfinance data fetcher
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

## Disclaimer

This is for educational/demonstration purposes only. Not financial advice. Simulated trading — no real orders are placed.
