import { 
  SlashCommandBuilder, 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('test-alerts')
  .setDescription('Send mock alerts to verify YouTube and TikTok notification formatting (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub
      .setName('youtube-live')
      .setDescription('Send a mock YouTube Go-Live alert')
  )
  .addSubcommand(sub =>
    sub
      .setName('youtube-upload')
      .setDescription('Send a mock YouTube New Video alert')
  )
  .addSubcommand(sub =>
    sub
      .setName('tiktok-live')
      .setDescription('Send a mock TikTok Go-Live alert')
  )
  .addSubcommand(sub =>
    sub
      .setName('tiktok-upload')
      .setDescription('Send a mock TikTok New Video alert')
  );

function getAlertsChannel(interaction) {
  const channelId = process.env.LIVE_NOTIFY_CHANNEL_ID;
  if (channelId) {
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel) return channel;
  }
  return interaction.channel;
}

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const channel = getAlertsChannel(interaction);

  if (!channel) {
    return interaction.reply({ content: '❌ Could not find a suitable text channel to post the test alert.', ephemeral: true });
  }

  // 1. YouTube Live
  if (subcommand === 'youtube-live') {
    const embed = new EmbedBuilder()
      .setTitle('🔴 LIVE NOW: Making the Ultimate Gumbo!')
      .setURL('https://youtube.com/@chefchriscody')
      .setColor('#ff0000')
      .setDescription('Chef Chris Cody is streaming live! Join the stream and chat in real-time.')
      .setThumbnail('https://img.youtube.com/vi/live/hqdefault.jpg')
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen Live Alert (TEST)' })
      .setTimestamp();

    await channel.send({ 
      content: `📢 **Chef Chris Cody** is LIVE on YouTube! @here\nhttps://youtube.com/@chefchriscody`, 
      embeds: [embed] 
    });

    await interaction.reply({ content: `✅ Mock YouTube Live alert sent to ${channel}!`, ephemeral: true });
  }

  // 2. YouTube Upload
  else if (subcommand === 'youtube-upload') {
    const embed = new EmbedBuilder()
      .setTitle('🎥 New YouTube Video: Smoked Ribs Masterclass')
      .setURL('https://youtube.com/@chefchriscody')
      .setColor('#ff0000')
      .setImage('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg') // Mock image
      .setDescription('Learn the secrets of making the most tender smoked ribs in this step-by-step masterclass.')
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen YouTube (TEST)' })
      .setTimestamp();

    await channel.send({ 
      content: `🔔 **New Video Alert!** Chef Chris Cody has posted a new video! @everyone\nhttps://youtube.com/@chefchriscody`, 
      embeds: [embed] 
    });

    await interaction.reply({ content: `✅ Mock YouTube Upload alert sent to ${channel}!`, ephemeral: true });
  }

  // 3. TikTok Live
  else if (subcommand === 'tiktok-live') {
    const embed = new EmbedBuilder()
      .setTitle('🔴 LIVE NOW ON TIKTOK: @nola_chef')
      .setURL('https://www.tiktok.com/@nola_chef/live')
      .setColor('#fe2c55')
      .setDescription('@nola_chef is streaming live on TikTok! Tune in and watch!')
      .setFooter({ text: 'TikTok Live Alert (TEST)' })
      .setTimestamp();

    await channel.send({ 
      content: `📢 **@nola_chef** is LIVE on TikTok! @here\nhttps://www.tiktok.com/@nola_chef/live`, 
      embeds: [embed] 
    });

    await interaction.reply({ content: `✅ Mock TikTok Live alert sent to ${channel}!`, ephemeral: true });
  }

  // 4. TikTok Upload
  else if (subcommand === 'tiktok-upload') {
    const embed = new EmbedBuilder()
      .setTitle('📱 New TikTok Upload from @nola_chef')
      .setURL('https://www.tiktok.com/@nola_chef')
      .setColor('#fe2c55')
      .setDescription('Check out @nola_chef\'s latest post on TikTok!')
      .setFooter({ text: 'TikTok Upload Alert (TEST)' })
      .setTimestamp();

    await channel.send({ 
      content: `🔔 **New TikTok Post!** Check out the latest video from **@nola_chef**!\nhttps://www.tiktok.com/@nola_chef`, 
      embeds: [embed] 
    });

    await interaction.reply({ content: `✅ Mock TikTok Upload alert sent to ${channel}!`, ephemeral: true });
  }
}
