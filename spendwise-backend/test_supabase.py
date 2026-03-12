import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_ANON_KEY")
)

try:
    response = supabase.rpc("ping")  # RPC por defecto para health check
    print("✅ Conexión OK:", response)
except Exception as e:
    print("Error:", e)