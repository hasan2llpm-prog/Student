Student AI Edge Function
1) Deploy: supabase functions deploy student-ai
2) Set server secret only (never in APK): supabase secrets set OPENAI_API_KEY=...
3) Optional model override: supabase secrets set OPENAI_MODEL=gpt-5.6
4) Keep JWT verification enabled so only signed-in Student users can call the function.
