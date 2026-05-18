import pytest
from unittest.mock import patch
from app.utils.currency import convert_currency
from unittest.mock import patch

# Usamos 'patch' para simular la respuesta de la API externa
@patch.dict('os.environ', {'EXCHANGERATE_API_KEY': 'dummy_key'})
@patch('app.utils.currency.requests.get')
def test_convert_currency_success(mock_get):
    # Configuramos el "falso" resultado de la API
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {
        "result": "success",
        "conversion_result": 85.50
    }

    # Ejecutamos la función
    result = convert_currency(100, "USD", "EUR")

    # Verificaciones
    assert result == 85.50
    mock_get.assert_called_once() # Confirmamos que se intentó llamar a la API

def test_convert_same_currency():
    # Si la moneda es la misma, no debería ni intentar llamar a la API
    assert convert_currency(50, "EUR", "EUR") == 50