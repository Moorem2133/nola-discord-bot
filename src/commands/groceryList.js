import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';

// In-memory grocery list store: userId -> array of { item: string, checked: boolean }
const groceryStore = new Map();

export const data = new SlashCommandBuilder()
  .setName('grocery')
  .setDescription('Manage your personal Kitchen Grocery List')
  .addSubcommand(sub =>
    sub
      .setName('add')
      .setDescription('Add an item to your grocery list')
      .addStringOption(opt => opt.setName('item').setDescription('Ingredient or grocery item (e.g., Butter, Ribeye, Garlic)').setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View and check off items from your grocery list')
  )
  .addSubcommand(sub =>
    sub
      .setName('clear')
      .setDescription('Clear checked items or entire list')
      .addBooleanOption(opt => opt.setName('clear_all').setDescription('True to clear all items, False to clear checked items only').setRequired(true))
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;
  const list = groceryStore.get(userId) || [];

  if (subcommand === 'add') {
    const itemText = interaction.options.getString('item');
    list.push({ item: itemText, checked: false });
    groceryStore.set(userId, list);

    const embed = new EmbedBuilder()
      .setTitle('🛒 Added to Grocery List')
      .setColor('#2ecc71')
      .setDescription(`Added **"${itemText}"** to your grocery list. (${list.length} item(s) total)`)
      .setFooter({ text: 'Use /grocery view to inspect list' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  else if (subcommand === 'view') {
    if (list.length === 0) {
      return interaction.reply({ content: '🛒 Your grocery list is currently empty! Add items using `/grocery add`.', ephemeral: true });
    }

    const buildListEmbed = () => {
      const itemsFormatted = list.map((i, idx) => `${i.checked ? '~~' : ''}${idx + 1}. ${i.checked ? '✅' : '⬜'} **${i.item}**${i.checked ? '~~' : ''}`);

      return new EmbedBuilder()
        .setTitle(`🛒 ${interaction.user.username}'s Grocery List`)
        .setColor('#3498db')
        .setDescription(itemsFormatted.join('\n'))
        .setFooter({ text: 'Click item buttons below to check off ingredients!' });
    };

    const buttons = list.slice(0, 5).map((i, idx) =>
      new ButtonBuilder()
        .setCustomId(`grocery_toggle_${idx}`)
        .setLabel(`${idx + 1}. ${i.item.substring(0, 15)}`)
        .setStyle(i.checked ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    const msg = await interaction.reply({ embeds: [buildListEmbed()], components: [row], ephemeral: true, fetchReply: true });

    const collector = msg.createMessageComponentCollector({ time: 3600000 }); // 1 hour

    collector.on('collect', async i => {
      if (!i.customId.startsWith('grocery_toggle_')) return;
      const idx = parseInt(i.customId.replace('grocery_toggle_', ''), 10);
      if (list[idx]) {
        list[idx].checked = !list[idx].checked;
        groceryStore.set(userId, list);
      }

      const newButtons = list.slice(0, 5).map((item, index) =>
        new ButtonBuilder()
          .setCustomId(`grocery_toggle_${index}`)
          .setLabel(`${index + 1}. ${item.item.substring(0, 15)}`)
          .setStyle(item.checked ? ButtonStyle.Success : ButtonStyle.Secondary)
      );

      const newRow = new ActionRowBuilder().addComponents(newButtons);

      await i.update({ embeds: [buildListEmbed()], components: [newRow] });
    });
  }

  else if (subcommand === 'clear') {
    const clearAll = interaction.options.getBoolean('clear_all');

    if (clearAll) {
      groceryStore.set(userId, []);
      await interaction.reply({ content: '🧹 Cleared **all items** from your grocery list.', ephemeral: true });
    } else {
      const remaining = list.filter(i => !i.checked);
      groceryStore.set(userId, remaining);
      await interaction.reply({ content: `🧹 Cleared **checked items**. (${remaining.length} item(s) remaining).`, ephemeral: true });
    }
  }
}
