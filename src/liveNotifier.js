import { EmbedBuilder, ActivityType } from 'discord.js';
import { ProxyAgent } from 'undici';

// Cache for states to prevent duplicate notifications
let lastYtVideoId = null;
let ytIsLive = false;

const tiktokLastVideoIds = new Map(); // username -> lastVideoId
const tiktokLiveStates = new Map(); // username -> isLive (boolean)

// Dynamic profile avatar caches
let ytChannelAvatarUrl = null;
const tiktokAvatars = new Map(); // username -> avatarUrl

const YT_CHANNEL_ID = 'UCoucrMB6GaRfylW0zi07nAw';
const TIKTOK_CHANNELS = ['nola_chef', 'munchy_munchdowns', 'michaelmoore286'];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5'
};

// Initialize proxy agent if TIKTOK_PROXY is configured
let proxyAgent = null;
if (process.env.TIKTOK_PROXY) {
  try {
    proxyAgent = new ProxyAgent(process.env.TIKTOK_PROXY);
    console.log('🔄 TikTok proxy configured successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize TikTok proxy:', err.message);
  }
}

// Fetch helper that automatically applies the proxy dispatcher
async function fetchWithProxy(url, options = {}) {
  const fetchOptions = {
    headers: HEADERS,
    ...options
  };
  if (proxyAgent) {
    fetchOptions.dispatcher = proxyAgent;
  }
  return fetch(url, fetchOptions);
}

// Base channel fetching function
async function fetchChannelById(client, channelId, platformName) {
  let channel = null;
  if (channelId) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (err) {
      console.warn(`⚠️ Failed to fetch ${platformName} alerts channel (${channelId}):`, err.message);
    }
  }
  
  if (!channel) {
    // Fallbacks: find text channel named 'live-alerts', 'announcements', or 'general-chat'
    const fallback = client.channels.cache.find(c => 
      c.isTextBased() && 
      (c.name === 'live-alerts' || c.name === 'announcements' || c.name === 'general-chat')
    );
    channel = fallback || client.channels.cache.find(c => c.isTextBased());
  }
  
  if (channel) {
    console.log(`📢 ${platformName} alerts channel resolved to: #${channel.name} (Guild: ${channel.guild?.name || 'DM / Unknown'})`);
  } else {
    console.warn(`⚠️ No text channel found to post ${platformName} notifications.`);
  }
  
  return channel;
}

// Helper to get target channel for YouTube alerts
async function getYouTubeChannel(client) {
  const ytChannelId = process.env.YOUTUBE_NOTIFY_CHANNEL_ID || process.env.LIVE_NOTIFY_CHANNEL_ID;
  return fetchChannelById(client, ytChannelId, 'YouTube');
}

// Helper to get target channel for TikTok alerts
async function getTikTokChannel(client) {
  const ttChannelId = process.env.TIKTOK_NOTIFY_CHANNEL_ID || process.env.LIVE_NOTIFY_CHANNEL_ID;
  return fetchChannelById(client, ttChannelId, 'TikTok');
}

// Helper to get mention prefix
function getMentionPrefix() {
  const mention = process.env.LIVE_NOTIFY_MENTION;
  if (mention === 'none') return '';
  return mention ? `${mention} ` : '@here ';
}

// Dynamic Bot Activity / Status Rotation
let activityRotationInterval = null;

function updateBotActivity(client) {
  const activeTiktokLive = Array.from(tiktokLiveStates.values()).some(state => state);
  
  if (ytIsLive) {
    client.user.setActivity('Chef Chris Cody LIVE on YouTube!', {
      type: ActivityType.Streaming,
      url: `https://www.youtube.com/channel/${YT_CHANNEL_ID}/live`
    });
    stopRotation();
  } else if (activeTiktokLive) {
    const liveUser = Array.from(tiktokLiveStates.entries()).find(([_, isLive]) => isLive)?.[0];
    client.user.setActivity(`@${liveUser} LIVE on TikTok!`, {
      type: ActivityType.Streaming,
      url: `https://www.tiktok.com/@${liveUser}/live`
    });
    stopRotation();
  } else {
    startRotation(client);
  }
}

