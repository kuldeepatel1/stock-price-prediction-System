from fastapi import APIRouter, Request, HTTPException, Query
from datetime import datetime
import yfinance as yf
import logging
import calendar

router = APIRouter()

@router.get("/predict")
async def predict_price(
    request: Request,
    ticker: str = Query(..., description="Ticker symbol like RELIANCE.NS"),
    year: int = Query(..., description="Year to predict for, e.g. 2026"),
    month: int = Query(1, description="Month to predict for (1-12)"),
    day: int = Query(1, description="Day to predict for (1-31)")
):
    models = request.app.state.models

    if ticker not in models:
        raise HTTPException(status_code=404, detail=f"Model for '{ticker}' not found")

    model = models[ticker]

    try:
        # Validate month and day
        if month < 1 or month > 12:
            raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
        
        # Get days in the specified month
        days_in_month = calendar.monthrange(year, month)[1]
        if day < 1 or day > days_in_month:
            raise HTTPException(status_code=400, detail=f"Day must be between 1 and {days_in_month} for month {month}")

        # Create target date
        target_date = datetime(year, month, day)
        now = datetime.now()

        # Calculate days into the future
        days_from_now = (target_date - now).days
        if days_from_now < 0:
            raise HTTPException(status_code=400, detail="Cannot predict for past dates")

        # Convert calendar days to trading days (approximately 252 per year)
        future_day = int(days_from_now * 252 / 365)

        # Predict future price using the ML model
        predicted_price = float(model.predict([[future_day]])[0])

        # Fetch current price using Yahoo Finance
        data = yf.download(ticker, period="1d", progress=False)
        if data.empty:
            raise HTTPException(status_code=404, detail=f"Failed to fetch current price for '{ticker}'")
        current_price = float(data["Close"].iloc[-1])

        return {
            "ticker": ticker,
            "year": year,
            "month": month,
            "day": day,
            "predictedPrice": round(predicted_price, 2),
            "currentPrice": round(current_price, 2),
            "confidence": 90,  # Placeholder
            "createdAt": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise  # Re-raise known HTTP exceptions
    except Exception as e:
        logging.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
