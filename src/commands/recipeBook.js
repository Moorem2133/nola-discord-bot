import { 
  SlashCommandBuilder, 
  EmbedBuilder 
} from 'discord.js';

// In-memory recipe store
export const guildRecipes = [];
let nextRecipeId = 1;

export const data = new SlashCommandBuilder()
  .setName('recipe-book')
  .setDescription('Shared Guild Cookbook — Share and search member-submitted recipes')
  .addSubcommand(sub =>
    sub
      .setName('share')
      .setDescription('Share a recipe with the community')
      .addStringOption(opt => opt.setName('name').setDescription('Name of the dish (e.g., Seafood Paella)').setRequired(true))
      .addStringOption(opt => opt.setName('ingredients').setDescription('List of ingredients (newline or comma separated)').setRequired(true))
      .addStringOption(opt => opt.setName('instructions').setDescription('Cooking steps / instructions').setRequired(true))
      .addStringOption(opt => opt.setName('prep_time').setDescription('Prep & cook time (e.g. 45 mins)').setRequired(false))
      .addIntegerOption(opt => opt.setName('servings').setDescription('Number of servings (e.g. 4)').setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('search')
      .setDescription('Search the cookbook for a recipe')
      .addStringOption(opt => opt.setName('query').setDescription('Search term (dish name or ingredient)').setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View a specific recipe by its ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('The recipe ID to display').setRequired(true))
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // 1. SHARE
  if (subcommand === 'share') {
    const name = interaction.options.getString('name');
    const ingredients = interaction.options.getString('ingredients');
    const instructions = interaction.options.getString('instructions');
    const prepTime = interaction.options.getString('prep_time') || 'Not specified';
    const servings = interaction.options.getInteger('servings') || null;

    const newRecipe = {
      id: nextRecipeId++,
      name,
      creator: interaction.user.tag,
      creatorId: interaction.user.id,
      ingredients,
      instructions,
      prepTime,
      servings,
      timestamp: new Date()
    };

    guildRecipes.push(newRecipe);

    const embed = new EmbedBuilder()
      .setTitle(`📖 Recipe Shared: ${name}`)
      .setColor('#2ecc71')
      .setDescription(`Successfully added **"${name}"** to the cookbook!\nUse \`/recipe-book view id: ${newRecipe.id}\` to view it.`)
      .addFields(
        { name: 'Recipe ID', value: `\`#${newRecipe.id}\``, inline: true },
        { name: 'Shared By', value: `${interaction.user}`, inline: true }
      )
      .setFooter({ text: 'Chef Chris Cody\'s Guild Cookbook' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // 2. SEARCH
  else if (subcommand === 'search') {
    const query = interaction.options.getString('query').toLowerCase();
    
    const matches = guildRecipes.filter(r => 
      r.name.toLowerCase().includes(query) || 
      r.ingredients.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      return interaction.reply({ 
        content: `🔍 No recipes matching **"${query}"** were found. Be the first to share one with \`/recipe-book share\`!`,
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Cookbook Search Results: "${query}"`)
      .setColor('#3498db')
      .setDescription(matches.slice(0, 10).map(r => `• **\`#${r.id}\` ${r.name}** — *Shared by ${r.creator}*`).join('\n'))
      .setFooter({ text: `Found ${matches.length} match(es) • Use /recipe-book view [id] to read` });

    await interaction.reply({ embeds: [embed] });
  }

  // 3. VIEW
  else if (subcommand === 'view') {
    const id = interaction.options.getInteger('id');
    const recipe = guildRecipes.find(r => r.id === id);

    if (!recipe) {
      return interaction.reply({ 
        content: `❌ Recipe with ID \`#${id}\` does not exist in the cookbook.`,
        ephemeral: true 
      });
    }

    // Format ingredients nicely if they have newlines or commas
    const formattedIngredients = recipe.ingredients
      .split(/,|\n/)
      .map(i => i.trim())
      .filter(Boolean)
      .map(i => `• ${i}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`🍳 Recipe #${recipe.id}: ${recipe.name}`)
      .setColor('#e67e22')
      .setDescription(`**Shared by:** <@${recipe.creatorId}>`)
      .addFields(
        { name: '⏱️ Prep/Cook Time', value: recipe.prepTime, inline: true },
        { name: '🍽️ Servings', value: recipe.servings ? `${recipe.servings} serving(s)` : 'Not specified', inline: true },
        { name: '🛒 Ingredients', value: formattedIngredients.substring(0, 1024) || 'None listed', inline: false },
        { name: '📜 Instructions', value: recipe.instructions.substring(0, 1024) || 'None listed', inline: false }
      )
      .setFooter({ text: 'Chef Chris Cody\'s Guild Cookbook' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
