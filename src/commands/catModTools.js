import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('catmod')
  .setDescription('Category Moderation Toolkit (Purge, Timeout, Lock)')
  .addSubcommand(sub =>
    sub
      .setName('purge')
      .setDescription('Purge messages in the current channel')
      .addIntegerOption(opt =>
        opt
          .setName('amount')
          .setDescription('Number of messages to delete (1-100)')
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('timeout')
      .setDescription('Timeout a member in this server')
      .addUserOption(opt =>
        opt.setName('target').setDescription('Member to timeout').setRequired(true)
      )
      .addIntegerOption(opt =>
        opt
          .setName('duration_minutes')
          .setDescription('Duration in minutes')
          .setMinValue(1)
          .setMaxValue(10080)
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('reason').setDescription('Reason for timeout').setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('lock')
      .setDescription('Lock or unlock the current channel for @everyone')
      .addBooleanOption(opt =>
        opt.setName('locked').setDescription('True to lock, False to unlock').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('reason').setDescription('Reason for channel status change').setRequired(false)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const channel = interaction.channel;
  const member = interaction.member;

  if (subcommand === 'purge') {
    // Check local channel permission
    if (!channel.permissionsFor(member).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '❌ You do not have `Manage Messages` permission in this category/channel.',
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await channel.bulkDelete(amount, true);
      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🧹 Category Message Purge')
        .setDescription(`Successfully purged **${deleted.size}** message(s) in <#${channel.id}>.`)
        .setFooter({ text: `Action by ${interaction.user.tag}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Failed to purge messages: ${err.message}` });
    }
  }

  else if (subcommand === 'timeout') {
    if (!channel.permissionsFor(member).has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: '❌ You do not have `Timeout Members` permission in this category/channel.',
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('target');
    const durationMins = interaction.options.getInteger('duration_minutes');
    const reason = interaction.options.getString('reason') || 'Category discipline';

    await interaction.deferReply();

    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      if (!targetMember.moderatable) {
        return interaction.editReply({ content: '❌ Cannot timeout this member (higher role or hierarchy restriction).' });
      }

      const durationMs = durationMins * 60 * 1000;
      await targetMember.timeout(durationMs, `${reason} (Issued by ${interaction.user.tag})`);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('⏳ Member Timed Out')
        .setDescription(`Successfully timed out **${targetUser.tag}** for **${durationMins} minute(s)**.`)
        .addFields(
          { name: 'Target', value: `${targetUser}`, inline: true },
          { name: 'Moderator', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Failed to timeout member: ${err.message}` });
    }
  }

  else if (subcommand === 'lock') {
    if (!channel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: '❌ You do not have `Manage Channels` permission in this category/channel.',
        ephemeral: true
      });
    }

    const locked = interaction.options.getBoolean('locked');
    const reason = interaction.options.getString('reason') || 'Category moderation locking';

    await interaction.deferReply();

    try {
      const everyoneRole = interaction.guild.roles.everyone;
      await channel.permissionOverwrites.edit(everyoneRole, {
        [PermissionFlagsBits.SendMessages]: !locked
      }, { reason });

      const embed = new EmbedBuilder()
        .setColor(locked ? '#c0392b' : '#2ecc71')
        .setTitle(locked ? '🔒 Channel Locked' : '🔓 Channel Unlocked')
        .setDescription(`This channel (<#${channel.id}>) has been **${locked ? 'locked' : 'unlocked'}**.`)
        .addFields(
          { name: 'Status', value: locked ? 'Read-Only for Members' : 'Normal Interaction', inline: true },
          { name: 'Reason', value: reason, inline: true }
        )
        .setFooter({ text: `Updated by ${interaction.user.tag}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Failed to update channel lock status: ${err.message}` });
    }
  }
}
