import { EmbedBuilder } from 'discord.js';

// Cache for states to prevent duplicate notifications
let lastYtVideoId = null;
let ytIsLive = false;

const tiktokLastVideoIds = new Map(); // username -> lastVideoId
const tiktokLiveStates = new Map(); // username -> isLive (boolean)

const YT_CHANNEL_ID = 'UCoucrMB6GaRfylW0zi07nAw';
const TIKTOK_CHANNELS = ['nola_chef', 'munchy_munchdowns', 'michaelmoore286'];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5'
};

// Helper to get target channel for alerts
async function getAlertsChannel(client) {
  const channelId = process.env.LIVE_NOTIFY_CHANNEL_ID;
  if (channelId) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel) return channel;
    } catch (err) {
      console.warn(`⚠️ Failed to fetch live alerts channel (${channelId}):`, err.message);
    }
  }
  
  // Fallbacks: find text channel named 'live-alerts', 'announcements', or 'general-chat'
  const fallback = client.channels.cache.find(c => 
    c.isTextBased() && 
    (c.name === 'live-alerts' || c.name === 'announcements' || c.name === 'general-chat')
  );
  
  return fallback || client.channels.cache.find(c => c.isTextBased());
}

// 1. YouTube Live Check
async function checkYouTubeLive(client, channel) {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${YT_CHANNEL_ID}/live`, { 
      headers: HEADERS,
      redirect: 'follow' 
    });
    
    if (!res.ok) {
      console.warn(`⚠️ YouTube Live Check failed: HTTP status ${res.status}`);
      return;
    }
    
    const isLive = res.url.includes('/watch?v=') || res.url.includes('/v/');
    
    if (isLive && !ytIsLive) {
      ytIsLive = true;
      console.log(`📢 YouTube Channel is LIVE! URL: ${res.url}`);
      
      const text = await res.text();
      // Extract title if possible
      const titleMatch = /<meta name="title" content="([^"]+)"/i.exec(text) || /<title>([^<]+)<\/title>/i.exec(text);
      const title = titleMatch ? titleMatch[1] : 'Chef Chris Cody is LIVE on YouTube!';

      const embed = new EmbedBuilder()
        .setTitle(`🔴 LIVE NOW: ${title}`)
        .setURL(res.url)
        .setColor('#ff0000')
        .setDescription('Chef Chris Cody is streaming live! Join the stream and chat in real-time.')
        .setThumbnail(`https://img.youtube.com/vi/live/hqdefault.jpg`)
        .setFooter({ text: 'Chef Chris Cody\'s Kitchen Live Alert' })
        .setTimestamp();

      await channel.send({ content: `📢 **Chef Chris Cody** is LIVE on YouTube! @here\n${res.url}`, embeds: [embed] }).catch(() => {});
    } else if (!isLive && ytIsLive) {
      ytIsLive = false;
      console.log('🔴 YouTube Live stream ended.');
    }
  } catch (err) {
    console.error('Error checking YouTube Live:', err.message);
  }
}

// 2. YouTube Upload Check (RSS)
async function checkYouTubeUploads(client, channel) {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`⚠️ YouTube Upload RSS check failed: HTTP status ${res.status}`);
      return;
    }
    const xml = await res.text();
    
    const entryRegex = /<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<link[^>]*?href="([^"]+)"[\s\S]*?<\/entry>/i;
    const match = entryRegex.exec(xml);
    
    if (match) {
      const videoId = match[1];
      const title = match[2];
      const link = match[3];

      if (lastYtVideoId && lastYtVideoId !== videoId) {
        console.log(`📢 New YouTube video detected: ${title}`);
        
        const embed = new EmbedBuilder()
          .setTitle(`🎥 New YouTube Video: ${title}`)
          .setURL(link)
          .setColor('#ff0000')
          .setImage(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
          .setFooter({ text: 'Chef Chris Cody\'s Kitchen YouTube' })
          .setTimestamp();

        await channel.send({ content: `🔔 **New Video Alert!** Chef Chris Cody has posted a new video! @everyone\n${link}`, embeds: [embed] }).catch(() => {});
      }
      lastYtVideoId = videoId;
    }
  } catch (err) {
    console.error('Error checking YouTube uploads:', err.message);
  }
}

