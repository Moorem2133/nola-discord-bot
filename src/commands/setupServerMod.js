import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup-server-mod')
  .setDescription('Create and configure a Server-Wide Moderator role with full server moderation powers.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option =>
    option
      .setName('role_name')
      .setDescription('Name of the server moderator role (default: Server Moderator)')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option
      .setName('include_kick_ban')
      .setDescription('Grant Kick Members and Ban Members permissions to this role? (default: True)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('color')
      .setDescription('Hex color code for the role (default: #e74c3c red)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const guild = interaction.guild;
    const roleName = interaction.options.getString('role_name') || 'Server Moderator';
    const includeKickBan = interaction.options.getBoolean('include_kick_ban') ?? true;
    const colorInput = interaction.options.getString('color') || '#e74c3c';

    // Global Moderation Permissions
    const permissionsToGrant = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.MuteMembers,
      PermissionFlagsBits.DeafenMembers,
      PermissionFlagsBits.MoveMembers,
      PermissionFlagsBits.ViewAuditLog
    ];

    if (includeKickBan) {
      permissionsToGrant.push(PermissionFlagsBits.KickMembers);
      permissionsToGrant.push(PermissionFlagsBits.BanMembers);
    }

    let modRole = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    let actionText = '';

    if (!modRole) {
      modRole = await guild.roles.create({
        name: roleName,
        color: colorInput,
        permissions: permissionsToGrant,
        reason: `Server Moderator role created by ${interaction.user.tag}`
      });
      actionText = `Created new global role **${modRole.name}**.`;
    } else {
      await modRole.setPermissions(permissionsToGrant, `Updated by ${interaction.user.tag}`);
      actionText = `Updated existing role **${modRole.name}** with server-wide permissions.`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Server-Wide Moderator Setup Complete')
      .setColor('#2ecc71')
      .setDescription(`Successfully configured server-wide moderation role **${modRole.name}**!`)
      .addFields(
        { name: '1. Role Assigned', value: `${modRole} (\`${modRole.id}\`)\n*${actionText}*`, inline: false },
        { 
          name: '2. Granted Server-Wide Powers', 
          value: [
            '✅ **Manage Messages** (Delete/Pin messages across all channels)',
            '✅ **Manage Threads** (Archive/Lock threads server-wide)',
            '✅ **Timeout Members** (Issue global timeouts up to 28 days)',
            '✅ **View Audit Log** (Inspect server audit history)',
            '✅ **Mute & Deafen Members** (Voice channel moderation)',
            includeKickBan ? '✅ **Kick Members** (Remove users from server)' : '❌ **Kick Members**: Disabled',
            includeKickBan ? '✅ **Ban Members** (Permanently ban users)' : '❌ **Ban Members**: Disabled'
          ].join('\n'),
          inline: false
        },
        {
          name: '3. Coverage Scope',
          value: `🌐 **Entire Server** (${guild.channels.cache.size} channels & categories).`,
          inline: false
        }
      )
      .setFooter({ text: 'Nola Discord Server Moderation' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error executing setup-server-mod:', error);
    await interaction.editReply({ content: `❌ Failed to set up server moderator role: ${error.message}` });
  }
}
