import flet as ft
import pandas as pd
import pandas_ta as ta
import yfinance as yf

# --- THE TRADING ENGINE LOGIC ---
class TradingEngine:
    @staticmethod
    def get_analysis(ticker):
        try:
            # Download data
            df = yf.download(ticker, period="1y", interval="1d")
            if df.empty: return None
            
            # Clean columns for technical analysis
            df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]
            
            # Calculate Rules (Indicators)
            df['SMA_200'] = ta.sma(df['Close'], length=200)
            df['RSI'] = ta.rsi(df['Close'], length=14)
            
            last_row = df.iloc[-1]
            price = last_row['Close']
            
            # Trading Rules
            rules = {
                "Trend": price > last_row['SMA_200'],
                "RSI Strength": 40 < last_row['RSI'] < 70,
                "Volume": last_row['Volume'] > df['Volume'].tail(20).mean()
            }
            
            passed = [name for name, ok in rules.items() if ok]
            return {
                "ticker": ticker.upper(),
                "price": f"{price:.2f}",
                "score": f"{len(passed)}/{len(rules)}",
                "status": "STRONG BUY" if len(passed) == 3 else "WAITING",
                "rules": rules
            }
        except:
            return None

# --- THE FLET UI ---
def main(page: ft.Page):
    page.title = "Crypto & Stock Sentinel"
    page.theme_mode = ft.ThemeMode.DARK
    page.window_width = 400  # Mobile-sized for PC testing
    page.scroll = "auto"

    ticker_input = ft.TextField(label="Ticker (e.g. BTC-USD, AAPL)", border_color="blue")
    display_area = ft.Column(spacing=20)

    def run_check(e):
        display_area.controls.clear()
        display_area.controls.append(ft.ProgressBar())
        page.update()

        data = TradingEngine.get_analysis(ticker_input.value)
        display_area.controls.clear()

        if data:
            color = "green" if data["status"] == "STRONG BUY" else "orange"
            
            # Main Result Card
            display_area.controls.append(
                ft.Card(
                    content=ft.Container(
                        padding=20,
                        content=ft.Column([
                            ft.Text(data["ticker"], size=28, weight="bold"),
                            ft.Text(f"${data['price']}", size=20),
                            ft.Text(data["status"], color=color, size=24, weight="bold"),
                            ft.Text(f"Rules Passed: {data['score']}"),
                        ])
                    )
                )
            )

            # Rules Checklist
            for rule_name, passed in data["rules"].items():
                display_area.controls.append(
                    ft.Row([
                        ft.Icon(ft.icons.CHECK_CIRCLE if passed else ft.icons.CANCEL, 
                                color="green" if passed else "red"),
                        ft.Text(rule_name)
                    ])
                )
        else:
            display_area.controls.append(ft.Text("Ticker not found or error fetching data.", color="red"))
        
        page.update()

    page.add(
        ft.Text("Trading Sentinel", size=32, weight="bold"),
        ft.Row([ticker_input, ft.IconButton(ft.icons.SEARCH, on_click=run_check)]),
        ft.Divider(),
        display_area
    )

ft.app(target=main)
