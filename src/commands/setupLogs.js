import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChannelType 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup-logs')
  .setDescription('Create or designate a private #mod-logs channel for audit logging.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Select an existing channel (or leave blank to automatically create #mod-logs)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const guild = interaction.guild;
    let targetChannel = interaction.options.getChannel('channel');

    if (!targetChannel) {
      // Check if #mod-logs already exists
      targetChannel = guild.channels.cache.find(c => c.name === 'mod-logs' && c.type === ChannelType.GuildText);

      if (!targetChannel) {
        // Create private #mod-logs channel
        const everyoneRole = guild.roles.everyone;
        
        targetChannel = await guild.channels.create({
          name: 'mod-logs',
          type: ChannelType.GuildText,
          topic: '🔒 Private Audit Log Channel for Moderation Events & Server Monitoring',
          permissionOverwrites: [
            {
              id: everyoneRole.id,
              deny: [PermissionFlagsBits.ViewChannel] // Hide from @everyone
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }
          ],
          reason: `Mod log channel created by ${interaction.user.tag}`
        });
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Audit Log Channel Configured')
      .setColor('#3498db')
      .setDescription(`Successfully designated <#${targetChannel.id}> as the official moderation log channel.`)
      .addFields({
        name: 'Logged Events',
        value: '• Member Kicks & Bans\n• Member Warnings & Timeouts\n• Channel Locks & Purges\n• Auto-Moderation Filter Actions'
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send a welcome message in the log channel
    const welcomeLog = new EmbedBuilder()
      .setTitle('🛡️ Moderation Log Channel Initialized')
      .setColor('#2ecc71')
      .setDescription('This channel will record all moderation events, auto-moderation flags, and server actions.')
      .setTimestamp();

    await targetChannel.send({ embeds: [welcomeLog] }).catch(() => {});

  } catch (error) {
    console.error('Error executing setup-logs:', error);
    await interaction.editReply({ content: `❌ Failed to setup log channel: ${error.message}` });
  }
}
