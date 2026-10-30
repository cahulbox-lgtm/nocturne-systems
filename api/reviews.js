// Vercel serverless function. Set DISCORD_BOT_TOKEN in Vercel environment variables.
const CHANNEL_ID = '1440742146289172621';
const GUILD_ID = '1440380580591304734';
let cache = { expires: 0, data: null };
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=30');
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  if (!process.env.DISCORD_BOT_TOKEN) return res.status(503).json({error:'Discord integration is not configured'});
  if (cache.data && Date.now() < cache.expires) return res.status(200).json(cache.data);
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=50`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'User-Agent': 'NocturneReviews (https://nocturne-systems-mu.vercel.app, 1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      console.error('Discord API status',response.status);
      return res.status(502).json({error:response.status===403?'Bot lacks access to #vouches':'Discord API temporarily unavailable'});
    }
    const raw=await response.json();
    const reviews=raw.filter(m=>!m.author?.bot && !m.webhook_id && (m.content?.trim() || m.attachments?.length))
      .map(m=>({
        id:m.id,
        author:(m.member?.nick || m.author?.global_name || m.author?.username || 'Discord user').slice(0,80),
        avatar:m.author?.avatar ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=80` : null,
        content:(m.content||'').slice(0,2500),
        timestamp:m.timestamp,
        url:`https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}/${m.id}`,
        attachments:(m.attachments||[]).slice(0,4).map(a=>({url:a.url,name:a.filename||'Attachment',image:!!a.content_type?.startsWith('image/')}))
      }));
    const data={reviews,updatedAt:new Date().toISOString()};
    cache={data,expires:Date.now()+20000};
    return res.status(200).json(data);
  } catch(e) {console.error('Discord reviews fetch failed',e.message);return res.status(502).json({error:'Discord reviews unavailable'});}
}
