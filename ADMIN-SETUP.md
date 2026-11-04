# Nocturne Admin — Vercel setup

This branch adds /admin, a server-side API and Supabase storage. The existing public site continues to work if the database is not configured.

## 1. Connect a database
Create a Supabase project (can be accessed via Vercel Marketplace). Open Supabase SQL Editor and run `supabase/setup.sql`.

## 2. Create your administrator
In Supabase Authentication > Users, create/invite your admin email and confirm it. Do not put passwords or private keys in GitHub.

## 3. Vercel Environment Variables
In Vercel project Settings > Environment Variables add:
- `SUPABASE_URL`: project URL (https://....supabase.co)
- `SUPABASE_ANON_KEY`: Supabase publishable/anon key
- `SUPABASE_SERVICE_ROLE_KEY`: **secret** Supabase service-role key
- `ADMIN_EMAIL`: the confirmed administrator email

Redeploy after saving variables. Never commit keys. Keep the service-role key server-side only.

## 4. Admin
Visit `https://your-domain/admin/`. Sign in with your Supabase admin email/password. The JSON editor saves section content into the database. This first version includes working publishing for products, website changelog, FAQ, support copy and Discord URL settings. Announcements and media can be stored but **are not yet rendered on the public site**.

### JSON examples
Changelog:
```json
[{"date":"04 NOV 2026","title":"Example","description":"Example description"}]
```
FAQ:
```json
[{"title":"PURCHASE & DELIVERY","questions":[{"question":"How do I purchase?","answer":"Contact our team."}]}]
```
Support:
```json
{"title":"HOW CAN WE HELP?","description":"Get help with your order.","channel":"Discord Tickets","response":"Queue dependent"}
```

## Important limitations
- This is a first version, not a visual drag-and-drop editor: edit structured JSON in the dashboard.
- No automatic migration from existing hard-coded products and changelogs: they remain visible as fallback until you publish a replacement.
- Publishing an empty products array leaves the built-in catalog in place.
- Product media uploads, product-specific changelog editing and announcements display need additional work.
- Supabase auth session is stored in sessionStorage and is cleared when the tab closes. Server verifies the token and exact admin email for writes.
- Protect the Supabase project and account with MFA where available.
