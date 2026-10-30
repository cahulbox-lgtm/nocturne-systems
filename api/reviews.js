
const CHANNEL_ID = '1440742146289172621';
const GUILD_ID = '1440380580591304734';

let cache = { expires: 0, data: null };

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=30');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    return res.status(503).json({
      error: 'Discord integration is not configured'
    });
  }

  if (cache.data && Date.now() < cache.expires) {
    return res.status(200).json(cache.data);
  }

  try {
    const headers = {
      Authorization: `Bot ${token}`,
      'User-Agent': 'NocturneReviews (https://nocturne-systems-mu.vercel.app, 1.0)'
    };

    // Получаем отзывы и список каналов сервера
    const [messagesResponse, channelsResponse] = await Promise.all([
      fetch(
        `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=50`,
        {
          headers,
          signal: AbortSignal.timeout(8000)
        }
      ),
      fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
        {
          headers,
          signal: AbortSignal.timeout(8000)
        }
      )
    ]);

    if (!messagesResponse.ok) {
      console.error('Discord messages status:', messagesResponse.status);

      return res.status(502).json({
        error: messagesResponse.status === 403
          ? 'Bot lacks access to #vouches'
          : 'Discord API temporarily unavailable'
      });
    }

    const raw = await messagesResponse.json();

    // Создаём справочник ID → название канала
    const channelNames = new Map();

    if (channelsResponse.ok) {
      const channels = await channelsResponse.json();

      for (const channel of channels) {
        if (channel.id && channel.name) {
          channelNames.set(channel.id, channel.name);
        }
      }
    } else {
      console.error('Discord channels status:', channelsResponse.status);
    }

    function formatMentions(content) {
      return (content || '')
        // Упоминания каналов и категорий
        .replace(/<#(\d+)>/g, (match, id) => {
          const name = channelNames.get(id);
          return name ? `#${name}` : match;
        })

        // Упоминания пользователей
        .replace(/<@!?(\d+)>/g, (match, id) => {
          return `<@${id}>`;
        })

        // Упоминания ролей
        .replace(/<@&(\d+)>/g, (match, id) => {
          return `<@&${id}>`;
        });
    }

    const reviews = raw
      .filter(m =>
        !m.author?.bot &&
        !m.webhook_id &&
        (m.content?.trim() || m.attachments?.length)
      )
      .map(m => ({
        id: m.id,

        author: (
          m.member?.nick ||
          m.author?.global_name ||
          m.author?.username ||
          'Discord user'
        ).slice(0, 80),

        avatar: m.author?.avatar
          ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=80`
          : null,

        content: formatMentions(m.content).slice(0, 2500),

        timestamp: m.timestamp,

        url: `https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}/${m.id}`,

        attachments: (m.attachments || [])
          .slice(0, 4)
          .map(a => ({
            url: a.url,
            name: a.filename || 'Attachment',
            image: !!a.content_type?.startsWith('image/')
          }))
      }));

    const data = {
      reviews,
      updatedAt: new Date().toISOString()
    };

    cache = {
      data,
      expires: Date.now() + 20000
    };

    return res.status(200).json(data);

  } catch (e) {
    console.error('Discord reviews fetch failed:', e.message);

    return res.status(502).json({
      error: 'Discord reviews unavailable'
    });
  }
}
