import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ticket-setup')
  .setDescription('Deploy a support ticket panel with button interactions.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📩 Staff Support & Moderation Tickets')
    .setColor('#5865F2')
    .setDescription('Need help, wish to report an issue, or speak with server moderators privately?\n\nClick the button below to open a private ticket channel with server staff.')
    .setFooter({ text: 'Chef Chris Cody\'s Kitchen • Support System' });

  const button = new ButtonBuilder()
    .setCustomId('open_support_ticket')
    .setLabel('Open Support Ticket')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📩');

  const row = new ActionRowBuilder().addComponents(button);

  await interaction.reply({ content: '✅ Support panel deployed below:', ephemeral: true });
  await interaction.channel.send({ embeds: [embed], components: [row] });
}

// Interaction handler for Ticket Buttons
export async function handleTicketInteraction(interaction) {
  if (!interaction.isButton()) return;

  const guild = interaction.guild;
  const user = interaction.user;

  if (interaction.customId === 'open_support_ticket') {
    const channelName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

    // Check if ticket channel already exists
    const existing = guild.channels.cache.find(c => c.name === channelName);
    if (existing) {
      return interaction.reply({
        content: `❌ You already have an open ticket: <#${existing.id}>`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const everyoneRole = guild.roles.everyone;

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Private support ticket for ${user.tag} (${user.id})`,
        permissionOverwrites: [
          {
            id: everyoneRole.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles
            ]
          }
        ],
        reason: `Support ticket opened by ${user.tag}`
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket: ${user.username}`)
        .setColor('#2ecc71')
        .setDescription(`Hello ${user}! Welcome to your private support ticket.\n\nPlease describe your issue or request in detail. A server moderator will be with you shortly.`)
        .setFooter({ text: 'Click "Close Ticket" when finished.' });

      const closeButton = new ButtonBuilder()
        .setCustomId('close_support_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const row = new ActionRowBuilder().addComponents(closeButton);

      await ticketChannel.send({ content: `${user} | <@&${guild.roles.everyone.id}>`, embeds: [ticketEmbed], components: [row] });

      await interaction.editReply({
        content: `✅ Your ticket channel has been created: <#${ticketChannel.id}>`
      });

    } catch (err) {
      console.error('Ticket creation error:', err);
      await interaction.editReply({ content: `❌ Failed to create ticket channel: ${err.message}` });
    }
  }

  else if (interaction.customId === 'close_support_ticket') {
    await interaction.reply({ content: '🔒 Closing ticket channel in 5 seconds...' });
    setTimeout(async () => {
      await interaction.channel.delete('Support ticket closed by user/staff').catch(() => {});
    }, 5000);
  }
}
