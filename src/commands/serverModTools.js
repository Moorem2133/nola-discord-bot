import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChannelType 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('mod')
  .setDescription('Server-Wide Moderation Tools (Kick, Ban, Unban, Warn, Timeout, Purge, Lock Server)')
  .addSubcommand(sub =>
    sub
      .setName('kick')
      .setDescription('Kick a member from the server')
      .addUserOption(opt => opt.setName('target').setDescription('Member to kick').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for kick').setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('ban')
      .setDescription('Ban a user from the server')
      .addUserOption(opt => opt.setName('target').setDescription('User to ban').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for ban').setRequired(false))
      .addIntegerOption(opt =>
        opt
          .setName('delete_message_days')
          .setDescription('Number of days of message history to delete (0-7)')
          .setMinValue(0)
          .setMaxValue(7)
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('unban')
      .setDescription('Unban a user by User ID')
      .addStringOption(opt => opt.setName('user_id').setDescription('Discord User ID to unban').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for unban').setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('warn')
      .setDescription('Issue a formal warning to a server member')
      .addUserOption(opt => opt.setName('target').setDescription('Member to warn').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for warning').setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('timeout')
      .setDescription('Timeout a member globally across the server')
      .addUserOption(opt => opt.setName('target').setDescription('Member to timeout').setRequired(true))
      .addIntegerOption(opt =>
        opt
          .setName('duration_minutes')
          .setDescription('Timeout duration in minutes (e.g. 60 = 1 hour)')
          .setMinValue(1)
          .setMaxValue(40320) // 28 days
          .setRequired(true)
      )
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for timeout').setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('purge')
      .setDescription('Purge messages in the current channel')
      .addIntegerOption(opt =>
        opt.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('lockserver')
      .setDescription('Emergency lockdown or unlock for all public text channels in the server')
      .addBooleanOption(opt => opt.setName('locked').setDescription('True to lock down server, False to unlock').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for server lockdown').setRequired(false))
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guild = interaction.guild;
  const executor = interaction.member;

  // 1. Kick Command
  if (subcommand === 'kick') {
    if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ content: '❌ You require the `Kick Members` permission.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    await interaction.deferReply();

    try {
      const targetMember = await guild.members.fetch(targetUser.id);
      if (!targetMember.kickable) {
        return interaction.editReply({ content: '❌ Cannot kick this user (role hierarchy restriction).' });
      }

      await targetMember.kick(`${reason} (By ${interaction.user.tag})`);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('👢 Member Kicked')
        .addFields(
          { name: 'Target User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Failed to kick user: ${err.message}` });
    }
  }

  // 2. Ban Command
  else if (subcommand === 'ban') {
    if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: '❌ You require the `Ban Members` permission.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_message_days') || 0;
    await interaction.deferReply();

    try {
      await guild.members.ban(targetUser.id, {
        deleteMessageSeconds: deleteDays * 86400,
        reason: `${reason} (By ${interaction.user.tag})`
      });

      const embed = new EmbedBuilder()
        .setColor('#c0392b')
        .setTitle('🔨 User Banned')
        .addFields(
          { name: 'Banned User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Message Deletion', value: `${deleteDays} day(s)`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Failed to ban user: ${err.message}` });
    }
  }

  // 3. Unban Command
  else if (subcommand === 'unban') {
    if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: '❌ You require the `Ban Members` permission.', ephemeral: true });
    }

    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'Unbanned by moderator';
    await interaction.deferReply();

    try {
      await guild.members.unban(userId, `${reason} (By ${interaction.user.tag})`);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🔓 User Unbanned')
        .addFields(
          { name: 'User ID', value: `\`${userId}\``, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Failed to unban user: ${err.message}` });
    }
  }

  // 4. Warn Command
  else if (subcommand === 'warn') {
    if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You require the `Moderate Members` permission.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');
    await interaction.deferReply();

    // Send DM warning to target user if possible
    let dmStatus = 'DM Notification Sent';
    try {
      await targetUser.send(`⚠️ **Official Warning from ${guild.name}**\n**Reason:** ${reason}\n**Issued by:** ${interaction.user.tag}`);
    } catch {
      dmStatus = 'DM Notification Failed (User DMs closed)';
    }

    const embed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('⚠️ Formal Warning Issued')
      .addFields(
        { name: 'Warned Member', value: `${targetUser}`, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'DM Status', value: dmStatus, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  // 5. Timeout Command
  else if (subcommand === 'timeout') {
    if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You require the `Moderate Members` permission.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('target');
    const durationMins = interaction.options.getInteger('duration_minutes');
    const reason = interaction.options.getString('reason') || 'Server moderation timeout';
    await interaction.deferReply();

    try {
      const targetMember = await guild.members.fetch(targetUser.id);
      if (!targetMember.moderatable) {
        return interaction.editReply({ content: '❌ Cannot timeout this member (role hierarchy restriction).' });
      }

      await targetMember.timeout(durationMins * 60 * 1000, `${reason} (By ${interaction.user.tag})`);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('⏳ Global Server Timeout')
        .addFields(
          { name: 'Target', value: `${targetUser.tag}`, inline: true },
          { name: 'Duration', value: `${durationMins} minute(s)`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Failed to timeout user: ${err.message}` });
    }
  }

  // 6. Purge Command
  else if (subcommand === 'purge') {
    const channel = interaction.channel;
    if (!channel.permissionsFor(executor).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ You require `Manage Messages` permission in this channel.', ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await channel.bulkDelete(amount, true);
      await interaction.editReply({ content: `🧹 Successfully purged **${deleted.size}** message(s).` });
    } catch (err) {
      await interaction.editReply({ content: `❌ Purge failed: ${err.message}` });
    }
  }

  // 7. Lock Server Command
  else if (subcommand === 'lockserver') {
    if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only Administrators can use `/mod lockserver`.', ephemeral: true });
    }

    const locked = interaction.options.getBoolean('locked');
    const reason = interaction.options.getString('reason') || 'Server lockdown status update';
    await interaction.deferReply();

    try {
      const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
      const everyoneRole = guild.roles.everyone;
      let count = 0;

      for (const [_, ch] of textChannels) {
        await ch.permissionOverwrites.edit(everyoneRole, {
          [PermissionFlagsBits.SendMessages]: !locked
        }, { reason }).catch(() => {});
        count++;
      }

      const embed = new EmbedBuilder()
        .setColor(locked ? '#c0392b' : '#2ecc71')
        .setTitle(locked ? '🚨 SERVER LOCKDOWN ACTIVATED' : '🔓 SERVER LOCKDOWN LIFTED')
        .setDescription(`Updated **${count}** text channel(s) across **${guild.name}**.`)
        .addFields(
          { name: 'Lock Status', value: locked ? '🔒 All text channels locked for @everyone' : '🔓 Normal channel access restored', inline: false },
          { name: 'Reason', value: reason, inline: false }
        )
        .setFooter({ text: `Issued by Admin ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Server lockdown update failed: ${err.message}` });
    }
  }
}
