import { 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

// In-memory pantry store: userId -> array of strings
export const pantryStore = new Map();

export const data = new SlashCommandBuilder()
  .setName('pantry')
  .setDescription('Virtual Pantry Manager — Keep track of ingredients in your cupboard & match recipes')
  .addSubcommand(sub =>
    sub
      .setName('add')
      .setDescription('Add an ingredient to your virtual pantry')
      .addStringOption(opt => opt.setName('item').setDescription('Ingredient to add (e.g. Chicken, Basil, Onion)').setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View your pantry and remove items')
  )
  .addSubcommand(sub =>
    sub
      .setName('match')
      .setDescription('Find recipes matching the first ingredient in your pantry')
  )
  .addSubcommand(sub =>
    sub
      .setName('clear')
      .setDescription('Clear all items from your pantry')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;
  let list = pantryStore.get(userId) || [];

  // 1. ADD
  if (subcommand === 'add') {
    const item = interaction.options.getString('item').trim();
    list.push(item);
    pantryStore.set(userId, list);

    const embed = new EmbedBuilder()
      .setTitle('🥫 Added to Virtual Pantry')
      .setColor('#2ecc71')
      .setDescription(`Added **"${item}"** to your virtual pantry. You now have **${list.length}** item(s).`)
      .setFooter({ text: 'Use /pantry view to check inventory' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // 2. VIEW (INTERACTIVE BUTTONS)
  else if (subcommand === 'view') {
    if (list.length === 0) {
      return interaction.reply({ content: '🥫 Your virtual pantry is empty! Add ingredients using `/pantry add`.', ephemeral: true });
    }

    const buildPantryEmbed = () => {
      const itemsFormatted = list.map((item, idx) => `• **${idx + 1}. ${item}**`);
      return new EmbedBuilder()
        .setTitle(`🥫 ${interaction.user.username}'s Virtual Pantry`)
        .setColor('#3498db')
        .setDescription(itemsFormatted.join('\n') || 'No items')
        .setFooter({ text: 'Click an item button below to remove it from your pantry.' });
    };

    const buttons = list.slice(0, 5).map((item, idx) =>
      new ButtonBuilder()
        .setCustomId(`pantry_remove_${idx}`)
        .setLabel(`Remove ${idx + 1}`)
        .setStyle(ButtonStyle.Danger)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    const msg = await interaction.reply({ 
      embeds: [buildPantryEmbed()], 
      components: list.length > 0 ? [row] : [], 
      ephemeral: true, 
      fetchReply: true 
    });

    const collector = msg.createMessageComponentCollector({ time: 3600000 }); // 1 hour

    collector.on('collect', async i => {
      if (!i.customId.startsWith('pantry_remove_')) return;
      const idx = parseInt(i.customId.replace('pantry_remove_', ''), 10);
      
      // Update list
      if (list[idx]) {
        list.splice(idx, 1);
        pantryStore.set(userId, list);
      }

      const newButtons = list.slice(0, 5).map((item, index) =>
        new ButtonBuilder()
          .setCustomId(`pantry_remove_${index}`)
          .setLabel(`Remove ${index + 1}`)
          .setStyle(ButtonStyle.Danger)
      );

      const newRow = new ActionRowBuilder().addComponents(newButtons);

      await i.update({ 
        embeds: [buildPantryEmbed()], 
        components: list.length > 0 ? [newRow] : [] 
      });
    });
  }

  // 3. MATCH (MEALDB SEARCH USING PANTRY INGREDIENTS)
  else if (subcommand === 'match') {
    if (list.length === 0) {
      return interaction.reply({ content: '❌ Add ingredients to your pantry first with `/pantry add` before matching.', ephemeral: true });
    }

    await interaction.deferReply();
    const mainIngredient = list[0]; // Match against the first ingredient in the pantry

    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(mainIngredient)}`);
      const data = await res.json();

      if (!data.meals || data.meals.length === 0) {
        return interaction.editReply({ 
          content: `🍳 No recipes matched the main ingredient in your pantry: **"${mainIngredient}"**. Try adding ingredients like *Chicken*, *Beef*, *Tomato*, *Salmon*, *Eggs*, or *Potato*!` 
        });
      }

      const matchingMeals = data.meals.slice(0, 5);
      const lines = matchingMeals.map((m, idx) => `${idx + 1}. **${m.strMeal}**`);

      const embed = new EmbedBuilder()
        .setTitle('🍳 Pantry Matcher Suggestions')
        .setColor('#2ecc71')
        .setDescription(`Found recipes matching your pantry ingredient (**${mainIngredient}**):`)
        .addFields({
          name: `Top Matches containing "${mainIngredient}"`,
          value: lines.join('\n') + `\n\n*Use \`/kitchen recipe\` with the dish name to view the full recipe!*`
        })
        .setFooter({ text: 'Chef Chris Cody\'s Pantry Matcher' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Pantry matcher error:', err);
      await interaction.editReply({ content: `❌ Error searching pantry ingredients: ${err.message}` });
    }
  }

  // 4. CLEAR
  else if (subcommand === 'clear') {
    pantryStore.set(userId, []);
    await interaction.reply({ content: '🧹 Cleared all items from your virtual pantry.', ephemeral: true });
  }
}
