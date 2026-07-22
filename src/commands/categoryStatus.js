import { 
  SlashCommandBuilder, 
  ChannelType, 
  PermissionFlagsBits, 
  EmbedBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('category-status')
  .setDescription('Audit all categories and inspect active category-specific moderator roles.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const guild = interaction.guild;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);

    if (categories.size === 0) {
      return interaction.editReply('No categories found in this server.');
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Category Moderation Audit')
      .setColor('#34495E')
      .setDescription(`Auditing **${categories.size}** category/categories across **${guild.name}**.`);

    let fieldCount = 0;

    for (const [id, category] of categories) {
      if (fieldCount >= 25) break; // Discord embed field limit safety

      const overwrites = category.permissionOverwrites.cache;
      const modRolesInfo = [];

      overwrites.forEach(ow => {
        // Only check roles (type === 0 for Role in d.js v14)
        if (ow.type === 0) {
          const role = guild.roles.cache.get(ow.id);
          if (role && !role.managed && role.id !== guild.id) {
            const allows = ow.allow;
            
            const hasManageChannels = allows.has(PermissionFlagsBits.ManageChannels);
            const hasManageMessages = allows.has(PermissionFlagsBits.ManageMessages);
            const hasManageThreads = allows.has(PermissionFlagsBits.ManageThreads);
            const hasModerateMembers = allows.has(PermissionFlagsBits.ModerateMembers);

            if (hasManageChannels || hasManageMessages || hasManageThreads || hasModerateMembers) {
              const powers = [];
              if (hasManageChannels) powers.push('Manage Channels');
              if (hasManageMessages) powers.push('Manage Messages');
              if (hasManageThreads) powers.push('Manage Threads');
              if (hasModerateMembers) powers.push('Timeout Members');

              modRolesInfo.push(`• **${role.name}**: ${powers.join(', ')}`);
            }
          }
        }
      });

      const childCount = category.children.cache.size;
      const statusText = modRolesInfo.length > 0 
        ? modRolesInfo.join('\n') 
        : '*No category-specific moderator roles assigned.*';

      embed.addFields({
        name: `📁 ${category.name} (${childCount} channels)`,
        value: statusText,
        inline: false
      });

      fieldCount++;
    }

    embed.setFooter({ text: 'Nola Discord Category Mod Bot' }).setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error auditing categories:', error);
    await interaction.editReply({ content: `❌ Error fetching category status: ${error.message}` });
  }
}