function startRotation(client) {
  if (activityRotationInterval) return;
  
  const statuses = [
    { name: 'Chef Chris Cody\'s Kitchen', type: ActivityType.Watching },
    { name: 'Nola Chef Recipes', type: ActivityType.Watching },
    { name: 'for live updates!', type: ActivityType.Watching }
  ];
  let index = 0;
  
  const setRotationStatus = () => {
    const status = statuses[index];
    client.user.setActivity(status.name, { type: status.type });
    index = (index + 1) % statuses.length;
  };

  setRotationStatus();
  activityRotationInterval = setInterval(setRotationStatus, 5 * 60 * 1000);
}

function stopRotation() {
  if (activityRotationInterval) {
    clearInterval(activityRotationInterval);
    activityRotationInterval = null;
  }
}

// 1. YouTube Live Check
async function checkYouTubeLive(client, channel) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (apiKey) {
      // Use official YouTube API
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&type=video&eventType=live&key=${apiKey}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        console.warn(`⚠️ YouTube Live API check failed: HTTP status ${res.status}. Falling back to scraper.`);
        await checkYouTubeLiveScraper(client, channel);
        return;
      }
      const data = await res.json();
      const items = data.items || [];
      const isLive = items.length > 0;
      
      if (isLive && !ytIsLive) {
        ytIsLive = true;
        updateBotActivity(client);
        const liveVideo = items[0];
        const videoId = liveVideo.id.videoId;
        const title = liveVideo.snippet.title;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`📢 YouTube Channel is LIVE via API! URL: ${videoUrl}`);
        
        const mention = getMentionPrefix();
        const embed = new EmbedBuilder()
          .setTitle(`🔴 LIVE NOW: ${title}`)
          .setURL(videoUrl)
          .setColor('#ff0000')
          .setDescription('Chef Chris Cody is streaming live! Join the stream and chat in real-time.')
          .setThumbnail(ytChannelAvatarUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
          .setFooter({ text: 'Chef Chris Cody\'s Kitchen Live Alert' })
          .setTimestamp();

        await channel.send({ 
          content: `📢 **Chef Chris Cody** is LIVE on YouTube! ${mention}\n${videoUrl}`, 
          embeds: [embed] 
        }).catch((err) => console.error('❌ Failed to send YouTube live alert to Discord:', err));
      } else if (!isLive && ytIsLive) {
        ytIsLive = false;
        updateBotActivity(client);
        console.log('🔴 YouTube Live stream ended (detected via API).');
      }
    } else {
      // No API key configured, use scraper
      await checkYouTubeLiveScraper(client, channel);
    }
  } catch (err) {
    console.error('Error checking YouTube Live:', err.message);
  }
}

