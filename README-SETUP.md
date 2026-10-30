# Nocturne Systems — Discord live reviews

## Upload to GitHub
Upload `index.html`, `package.json` and the `api` folder (containing `reviews.js`) to the root of your existing GitHub repository. Keep `hero.png`, `emblem.png` and `visual.png` in the root. Commit changes.

## Create and invite a Discord bot
1. Open https://discord.com/developers/applications and create an application.
2. Under **Bot**, create/reset a bot token. Keep it private; NEVER commit it to GitHub or share it in chat.
3. Under **Installation / OAuth2 URL Generator**, invite the bot to your Discord server with `bot` scope and permissions **View Channels** and **Read Message History**.
4. Make sure the bot has access to the `#vouches` channel (channel ID `1440742146289172621`).
5. In the Discord Developer Portal, enable **Message Content Intent** under Bot > Privileged Gateway Intents if message content is empty. This is required to read text content from most guild messages even when using REST.

## Configure Vercel
1. In Vercel > your project > Settings > Environment Variables, create `DISCORD_BOT_TOKEN` with your secret bot token. Select Production (and Preview if desired).
2. Redeploy the latest deployment to apply the variable.
3. Visit `https://nocturne-systems-mu.vercel.app/api/reviews` and verify it returns JSON with a `reviews` array.
4. Visit the website and scroll to Customer Reviews. The page polls every 30 seconds while open. The endpoint caches for about 20 seconds per serverless instance.

## Notes
- The site is publicly visible; only post messages in `#vouches` that you have permission to publish. Usernames, avatars, text and attachments are displayed publicly.
- Bot token remains server-side and is never exposed to browsers.
- This endpoint retrieves the latest 50 channel messages, filters out bots/webhooks, and displays their original content and attachments. It does not verify purchases or identities.
- If Discord returns 403, verify permissions, bot membership, and Message Content Intent.
- If Vercel project settings use an unusual Output Directory or Framework preset, select **Other** and leave Output Directory blank for a static site with API functions.
