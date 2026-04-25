"""Supabase clients used across the backend.

Two clients are exposed at module level. Both are initialised once when
the module is first imported and reused by every service:

* :data:`supabase` — public client. Operations performed through it are
  filtered by Supabase's Row Level Security (RLS) policies, so it is
  safe to use it on behalf of an authenticated end user.
* :data:`supabase_admin` — service-role client. It **bypasses** RLS and
  should only be used server-side for trusted operations (admin tasks,
  bulk maintenance, post-signup profile bootstrap, ...). It must never
  be reachable from the frontend.

Both clients pull their connection settings from environment variables
loaded by ``python-dotenv``.
"""

import os

from supabase import create_client, Client
from dotenv import load_dotenv


# Load variables from a local .env file when present. In production the
# environment variables are expected to be set by the hosting platform.
load_dotenv()


# Public client: respects Supabase RLS. Use this for everything that
# acts on behalf of a logged-in user.
supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_ANON_KEY"),
)


# Admin client: uses the service-role key and skips RLS. Keep its usage
# limited to server-side flows that genuinely need elevated access.
supabase_admin: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_SERVICE_KEY"),
)