// Scraper fallback helper
async function checkYouTubeLiveScraper(client, channel) {
  const res = await fetch(`https://www.youtube.com/channel/${YT_CHANNEL_ID}/live`, { 
    headers: HEADERS,
    redirect: 'follow' 
  });
  
  if (!res.ok) {
    console.warn(`⚠️ YouTube Live Scraper check failed: HTTP status ${res.status}`);
    return;
  }
  
  const isLive = res.url.includes('/watch?v=') || res.url.includes('/v/');
  
  if (isLive && !ytIsLive) {
    ytIsLive = true;
    updateBotActivity(client);
    console.log(`📢 YouTube Channel is LIVE via scraper! URL: ${res.url}`);
    
    const text = await res.text();
    const titleMatch = /<meta name="title" content="([^"]+)"/i.exec(text) || /<title>([^<]+)<\/title>/i.exec(text);
    const title = titleMatch ? titleMatch[1] : 'Chef Chris Cody is LIVE on YouTube!';

    const mention = getMentionPrefix();
    const embed = new EmbedBuilder()
      .setTitle(`🔴 LIVE NOW: ${title}`)
      .setURL(res.url)
      .setColor('#ff0000')
      .setDescription('Chef Chris Cody is streaming live! Join the stream and chat in real-time.')
      .setThumbnail(ytChannelAvatarUrl || `https://img.youtube.com/vi/live/hqdefault.jpg`)
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen Live Alert' })
      .setTimestamp();

    await channel.send({ 
      content: `📢 **Chef Chris Cody** is LIVE on YouTube! ${mention}\n${res.url}`, 
      embeds: [embed] 
    }).catch((err) => console.error('❌ Failed to send YouTube live alert to Discord:', err));
  } else if (!isLive && ytIsLive) {
    ytIsLive = false;
    updateBotActivity(client);
    console.log('🔴 YouTube Live stream ended (detected via scraper).');
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
        
        const mention = getMentionPrefix();
        const embed = new EmbedBuilder()
          .setTitle(`🎥 New YouTube Video: ${title}`)
          .setURL(link)
          .setColor('#ff0000')
          .setImage(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
          .setThumbnail(ytChannelAvatarUrl)
          .setFooter({ text: 'Chef Chris Cody\'s Kitchen YouTube' })
          .setTimestamp();

        await channel.send({ content: `🔔 **New Video Alert!** Chef Chris Cody has posted a new video! ${mention}\n${link}`, embeds: [embed] }).catch((err) => console.error('❌ Failed to send YouTube upload alert to Discord:', err));
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

// Parse TikTok avatar from HTML page
function parseTikTokAvatar(html, username) {
  if (!username) return;
  
  const sigiMatch = /<script id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/i.exec(html);
  if (sigiMatch) {
    try {
      const data = JSON.parse(sigiMatch[1]);
      const avatar = data.LiveRoom?.liveRoomUserInfo?.user?.avatarThumb;
      if (avatar) {
        tiktokAvatars.set(username, avatar);
        return;
      }
    } catch (e) {}
  }
  
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
      const userObj = findField(data, 'liveRoomUserInfo')?.user || findField(data, 'userInfo')?.user;
      if (userObj && userObj.avatarThumb) {
        tiktokAvatars.set(username, userObj.avatarThumb);
      }
    } catch (e) {}
  }
}

