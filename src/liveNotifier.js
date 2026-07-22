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
function getAlertsChannel(client) {
  const channelId = process.env.LIVE_NOTIFY_CHANNEL_ID;
  if (channelId) {
    const channel = client.channels.cache.get(channelId);
    if (channel) return channel;
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
    const res = await fetch(`https://www.youtube.com/channel/${YT_CHANNEL_ID}/live`, { headers: HEADERS });
    const text = await res.text();
    
    const isLive = text.includes('hlsManifestUrl') || text.includes('"isLive":true') || text.includes('liveStreamabilityRenderer');
    
    if (isLive && !ytIsLive) {
      ytIsLive = true;
      console.log('📢 YouTube Channel is LIVE!');
      
      // Extract title if possible
      const titleMatch = /<meta name="title" content="([^"]+)"/i.exec(text);
      const title = titleMatch ? titleMatch[1] : 'Chef Chris Cody is LIVE on YouTube!';

      const embed = new EmbedBuilder()
        .setTitle(`🔴 LIVE NOW: ${title}`)
        .setURL(`https://www.youtube.com/channel/${YT_CHANNEL_ID}/live`)
        .setColor('#ff0000')
        .setDescription('Chef Chris Cody is streaming live! Join the stream and chat in real-time.')
        .setThumbnail(`https://img.youtube.com/vi/live/hqdefault.jpg`)
        .setFooter({ text: 'Chef Chris Cody\'s Kitchen Live Alert' })
        .setTimestamp();

      await channel.send({ content: `📢 **Chef Chris Cody** is LIVE on YouTube! @here\nhttps://www.youtube.com/channel/${YT_CHANNEL_ID}/live`, embeds: [embed] }).catch(() => {});
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

// 3. TikTok Live & Upload Check
async function checkTikTokChannel(client, channel, username) {
  try {
    // A. Check LIVE status
    const liveRes = await fetch(`https://www.tiktok.com/@${username}/live`, { headers: HEADERS });
    const liveText = await liveRes.text();
    
    // Check if the source contains a room ID and doesn't state no live
    const hasRoomId = /"roomId":"(\d{15,22})"/i.exec(liveText);
    const roomStatus = /"roomStatus":\s*2/i.exec(liveText); // status 2 is active live
    
    const isLive = !!(hasRoomId || roomStatus) && !liveText.includes('no_live') && !liveText.includes('No LIVE');
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

    // B. Check Upload status
    const profileRes = await fetch(`https://www.tiktok.com/@${username}`, { headers: HEADERS });
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
    const ytXml = await ytRes.text();
    const ytMatch = /<yt:videoId>([^<]+)<\/yt:videoId>/i.exec(ytXml);
    if (ytMatch) {
      lastYtVideoId = ytMatch[1];
    }
    
    // Seed TikTok
    for (const username of TIKTOK_CHANNELS) {
      const ttRes = await fetch(`https://www.tiktok.com/@${username}`, { headers: HEADERS });
      const ttText = await ttRes.text();
      const ttMatch = /"url":"https:\/\/www\.tiktok\.com\/@[^"]+?\/video\/(\d+)"/i.exec(ttText);
      if (ttMatch) {
        tiktokLastVideoIds.set(username, ttMatch[1]);
      }
    }
    console.log('🚀 Live Notifier Cache seeded successfully.');
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
    const channel = getAlertsChannel(client);
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
