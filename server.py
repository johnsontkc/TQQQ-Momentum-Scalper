#!/usr/bin/env python3
"""
TQQQ Momentum Scalper - 使用 yfinance 讀取數據（超穩定版）
"""

from flask import Flask, jsonify, request
import yfinance as yf
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/chart/<ticker>')
def chart(ticker):
    range_ = request.args.get('range', '3mo')
    interval = request.args.get('interval', '1d')
    
    try:
        # 使用 yfinance 取得數據（最穩定）
        data = yf.download(ticker, period=range_, interval=interval, progress=False)
        
        if data.empty:
            return jsonify({'error': 'No data'}), 404
        
        # 轉成原本 Yahoo v8 chart 的格式（讓你前端不用大改）
        result = {
            "chart": {
                "result": [{
                    "meta": {
                        "symbol": ticker,
                        "regularMarketPrice": float(data['Close'].iloc[-1]),
                        "previousClose": float(data['Close'].iloc[-2]) if len(data) > 1 else float(data['Close'].iloc[-1])
                    },
                    "indicators": {
                        "quote": [{
                            "close": data['Close'].tolist(),
                            "high": data['High'].tolist(),
                            "low": data['Low'].tolist(),
                            "open": data['Open'].tolist(),
                            "volume": data['Volume'].tolist()
                        }]
                    },
                    "timestamp": data.index.astype(int) // 10**9
                }]
            }
        }
        
        resp = jsonify(result)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp
        
    except Exception as e:
        return jsonify({'error': str(e), 'chart': {'result': None}}), 502

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8090))
    print(f'🚀 TQQQ-Momentum-Scalper 啟動中 (yfinance) → http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
