import { 
  SlashCommandBuilder, 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { getLatestVideo } from './youtubeFeed.js';

const YT_CHANNEL_ID = 'UCoucrMB6GaRfylW0zi07nAw';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5'
};

export const data = new SlashCommandBuilder()
  .setName('test-alerts')
  .setDescription('Send alerts using live data from your YouTube & TikTok channels to verify formatting (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub
      .setName('youtube-live')
      .setDescription('Send a YouTube Go-Live alert using live stream details')
  )
  .addSubcommand(sub =>
    sub
      .setName('youtube-upload')
      .setDescription('Send a YouTube New Video alert using your latest video upload')
  )
  .addSubcommand(sub =>
    sub
      .setName('tiktok-live')
      .setDescription('Send a TikTok Go-Live alert using live profile details')
      .addStringOption(opt =>
        opt
          .setName('channel')
          .setDescription('Which TikTok channel to test')
          .setRequired(true)
          .addChoices(
            { name: 'nola_chef', value: 'nola_chef' },
            { name: 'munchy_munchdowns', value: 'munchy_munchdowns' },
            { name: 'michaelmoore286', value: 'michaelmoore286' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('tiktok-upload')
      .setDescription('Send a TikTok New Video alert using your latest video upload')
      .addStringOption(opt =>
        opt
          .setName('channel')
          .setDescription('Which TikTok channel to test')
          .setRequired(true)
          .addChoices(
            { name: 'nola_chef', value: 'nola_chef' },
            { name: 'munchy_munchdowns', value: 'munchy_munchdowns' },
            { name: 'michaelmoore286', value: 'michaelmoore286' }
          )
      )
  );

const FALLBACK_CHANNELS = {
  YOUTUBE: '1529511448919674921',          // #nola-live-notifications
  nola_chef: '1529511448919674921',        // #nola-live-notifications
  munchy_munchdowns: '1529511448919674921', // #nola-live-notifications
  michaelmoore286: '1529511760917303326',   // #michael-live-notifications
  DEFAULT: '1529511448919674921'           // #nola-live-notifications
};

async function getAlertsChannel(interaction, platform = null, username = null) {
  let channelId = null;
  if (platform === 'YouTube') {
    channelId = process.env.YOUTUBE_NOTIFY_CHANNEL_ID || FALLBACK_CHANNELS.YOUTUBE;
  } else if (platform === 'TikTok' && username) {
    const envKey = `TIKTOK_${username.toUpperCase()}_CHANNEL_ID`;
    channelId = process.env[envKey] || process.env.TIKTOK_NOTIFY_CHANNEL_ID || FALLBACK_CHANNELS[username] || process.env.LIVE_NOTIFY_CHANNEL_ID;
  } else {
    channelId = process.env.LIVE_NOTIFY_CHANNEL_ID || FALLBACK_CHANNELS.DEFAULT;
  }

  if (channelId) {
    try {
      const channel = await interaction.guild.channels.fetch(channelId);
      if (channel) return channel;
    } catch (err) {
      console.warn(`⚠️ Failed to fetch alerts channel (${channelId}):`, err.message);
    }
  }
  return interaction.channel;
}

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  let channel;
  if (subcommand.startsWith('youtube')) {
    channel = await getAlertsChannel(interaction, 'YouTube');
  } else if (subcommand.startsWith('tiktok')) {
    const tiktokUser = interaction.options.getString('channel');
    channel = await getAlertsChannel(interaction, 'TikTok', tiktokUser);
  } else {
    channel = await getAlertsChannel(interaction);
  }

  if (!channel) {
    return interaction.reply({ content: '❌ Could not find a suitable text channel to post the test alert.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  // 1. YouTube Live (Live Data)
  if (subcommand === 'youtube-live') {
    try {
      const res = await fetch(`https://www.youtube.com/channel/${YT_CHANNEL_ID}/live`, { headers: HEADERS });
      const text = await res.text();
      
      const titleMatch = /<meta name="title" content="([^"]+)"/i.exec(text);
      const title = titleMatch ? titleMatch[1] : 'Chef Chris Cody\'s Live Stream';

      const embed = new EmbedBuilder()
        .setTitle(`🔴 LIVE NOW: ${title}`)
        .setURL(`https://www.youtube.com/channel/${YT_CHANNEL_ID}/live`)
        .setColor('#ff0000')
        .setDescription('Chef Chris Cody is streaming live! Join the stream and chat in real-time.')
        .setThumbnail(`https://img.youtube.com/vi/live/hqdefault.jpg`)
        .setFooter({ text: 'Chef Chris Cody\'s Kitchen Live Alert' })
        .setTimestamp();

      await channel.send({ 
        content: `📢 **Chef Chris Cody** is LIVE on YouTube! @here\nhttps://www.youtube.com/channel/${YT_CHANNEL_ID}/live`, 
        embeds: [embed] 
      });

      await interaction.editReply({ content: `✅ Real YouTube Live alert sent to ${channel}!` });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: `❌ Error fetching live data: ${err.message}` });
    }
  }

  // 2. YouTube Upload (Live Data)
  else if (subcommand === 'youtube-upload') {
    const video = await getLatestVideo(YT_CHANNEL_ID);

    if (!video) {
      return interaction.editReply({ content: '❌ Failed to fetch latest video from YouTube RSS.' });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎥 New YouTube Video: ${video.title}`)
      .setURL(video.link)
      .setColor('#ff0000')
      .setImage(video.thumbnail)
      .setDescription(video.description.substring(0, 250) + (video.description.length > 250 ? '...' : ''))
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen YouTube' })
      .setTimestamp();

    await channel.send({ 
      content: `🔔 **New Video Alert!** Chef Chris Cody has posted a new video! @everyone\n${video.link}`, 
      embeds: [embed] 
    });

    await interaction.editReply({ content: `✅ Real YouTube Upload alert sent to ${channel}!` });
  }

  // 3. TikTok Live (Live Data)
  else if (subcommand === 'tiktok-live') {
    const tiktokUser = interaction.options.getString('channel');
    try {
      // Send go-live alert styled with live details
      const embed = new EmbedBuilder()
        .setTitle(`🔴 LIVE NOW ON TIKTOK: @${tiktokUser}`)
        .setURL(`https://www.tiktok.com/@${tiktokUser}/live`)
        .setColor('#fe2c55')
        .setDescription(`@${tiktokUser} is streaming live on TikTok! Tune in and watch!`)
        .setFooter({ text: 'TikTok Live Alert' })
        .setTimestamp();

      await channel.send({ 
        content: `📢 **@${tiktokUser}** is LIVE on TikTok! @here\nhttps://www.tiktok.com/@${tiktokUser}/live`, 
        embeds: [embed] 
      });

      await interaction.editReply({ content: `✅ Real TikTok Live alert sent for @${tiktokUser} to ${channel}!` });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: `❌ Error: ${err.message}` });
    }
  }

  // 4. TikTok Upload (Live Data)
  else if (subcommand === 'tiktok-upload') {
    const tiktokUser = interaction.options.getString('channel');
    try {
      const res = await fetch(`https://www.tiktok.com/@${tiktokUser}`, { headers: HEADERS });
      const html = await res.text();
      
      // Extract the real latest video URL using regex
      const videoRegex = /"url":"https:\/\/www\.tiktok\.com\/@[^"]+?\/video\/(\d+)"/i;
      const match = videoRegex.exec(html);

      if (!match) {
        return interaction.editReply({ content: `❌ Could not extract the latest video ID from TikTok profile page for @${tiktokUser}.` });
      }

      const videoId = match[1];
      const videoLink = `https://www.tiktok.com/@${tiktokUser}/video/${videoId}`;

      const embed = new EmbedBuilder()
        .setTitle(`📱 New TikTok Upload from @${tiktokUser}`)
        .setURL(videoLink)
        .setColor('#fe2c55')
        .setDescription(`Check out @${tiktokUser}'s latest post on TikTok!`)
        .setFooter({ text: 'TikTok Upload Alert' })
        .setTimestamp();

      await channel.send({ 
        content: `🔔 **New TikTok Post!** Check out the latest video from **@${tiktokUser}**!\n${videoLink}`, 
        embeds: [embed] 
      });

      await interaction.editReply({ content: `✅ Real TikTok Upload alert sent for @${tiktokUser} to ${channel}!` });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: `❌ Error fetching TikTok profile data: ${err.message}` });
    }
  }
}
