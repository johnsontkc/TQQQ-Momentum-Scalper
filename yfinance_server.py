#!/usr/bin/env python3
"""
yfinance data server for TQQQ Momentum Scalper.
Fetches real intraday 5-min TQQQ data and serves it via FastAPI on port 8001.
The Node.js backend polls this server to get fresh candle data.
"""

import time
import threading
import yfinance as yf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─── Cached data ─────────────────────────────────────────────────────────
cached_candles: list[dict] = []
last_fetch_time: float = 0
FETCH_INTERVAL = 30  # seconds between yfinance calls (avoid rate limiting)
data_source_status = {"source": "loading", "last_update": 0, "error": ""}


def fetch_tqqq_data():
    """Fetch TQQQ 5-min data from yfinance for today (or last trading day)."""
    global cached_candles, last_fetch_time, data_source_status

    try:
        ticker = yf.Ticker("TQQQ")
        # period="1d" with interval="5m" gets today's intraday data
        # If market is closed, it returns the last available trading day
        df = ticker.history(period="5d", interval="5m")

        if df.empty:
            data_source_status["error"] = "No data returned from yfinance"
            return

        candles = []
        for idx, row in df.iterrows():
            ts = int(idx.timestamp())
            candles.append({
                "time": ts,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        if candles:
            cached_candles = candles
            last_fetch_time = time.time()
            data_source_status = {
                "source": "yfinance",
                "last_update": int(time.time()),
                "error": "",
                "candle_count": len(candles),
                "latest_time": candles[-1]["time"],
                "latest_price": candles[-1]["close"],
            }
        else:
            data_source_status["error"] = "Empty candle list after parsing"

    except Exception as e:
        data_source_status["error"] = str(e)
        print(f"[yfinance] Error fetching data: {e}")


def background_fetcher():
    """Background thread that periodically refreshes data."""
    while True:
        fetch_tqqq_data()
        time.sleep(FETCH_INTERVAL)


# Start background fetcher
fetcher_thread = threading.Thread(target=background_fetcher, daemon=True)
fetcher_thread.start()

# Also do an initial fetch immediately
fetch_tqqq_data()


@app.get("/candles")
def get_candles():
    """Return all cached 5-min candle data."""
    return cached_candles


@app.get("/status")
def get_status():
    """Return data source status."""
    return data_source_status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
