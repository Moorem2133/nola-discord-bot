import { 
  SlashCommandBuilder, 
  EmbedBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('kitchen')
  .setDescription('Kitchen & Culinary Tools (Recipe Search, Measurement Converter, Kitchen Timer, Chef Tips)')
  .addSubcommand(sub =>
    sub
      .setName('recipe')
      .setDescription('Search for a cooking recipe')
      .addStringOption(opt => opt.setName('query').setDescription('Dish or ingredient (e.g., Pasta, Steak, Gumbo)').setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('converter')
      .setDescription('Convert kitchen measurements (Volume, Weight, Temperature)')
      .addNumberOption(opt => opt.setName('value').setDescription('Amount to convert (e.g. 2)').setRequired(true))
      .addStringOption(opt =>
        opt
          .setName('from')
          .setDescription('Original unit')
          .setRequired(true)
          .addChoices(
            { name: 'Cups', value: 'cups' },
            { name: 'Tablespoons (tbsp)', value: 'tbsp' },
            { name: 'Teaspoons (tsp)', value: 'tsp' },
            { name: 'Fluid Ounces (fl oz)', value: 'floz' },
            { name: 'Milliliters (mL)', value: 'ml' },
            { name: 'Grams (g)', value: 'g' },
            { name: 'Ounces (oz)', value: 'oz' },
            { name: 'Pounds (lbs)', value: 'lbs' },
            { name: 'Fahrenheit (°F)', value: 'f' },
            { name: 'Celsius (°C)', value: 'c' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('timer')
      .setDescription('Set a kitchen cooking timer in this channel')
      .addIntegerOption(opt => opt.setName('minutes').setDescription('Timer duration in minutes (1-180)').setMinValue(1).setMaxValue(180).setRequired(true))
      .addStringOption(opt => opt.setName('dish').setDescription('Name of dish or item (e.g., Steak Rest, Bread Oven)').setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('chef-tip')
      .setDescription('Get a pro kitchen tip or culinary secret')
  );

const CHEF_TIPS = [
  "🔪 **Sharpen Your Knives**: A dull knife is far more dangerous than a sharp one because it slips instead of cuts.",
  "🧂 **Salt Early and Often**: Season your ingredients in layers throughout the cooking process, not just at the end.",
  "🥩 **Rest Your Meat**: Always let steaks and roasts rest for 5–10 minutes after cooking to allow juices to redistribute.",
  "🧈 **Use Cold Butter for Sauces**: Swirl cold butter into a sauce right before serving to create a rich, glossy finish (monte au beurre).",
  "🧄 **Mince Garlic Fresh**: Pre-minced jarred garlic loses its aromatic essential oils. Fresh garlic brings unmatched flavor.",
  "🍳 **Preheat Your Pan**: Preheat your skillet before adding oil to prevent food from sticking.",
  "🍋 **Balance with Acid**: If a dish tastes flat or overly salty, add a splash of lemon juice or vinegar to brighten the flavor.",
  "🥔 **Salt Your Pasta Water**: Pasta water should taste like mild sea water. It seasons the pasta from the inside out."
];

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // 1. Recipe Search
  if (subcommand === 'recipe') {
    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      // Use TheMealDB API for live recipe search
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!data.meals || data.meals.length === 0) {
        return interaction.editReply({ content: `🍳 No recipes found for **"${query}"**. Try searching for dishes like *Chicken*, *Pasta*, *Risotto*, or *Gumbo*!` });
      }

      const recipe = data.meals[0];

      // Extract ingredients
      const ingredients = [];
      for (let i = 1; i <= 20; i++) {
        const ing = recipe[`strIngredient${i}`];
        const measure = recipe[`strMeasure${i}`];
        if (ing && ing.trim()) {
          ingredients.push(`• **${ing.trim()}**: ${measure ? measure.trim() : 'to taste'}`);
        }
      }

      const instructions = recipe.strInstructions.length > 800 
        ? recipe.strInstructions.substring(0, 800) + '...\n*(Instructions truncated for Discord readability)*'
        : recipe.strInstructions;

      const embed = new EmbedBuilder()
        .setTitle(`👨‍🍳 ${recipe.strMeal}`)
        .setURL(recipe.strSource || recipe.strYoutube || 'https://www.themealdb.com')
        .setColor('#e67e22')
        .setThumbnail(recipe.strMealThumb)
        .addFields(
          { name: 'Category & Cuisine', value: `📁 ${recipe.strCategory} | 🌍 ${recipe.strArea}`, inline: true },
          { name: '🛒 Ingredients', value: ingredients.slice(0, 10).join('\n') || 'See instructions', inline: false },
          { name: '📜 Instructions', value: instructions, inline: false }
        )
        .setFooter({ text: 'Chef Chris Cody\'s Kitchen • Recipe Finder' })
        .setTimestamp();

      if (recipe.strYoutube) {
        embed.addFields({ name: '🎥 Video Tutorial', value: `[Watch on YouTube](${recipe.strYoutube})`, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Recipe search error:', err);
      await interaction.editReply({ content: `❌ Error fetching recipe: ${err.message}` });
    }
  }

  // 2. Unit Converter
  else if (subcommand === 'converter') {
    const val = interaction.options.getNumber('value');
    const from = interaction.options.getString('from');

    let results = [];

    switch (from) {
      case 'cups':
        results.push(`${(val * 236.588).toFixed(1)} mL`);
        results.push(`${(val * 16).toFixed(1)} tbsp`);
        results.push(`${(val * 8).toFixed(1)} fl oz`);
        break;
      case 'tbsp':
        results.push(`${(val * 3).toFixed(1)} tsp`);
        results.push(`${(val * 14.787).toFixed(1)} mL`);
        results.push(`${(val / 16).toFixed(2)} cups`);
        break;
      case 'tsp':
        results.push(`${(val / 3).toFixed(2)} tbsp`);
        results.push(`${(val * 4.929).toFixed(1)} mL`);
        break;
      case 'floz':
        results.push(`${(val * 29.574).toFixed(1)} mL`);
        results.push(`${(val / 8).toFixed(2)} cups`);
        break;
      case 'ml':
        results.push(`${(val / 236.588).toFixed(2)} cups`);
        results.push(`${(val / 14.787).toFixed(1)} tbsp`);
        results.push(`${(val / 29.574).toFixed(1)} fl oz`);
        break;
      case 'g':
        results.push(`${(val / 28.3495).toFixed(2)} oz`);
        results.push(`${(val / 453.592).toFixed(3)} lbs`);
        break;
      case 'oz':
        results.push(`${(val * 28.3495).toFixed(1)} g`);
        results.push(`${(val / 16).toFixed(2)} lbs`);
        break;
      case 'lbs':
        results.push(`${(val * 453.592).toFixed(1)} g`);
        results.push(`${(val * 16).toFixed(1)} oz`);
        break;
      case 'f':
        results.push(`${(((val - 32) * 5) / 9).toFixed(1)} °C`);
        break;
      case 'c':
        results.push(`${((val * 9) / 5 + 32).toFixed(1)} °F`);
        break;
    }

    const embed = new EmbedBuilder()
      .setTitle('⚖️ Kitchen Measurement Converter')
      .setColor('#3498db')
      .addFields(
        { name: 'Input', value: `**${val} ${from.toUpperCase()}**`, inline: true },
        { name: 'Conversions', value: results.map(r => `• **${r}**`).join('\n'), inline: true }
      )
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen' });

    await interaction.reply({ embeds: [embed] });
  }

  // 3. Kitchen Timer
  else if (subcommand === 'timer') {
    const mins = interaction.options.getInteger('minutes');
    const dish = interaction.options.getString('dish') || 'Cooking Item';

    const embed = new EmbedBuilder()
      .setTitle('⏱️ Kitchen Timer Set')
      .setColor('#f1c40f')
      .setDescription(`Timer active for **${dish}**! Will alert in **${mins} minute(s)**.`)
      .setFooter({ text: `Set by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    setTimeout(async () => {
      const alertEmbed = new EmbedBuilder()
        .setTitle('🔔 TIMER COMPLETE!')
        .setColor('#e74c3c')
        .setDescription(`⏰ **${interaction.user}**, your timer for **${dish}** (${mins} mins) is done!`)
        .setTimestamp();

      await interaction.channel.send({ content: `${interaction.user}`, embeds: [alertEmbed] }).catch(() => {});
    }, mins * 60 * 1000);
  }

  // 4. Chef Tip
  else if (subcommand === 'chef-tip') {
    const randomTip = CHEF_TIPS[Math.floor(Math.random() * CHEF_TIPS.length)];
    const embed = new EmbedBuilder()
      .setTitle('👨‍🍳 Pro Chef Tip')
      .setColor('#9b59b6')
      .setDescription(randomTip)
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen Secrets' });

    await interaction.reply({ embeds: [embed] });
  }
}
