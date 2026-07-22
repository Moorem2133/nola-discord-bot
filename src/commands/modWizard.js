import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ChannelSelectMenuBuilder, 
  ChannelType, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  ComponentType
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('mod-wizard')
  .setDescription('Launch an interactive wizard to create & configure Category Moderator roles.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction) {
  const guild = interaction.guild;

  // Step 1 Embed & Component: Pick Category
  const categorySelect = new ChannelSelectMenuBuilder()
    .setCustomId('wizard_select_category')
    .setPlaceholder('Select the target category (e.g. Food & Cooking)...')
    .setChannelTypes(ChannelType.GuildCategory);

  const row1 = new ActionRowBuilder().addComponents(categorySelect);

  const step1Embed = new EmbedBuilder()
    .setTitle('🧙 Category Moderation Setup Wizard')
    .setColor('#5865F2')
    .setDescription('Welcome! This wizard will guide you through setting up a localized Category Moderator role.\n\n**Step 1:** Select the server category you want to assign moderators for.')
    .addFields({
      name: 'Why Category Moderation?',
      value: 'Category-specific moderation limits moderator powers strictly to relevant channels (like "Food & Cooking"), preventing unintended global permissions across your server.'
    })
    .setFooter({ text: 'Step 1 of 3 • Select Category' });

  const initialResponse = await interaction.reply({
    embeds: [step1Embed],
    components: [row1],
    ephemeral: true,
    fetchReply: true
  });

  // Collector for Step 1
  const collector = initialResponse.createMessageComponentCollector({
    time: 300000 // 5 minutes
  });

  let selectedCategoryId = null;
  let selectedCategoryName = null;
  let customRoleName = '';
  let selectedPermissions = [
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageThreads,
    PermissionFlagsBits.ModerateMembers
  ];

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Only the command user can interact with this wizard.', ephemeral: true });
    }

    // Handle Category Selection
    if (i.customId === 'wizard_select_category') {
      selectedCategoryId = i.values[0];
      const categoryChannel = guild.channels.cache.get(selectedCategoryId);
      selectedCategoryName = categoryChannel ? categoryChannel.name : 'Selected Category';
      customRoleName = `${selectedCategoryName} Mod`;

      // Step 2: Configure Permissions Toggle Menu
      const permSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('wizard_select_perms')
        .setPlaceholder('Select permissions to grant in this category...')
        .setMinValues(1)
        .setMaxValues(4)
        .addOptions([
          {
            label: 'Manage Channels',
            description: 'Allows editing topic & settings inside category channels',
            value: 'ManageChannels',
            default: true
          },
          {
            label: 'Manage Messages',
            description: 'Allows deleting or pinning messages inside category channels',
            value: 'ManageMessages',
            default: true
          },
          {
            label: 'Manage Threads',
            description: 'Allows archiving, deleting, and locking threads in category',
            value: 'ManageThreads',
            default: true
          },
          {
            label: 'Timeout Members',
            description: 'Allows applying disciplinary timeouts to members',
            value: 'ModerateMembers',
            default: true
          }
        ]);

      const confirmButton = new ButtonBuilder()
        .setCustomId('wizard_confirm_apply')
        .setLabel(`Create Role & Apply to "${selectedCategoryName}"`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('⚡');

      const cancelButton = new ButtonBuilder()
        .setCustomId('wizard_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const rowPerms = new ActionRowBuilder().addComponents(permSelectMenu);
      const rowButtons = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

      const step2Embed = new EmbedBuilder()
        .setTitle('🧙 Category Moderation Setup Wizard')
        .setColor('#F1C40F')
        .setDescription(`**Category Selected:** 📁 **${selectedCategoryName}**\n**Role to Create:** 🛡️ \`${customRoleName}\` (0 Global Admin Powers)\n\n**Step 2:** Select the category-specific powers to grant to this role.`)
        .addFields({
          name: 'Selected Permissions (Green Checkmarks)',
          value: '✅ Manage Channels\n✅ Manage Messages\n✅ Manage Threads\n✅ Timeout Members'
        })
        .setFooter({ text: 'Step 2 of 3 • Permission Configuration' });

      await i.update({
        embeds: [step2Embed],
        components: [rowPerms, rowButtons]
      });
    }

    // Handle Permission Selection update
    else if (i.customId === 'wizard_select_perms') {
      const selectedValues = i.values;
      const permBitMap = {
        'ManageChannels': PermissionFlagsBits.ManageChannels,
        'ManageMessages': PermissionFlagsBits.ManageMessages,
        'ManageThreads': PermissionFlagsBits.ManageThreads,
        'ModerateMembers': PermissionFlagsBits.ModerateMembers
      };

      selectedPermissions = selectedValues.map(v => permBitMap[v]);

      const updatedList = selectedValues.map(v => `✅ ${v.replace(/([A-Z])/g, ' $1').trim()}`).join('\n');

      const updatedEmbed = EmbedBuilder.from(i.message.embeds[0])
        .setFields({
          name: 'Selected Permissions (Green Checkmarks)',
          value: updatedList || 'None selected'
        });

      await i.update({ embeds: [updatedEmbed] });
    }

    // Handle Confirmation
    else if (i.customId === 'wizard_confirm_apply') {
      collector.stop('completed');

      await i.deferUpdate();

      const categoryChannel = guild.channels.cache.get(selectedCategoryId);
      if (!categoryChannel) {
        return i.followUp({ content: 'Error: Category channel no longer found.', ephemeral: true });
      }

      // Create base role
      let modRole = await guild.roles.create({
        name: customRoleName,
        color: '#3498db',
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ],
        reason: `Created via Setup Wizard for ${selectedCategoryName}`
      });

      // Apply Overwrites
      const overwriteObject = {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: true,
        [PermissionFlagsBits.ReadMessageHistory]: true,
      };

      selectedPermissions.forEach(perm => {
        overwriteObject[perm] = true;
      });

      await categoryChannel.permissionOverwrites.edit(modRole, overwriteObject, {
        reason: `Wizard permissions applied to ${selectedCategoryName}`
      });

      const finalEmbed = new EmbedBuilder()
        .setTitle('🎉 Category Setup Completed!')
        .setColor('#2ECC71')
        .setDescription(`Successfully created role **${modRole.name}** and attached permissions to category 📁 **${selectedCategoryName}**!`)
        .addFields(
          { name: 'Role Created', value: `${modRole} (0 Global Admin Powers)`, inline: true },
          { name: 'Target Category', value: `📁 **${selectedCategoryName}**`, inline: true },
          { name: 'Applied Powers', value: selectedPermissions.length > 0 ? 'Granted selected category permissions.' : 'Default access permissions.' }
        )
        .setFooter({ text: 'Wizard Complete' });

      await i.editReply({
        embeds: [finalEmbed],
        components: []
      });
    }

    else if (i.customId === 'wizard_cancel') {
      collector.stop('cancelled');
      await i.update({
        content: 'Setup wizard cancelled.',
        embeds: [],
        components: []
      });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        content: '⏰ Wizard timed out due to inactivity.',
        components: []
      }).catch(() => {});
    }
  });
}
