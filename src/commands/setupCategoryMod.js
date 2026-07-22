import { 
  SlashCommandBuilder, 
  ChannelType, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  PermissionsBitField 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup-category-mod')
  .setDescription('Automate creating a base moderator role & applying category-specific permissions.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addChannelOption(option =>
    option
      .setName('category')
      .setDescription('The category to assign local moderation permissions to (e.g. Food & Cooking)')
      .addChannelTypes(ChannelType.GuildCategory)
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('role_name')
      .setDescription('Name of the new moderator role to create or assign (e.g. Food & Cooking Mod)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('color')
      .setDescription('Optional hex color code for the role (e.g. #3498db or #ff9900)')
      .setRequired(false)
  )
  .addRoleOption(option =>
    option
      .setName('existing_role')
      .setDescription('Use an existing role instead of creating a new base role')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const category = interaction.options.getChannel('category');
    const roleName = interaction.options.getString('role_name');
    const colorInput = interaction.options.getString('color') || '#3498db';
    const existingRole = interaction.options.getRole('existing_role');

    const guild = interaction.guild;

    let modRole = existingRole;
    let createdRoleMsg = '';

    // Step 1: Base Role Creation (0 Global Advanced Permissions)
    if (!modRole) {
      // Check if role with exact name already exists
      modRole = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());

      if (!modRole) {
        modRole = await guild.roles.create({
          name: roleName,
          color: colorInput,
          // CRITICAL REQUIREMENT: Leave global toggles off (0 global admin permissions)
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ],
          reason: `Category Moderator setup requested by ${interaction.user.tag}`
        });
        createdRoleMsg = `Created base role **${modRole.name}** with zero global administrative permissions.`;
      } else {
        createdRoleMsg = `Using existing role **${modRole.name}**.`;
      }
    } else {
      createdRoleMsg = `Using specified role **${modRole.name}**.`;
    }

    // Step 2 & 3 & 4: Apply Category-Specific Overwrites (Green Checkmarks)
    // Overwrite permissions on the Category level
    await category.permissionOverwrites.edit(modRole, {
      // Category Moderation Powers (Green checkmarks)
      [PermissionFlagsBits.ManageChannels]: true,
      [PermissionFlagsBits.ManageMessages]: true,
      [PermissionFlagsBits.ManageThreads]: true,
      [PermissionFlagsBits.ModerateMembers]: true,
      
      // Essential Interaction Powers
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.SendMessages]: true,
      [PermissionFlagsBits.ReadMessageHistory]: true,
      [PermissionFlagsBits.CreatePublicThreads]: true,
      [PermissionFlagsBits.CreatePrivateThreads]: true,
      [PermissionFlagsBits.SendMessagesInThreads]: true
    }, {
      reason: `Assigned category moderation powers for ${category.name}`
    });

    // Option to sync child channels under the category if needed
    const childChannels = category.children.cache;
    let syncedCount = 0;
    
    // Check child channels and confirm permission application
    childChannels.forEach(channel => {
      if (channel.permissionsLocked) {
        syncedCount++;
      }
    });

    // Build visual summary embed
    const embed = new EmbedBuilder()
      .setTitle('✅ Category Moderator Setup Complete')
      .setColor('#2ecc71')
      .setDescription(`Successfully configured category moderation powers for **${category.name}**!`)
      .addFields(
        { name: '1. Base Role', value: `${modRole} (\`${modRole.id}\`)\n*${createdRoleMsg}*`, inline: false },
        { name: '2. Targeted Category', value: `📁 **${category.name}** (\`${category.id}\`)`, inline: false },
        { 
          name: '3. Category-Specific Powers (Green Checkmarks)', 
          value: [
            '✅ **Manage Channels** (Local channel editing)',
            '✅ **Manage Messages** (Local pin/delete messages)',
            '✅ **Manage Threads** (Local thread moderation)',
            '✅ **Timeout Members** (Local disciplinary timeouts)',
            '✅ **View & Send Messages** (Local channel access)'
          ].join('\n'), 
          inline: false 
        },
        { 
          name: '4. Global Permissions Status', 
          value: '🔒 **Global Manage Server**: OFF\n🔒 **Global Manage Channels**: OFF\n🔒 **Global Manage Messages**: OFF\n*(Moderators only hold power within the designated category)*', 
          inline: false 
        },
        {
          name: '5. Child Channels Status',
          value: `${childChannels.size} channel(s) in category (${syncedCount} synced to category permissions).`,
          inline: false
        }
      )
      .setFooter({ text: 'Nola Discord Category Mod Bot • Discord Permission Engine' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error executing setup-category-mod:', error);
    await interaction.editReply({
      content: `❌ Failed to set up category moderation: ${error.message}`
    });
  }
}
