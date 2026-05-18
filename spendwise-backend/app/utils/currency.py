import requests
import os
import logging
from functools import lru_cache
from fastapi import HTTPException

logger = logging.getLogger(__name__)

API_KEY = os.getenv("EXCHANGERATE_API_KEY")
# Cambiamos un poco la URL para traer solo la tasa de conversión en lugar del valor ya calculado
BASE_URL = f"https://v6.exchangerate-api.com/v6/{API_KEY}/pair"

@lru_cache(maxsize=128)
def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    """Fetches and caches the exchange rate multiplier to save API calls."""
    if from_currency == to_currency:
        return 1.0
    
    if not API_KEY:
        logger.warning("EXCHANGERATE_API_KEY is not set. Defaulting rate to 1.0")
        return 1.0
        
    try:
        url = f"{BASE_URL}/{from_currency}/{to_currency}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if data["result"] == "success":
            return float(data["conversion_rate"])
        else:
            raise ValueError("API error")
            
    except Exception as e:
        logger.error(f"Failed to fetch exchange rate: {e}")
        return 1.0

def convert_currency(amount: float, from_currency: str, to_currency: str = "EUR") -> float:
    """
    Calls the External Currency API to convert amounts (using cached rates).
    Requirement: Issue #32
    """
    if from_currency == to_currency:
        return amount

    # Obtenemos la tasa (de internet o de la caché rápida) y multiplicamos
    rate = get_exchange_rate(from_currency, to_currency)
    converted_amount = amount * rate
    
    # Logging requirement for Sprint 3
    logger.info(f"Currency Conversion: {amount} {from_currency} -> {converted_amount} {to_currency} (Rate: {rate})")
    
    return round(converted_amount, 2)