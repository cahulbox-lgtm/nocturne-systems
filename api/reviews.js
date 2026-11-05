// Nocturne Systems: Discord vouches proxy. Keep DISCORD_BOT_TOKEN in Vercel Secrets.
const CHANNEL_ID = '1440742146289172621';
const GUILD_ID = '1440380580591304734';
let cache = { expires: 0, data: null };
const headers = () => ({ Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'User-Agent': 'NocturneReviews (https://nocturne-systems-mu.vercel.app, 1.1)' });
async function discord(path) {
  const response = await fetch(`https://discord.com/api/v10${path}`, { headers: headers(), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Discord API ${response.status} for ${path.split('?')[0]}`);
  return response.json();
}
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=30');
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  if (!process.env.DISCORD_BOT_TOKEN) return res.status(503).json({error:'Discord integration is not configured'});
  if (cache.data && Date.now() < cache.expires) return res.status(200).json(cache.data);
  try {
    // Page through the channel history instead of stopping at the latest 50 messages.
    // Discord returns at most 100 messages per request.
    const raw = [];
    let before = '';
    for (let page = 0; page < 20; page++) {
      const batch = await discord(`/channels/${CHANNEL_ID}/messages?limit=100${before ? '&before=' + encodeURIComponent(before) : ''}`);
      if (!batch.length) break;
      raw.push(...batch);
      before = batch[batch.length - 1].id;
      if (batch.length < 100) break;
    }
    const visible = raw.filter(m => !m.author?.bot && !m.webhook_id && (m.content?.trim() || m.attachments?.length));
    const channelIds = new Set(), roleIds = new Set(), userIds = new Set();
    for (const m of visible) {
      for (const [,kind,id] of m.content?.matchAll(/<(@!?|@&|#)(\d{15,22})>/g) || []) {
        if (kind === '#') channelIds.add(id);
        else if (kind === '@&') roleIds.add(id);
        else userIds.add(id);
      }
    }
    const users = {}, channels = {}, roles = {};
    // Discord supplies the mentioned users in each message. Prefer their server nickname.
    for (const m of visible) for (const u of m.mentions || []) {
      users[u.id] = m.mention_nicks?.[u.id] || m.mentions?.find(x => x.id === u.id)?.member?.nick || u.global_name || u.username || 'Discord user';
    }
    // Channel and role names are not supplied in normal message content; resolve them from the guild.
    if (channelIds.size || roleIds.size) {
      const jobs = [];
      if (channelIds.size) jobs.push(discord(`/guilds/${GUILD_ID}/channels`).then(all => {
        for (const c of all) if (channelIds.has(c.id)) channels[c.id] = c.name;
      }).catch(e => console.warn('Channel mention lookup failed:', e.message)));
      if (roleIds.size) jobs.push(discord(`/guilds/${GUILD_ID}/roles`).then(all => {
        for (const r of all) if (roleIds.has(r.id)) roles[r.id] = r.name;
      }).catch(e => console.warn('Role mention lookup failed:', e.message)));
      await Promise.all(jobs);
    }
    // The message mention list normally contains every pinged user; avoid a separate API request per review.
    const reviews = visible.map(m => ({
      id: m.id,
      author: (m.member?.nick || m.author?.global_name || m.author?.username || 'Discord user').slice(0,80),
      avatar: m.author?.avatar ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=80` : null,
      content: (m.content || '').slice(0,2500),
      mentions: { users, channels, roles },
      timestamp: m.timestamp,
      url: `https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}/${m.id}`,
      attachments: (m.attachments || []).slice(0,4).map(a => ({ url:a.url, name:a.filename || 'Attachment', image:!!a.content_type?.startsWith('image/') }))
    }));
    const data = { reviews, updatedAt: new Date().toISOString(), truncated: raw.length >= 2000 };
    cache = { data, expires: Date.now() + 20000 };
    return res.status(200).json(data);
  } catch (e) {
    console.error('Discord reviews fetch failed:', e.message);
    return res.status(502).json({error:'Discord reviews unavailable'});
  }
}