// Helper to check if a TikTok user is live using JSON state parsing and fallback regex
function isTikTokLive(html) {
  // Try SIGI_STATE first
  const sigiMatch = /<script id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/i.exec(html);
  if (sigiMatch) {
    try {
      const data = JSON.parse(sigiMatch[1]);
      const status = data.LiveRoom?.liveRoomUserInfo?.liveRoom?.status;
      if (status === 2) return true;
      if (status === 4) return false;
    } catch (e) {
      console.error('Error parsing SIGI_STATE JSON:', e.message);
    }
  }

  // Try __UNIVERSAL_DATA_FOR_REHYDRATION__
  const universalMatch = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/i.exec(html);
  if (universalMatch) {
    try {
      const data = JSON.parse(universalMatch[1]);
      const findField = (obj, field) => {
        let found = null;
        const search = (o) => {
          if (found !== null || !o || typeof o !== 'object') return;
          if (o[field] !== undefined) { found = o[field]; return; }
          for (const k in o) search(o[k]);
        };
        search(obj);
        return found;
      };
      const info = findField(data, 'liveRoomUserInfo');
      if (info && info.liveRoom && info.liveRoom.status === 2) return true;
    } catch (e) {
      console.error('Error parsing UNIVERSAL_DATA JSON:', e.message);
    }
  }

  // Fallback regexes
  const roomStatus = /"roomStatus":\s*2/i.exec(html);
  const liveStatusRegex = /"liveRoomUserInfo":{[\s\S]*?"status":\s*2\b/i.exec(html);
  const isOffline = html.includes('"status":4') || html.includes('"roomStatus":4');
  
  if (roomStatus || liveStatusRegex) {
    return !isOffline;
  }
  
  return false;
}

// 3. TikTok Live & Upload Check
async function checkTikTokChannel(client, channel, username) {
  try {
    // A. Check LIVE status
    const liveRes = await fetch(`https://www.tiktok.com/@${username}/live`, { headers: HEADERS });
    if (!liveRes.ok) {
      console.warn(`⚠️ TikTok Live Check for @${username} failed: HTTP status ${liveRes.status}`);
    } else {
      const liveText = await liveRes.text();
      const isLive = isTikTokLive(liveText);
      const wasLive = tiktokLiveStates.get(username) || false;

      if (isLive && !wasLive) {
        tiktokLiveStates.set(username, true);
        console.log(`📢 TikTok user @${username} is LIVE!`);
        
        const embed = new EmbedBuilder()
          .setTitle(`🔴 LIVE NOW ON TIKTOK: @${username}`)
          .setURL(`https://www.tiktok.com/@${username}/live`)
          .setColor('#fe2c55')
          .setDescription(`@${username} is streaming live on TikTok! Tune in and watch!`)
          .setFooter({ text: 'TikTok Live Alert' })
          .setTimestamp();

        await channel.send({ content: `📢 **@${username}** is LIVE on TikTok! @here\nhttps://www.tiktok.com/@${username}/live`, embeds: [embed] }).catch(() => {});
      } else if (!isLive && wasLive) {
        tiktokLiveStates.set(username, false);
        console.log(`🔴 TikTok user @${username} live stream ended.`);
      }
    }

    // B. Check Upload status
    const profileRes = await fetch(`https://www.tiktok.com/@${username}`, { headers: HEADERS });
    if (!profileRes.ok) {
      console.warn(`⚠️ TikTok Profile Check for @${username} failed: HTTP status ${profileRes.status}`);
      return;
    }
    const profileText = await profileRes.text();
    
    const videoRegex = /"url":"https:\/\/www\.tiktok\.com\/@[^"]+?\/video\/(\d+)"/i;
    const videoMatch = videoRegex.exec(profileText);
    
    if (videoMatch) {
      const videoId = videoMatch[1];
      const videoLink = `https://www.tiktok.com/@${username}/video/${videoId}`;
      const lastVideoId = tiktokLastVideoIds.get(username);
      
      if (lastVideoId && lastVideoId !== videoId) {
        console.log(`📢 New TikTok video from @${username}: ${videoId}`);
        
        const embed = new EmbedBuilder()
          .setTitle(`📱 New TikTok Upload from @${username}`)
          .setURL(videoLink)
          .setColor('#fe2c55')
          .setDescription(`Check out @${username}'s latest post on TikTok!`)
          .setFooter({ text: 'TikTok Upload Alert' })
          .setTimestamp();

        await channel.send({ content: `🔔 **New TikTok Post!** Check out the latest video from **@${username}**!\n${videoLink}`, embeds: [embed] }).catch(() => {});
      }
      tiktokLastVideoIds.set(username, videoId);
    } else {
      console.warn(`⚠️ Could not find any video links in profile HTML for TikTok user @${username}. This usually means the page was served without video data (anti-bot protection).`);
    }
  } catch (err) {
    console.error(`Error checking TikTok for @${username}:`, err.message);
  }
}

// Seeder on Startup (so we don't notify old uploads)
async function seedNotifierCache() {
  try {
    // Seed YouTube
    const ytRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`, { headers: HEADERS });
    if (!ytRes.ok) {
      console.warn(`⚠️ Failed to seed YouTube cache: HTTP status ${ytRes.status}`);
    } else {
      const ytXml = await ytRes.text();
      const ytMatch = /<yt:videoId>([^<]+)<\/yt:videoId>/i.exec(ytXml);
      if (ytMatch) {
        lastYtVideoId = ytMatch[1];
      }
    }
    
    // Seed TikTok
    for (const username of TIKTOK_CHANNELS) {
      const ttRes = await fetch(`https://www.tiktok.com/@${username}`, { headers: HEADERS });
      if (!ttRes.ok) {
        console.warn(`⚠️ Failed to seed TikTok cache for @${username}: HTTP status ${ttRes.status}`);
        continue;
      }
      const ttText = await ttRes.text();
      const ttMatch = /"url":"https:\/\/www\.tiktok\.com\/@[^"]+?\/video\/(\d+)"/i.exec(ttText);
      if (ttMatch) {
        tiktokLastVideoIds.set(username, ttMatch[1]);
      } else {
        console.warn(`⚠️ Could not find video URL to seed cache for TikTok user @${username}.`);
      }
    }
    console.log('🚀 Live Notifier Cache seeding complete.');
  } catch (err) {
    console.error('Failed to seed live notifier cache:', err.message);
  }
}

// Public initialization export
export async function initLiveNotifier(client) {
  // Seed initially
  await seedNotifierCache();
  
  // Set up checking interval: 10 minutes (600,000 ms)
  const INTERVAL_MS = 10 * 60 * 1000;
  
  async function runChecks() {
    const channel = await getAlertsChannel(client);
    if (!channel) {
      console.warn('⚠️ No text channel found to post YouTube/TikTok live notifications.');
      return;
    }
    
    console.log('⏳ Running YouTube and TikTok live updates check...');
    await checkYouTubeLive(client, channel);
    await checkYouTubeUploads(client, channel);
    
    for (const username of TIKTOK_CHANNELS) {
      await checkTikTokChannel(client, channel, username);
    }
  }

  // Run immediately on start, then set interval
  setTimeout(runChecks, 5000); // 5 sec delay after ready to let channels load
  setInterval(runChecks, INTERVAL_MS);
}
