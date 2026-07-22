import { 
  SlashCommandBuilder, 
  EmbedBuilder 
} from 'discord.js';

// Helper to fetch latest video from RSS
export async function getLatestVideo(channelId) {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    const xml = await res.text();
    
    // Extract video entries using regex
    const entryRegex = /<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<link[^>]*?href="([^"]+)"[\s\S]*?<\/entry>/i;
    const match = entryRegex.exec(xml);
    
    if (match) {
      const videoId = match[1];
      const title = match[2];
      const link = match[3];
      
      // Attempt to get description
      const descRegex = /<media:description>([^<]+)<\/media:description>/i;
      const descMatch = descRegex.exec(xml);
      const description = descMatch ? descMatch[1] : '';

      return {
        videoId,
        title,
        link,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        description
      };
    }
  } catch (err) {
    console.error('Error fetching YouTube RSS feed:', err);
  }
  return null;
}

export const data = new SlashCommandBuilder()
  .setName('youtube')
  .setDescription('YouTube commands for Chef Chris Cody\'s Kitchen')
  .addSubcommand(sub =>
    sub
      .setName('latest')
      .setDescription('Fetch the latest video upload from Chef Chris Cody\'s channel')
  )
  .addSubcommand(sub =>
    sub
      .setName('channel')
      .setDescription('Get link to Chef Chris Cody\'s YouTube channel page')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const channelId = 'UCoucrMB6GaRfylW0zi07nAw'; // Chef Chris Cody's YouTube Channel ID

  if (subcommand === 'latest') {
    await interaction.deferReply();
    const video = await getLatestVideo(channelId);

    if (!video) {
      return interaction.editReply('❌ Failed to fetch the latest video. Please check back later or visit the channel page directly!');
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎥 Latest Upload: ${video.title}`)
      .setURL(video.link)
      .setColor('#ff0000')
      .setImage(video.thumbnail)
      .setDescription(video.description.substring(0, 200) + (video.description.length > 200 ? '...' : ''))
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen YouTube Feed' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  else if (subcommand === 'channel') {
    const embed = new EmbedBuilder()
      .setTitle('🎥 Chef Chris Cody on YouTube')
      .setURL('https://youtube.com/@chefchriscody')
      .setColor('#ff0000')
      .setDescription('Subscribe and watch the latest culinary tutorials, recipe guides, and kitchen tips directly on YouTube!')
      .addFields({ name: 'Channel URL', value: 'https://youtube.com/@chefchriscody' })
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen' });

    await interaction.reply({ embeds: [embed] });
  }
}
