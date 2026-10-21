sync-github-update
------------------
This function has no user-controlled update payload. It always reads the latest production release
from https://github.com/hasan2llpm-prog/Student and only accepts its update.json + APK asset.
It uses SUPABASE_SERVICE_ROLE_KEY only inside the Supabase Edge Function runtime.