// 3. TikTok Live & Upload Check
async function checkTikTokChannel(client, channel, username) {
  try {
    // A. Check LIVE status
    const liveRes = await fetchWithProxy(`https://www.tiktok.com/@${username}/live`);
    if (!liveRes.ok) {
      console.warn(`⚠️ TikTok Live Check for @${username} failed: HTTP status ${liveRes.status}`);
    } else {
      const liveText = await liveRes.text();
      parseTikTokAvatar(liveText, username);
      const isLive = isTikTokLive(liveText);
      const wasLive = tiktokLiveStates.get(username) || false;

      if (isLive && !wasLive) {
        tiktokLiveStates.set(username, true);
        updateBotActivity(client);
        console.log(`📢 TikTok user @${username} is LIVE!`);
        
        const mention = getMentionPrefix();
        const avatarUrl = tiktokAvatars.get(username) || 'https://raw.githubusercontent.com/discordjs/guide/main/guide/assets/images/discord-logo-blue.svg';
        
        const embed = new EmbedBuilder()
          .setTitle(`🔴 LIVE NOW ON TIKTOK: @${username}`)
          .setURL(`https://www.tiktok.com/@${username}/live`)
          .setColor('#fe2c55')
          .setDescription(`@${username} is streaming live on TikTok! Tune in and watch!`)
          .setThumbnail(avatarUrl)
          .setFooter({ text: 'TikTok Live Alert' })
          .setTimestamp();

        await channel.send({ content: `📢 **@${username}** is LIVE on TikTok! ${mention}\nhttps://www.tiktok.com/@${username}/live`, embeds: [embed] }).catch((err) => console.error('❌ Failed to send TikTok live alert to Discord:', err));
      } else if (!isLive && wasLive) {
        tiktokLiveStates.set(username, false);
        updateBotActivity(client);
        console.log(`🔴 TikTok user @${username} live stream ended.`);
      }
    }

    // B. Check Upload status
    const profileRes = await fetchWithProxy(`https://www.tiktok.com/@${username}`);
    if (!profileRes.ok) {
      console.warn(`⚠️ TikTok Profile Check for @${username} failed: HTTP status ${profileRes.status}`);
      return;
    }
    const profileText = await profileRes.text();
    parseTikTokAvatar(profileText, username);
    
    const videoRegex = /"url":"https:\/\/www\.tiktok\.com\/@[^"]+?\/video\/(\d+)"/i;
    const videoMatch = videoRegex.exec(profileText);
    
    if (videoMatch) {
      const videoId = videoMatch[1];
      const videoLink = `https://www.tiktok.com/@${username}/video/${videoId}`;
      const lastVideoId = tiktokLastVideoIds.get(username);
      
      if (lastVideoId && lastVideoId !== videoId) {
        console.log(`📢 New TikTok video from @${username}: ${videoId}`);
        
        const mention = getMentionPrefix();
        const avatarUrl = tiktokAvatars.get(username) || 'https://raw.githubusercontent.com/discordjs/guide/main/guide/assets/images/discord-logo-blue.svg';
        
        const embed = new EmbedBuilder()
          .setTitle(`📱 New TikTok Upload from @${username}`)
          .setURL(videoLink)
          .setColor('#fe2c55')
          .setDescription(`Check out @${username}'s latest post on TikTok!`)
          .setThumbnail(avatarUrl)
          .setFooter({ text: 'TikTok Upload Alert' })
          .setTimestamp();

        await channel.send({ content: `🔔 **New TikTok Post!** Check out the latest video from **@${username}**! ${mention}\n${videoLink}`, embeds: [embed] }).catch((err) => console.error('❌ Failed to send TikTok upload alert to Discord:', err));
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
    const apiKey = process.env.YOUTUBE_API_KEY;

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
    
    // Fetch YouTube Channel Details for high-res avatar if API Key is available
    if (apiKey) {
      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${YT_CHANNEL_ID}&key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            ytChannelAvatarUrl = data.items[0].snippet.thumbnails.default.url;
            console.log('✅ YouTube channel avatar loaded successfully.');
          }
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch YouTube channel avatar:', err.message);
      }
    }
    
    // Seed TikTok
    for (const username of TIKTOK_CHANNELS) {
      const ttRes = await fetchWithProxy(`https://www.tiktok.com/@${username}`);
      if (!ttRes.ok) {
        console.warn(`⚠️ Failed to seed TikTok cache for @${username}: HTTP status ${ttRes.status}`);
        continue;
      }
      const ttText = await ttRes.text();
      parseTikTokAvatar(ttText, username);
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
  
  // Set up checking interval: defaults to 1 minute (60,000 ms) or customized via env
  const INTERVAL_MS = process.env.LIVE_CHECK_INTERVAL_MS ? parseInt(process.env.LIVE_CHECK_INTERVAL_MS) : 60000;
  console.log(`⏳ Live updates check interval configured to: ${INTERVAL_MS / 1000} seconds.`);
  
  // Initialize bot activity status
  updateBotActivity(client);

  async function runChecks() {
    console.log('⏳ Running YouTube and TikTok live updates check...');
    
    // Fetch channels independently to support separate alert channels
    const ytChannel = await getYouTubeChannel(client);
    if (ytChannel) {
      await checkYouTubeLive(client, ytChannel);
      await checkYouTubeUploads(client, ytChannel);
    }
    
    const ttChannel = await getTikTokChannel(client);
    if (ttChannel) {
      for (const username of TIKTOK_CHANNELS) {
        await checkTikTokChannel(client, ttChannel, username);
      }
    }
  }

  // Run immediately on start, then set interval
  setTimeout(runChecks, 5000); // 5 sec delay after ready to let channels load
  setInterval(runChecks, INTERVAL_MS);
}
