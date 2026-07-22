import { 
  SlashCommandBuilder, 
  EmbedBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('chef')
  .setDescription('Advanced Culinary Tools (Fridge Matcher, Dinner Roulette, Dietary Filters, Coffee & Tea Sommelier)')
  .addSubcommand(sub =>
    sub
      .setName('fridge-match')
      .setDescription('Find recipes using ingredients you already have in your kitchen')
      .addStringOption(opt => opt.setName('ingredients').setDescription('Comma-separated list (e.g. Chicken, Garlic, Tomato)').setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('dinner-roulette')
      .setDescription('Spin the culinary wheel to randomly pick a dish to cook')
  )
  .addSubcommand(sub =>
    sub
      .setName('dietary')
      .setDescription('Find dishes or kitchen substitutes for specific diets or allergies')
      .addStringOption(opt =>
        opt
          .setName('type')
          .setDescription('Select diet or allergy type')
          .setRequired(true)
          .addChoices(
            { name: 'Vegan', value: 'vegan' },
            { name: 'Vegetarian', value: 'vegetarian' },
            { name: 'Keto / Low-Carb', value: 'keto' },
            { name: 'Gluten-Free', value: 'gluten-free' },
            { name: 'Egg Substitute Guide', value: 'sub-egg' },
            { name: 'Dairy Substitute Guide', value: 'sub-dairy' }
          )
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('brew')
      .setDescription('Coffee & Tea brewing sommelier guide (water temperature, steep times, ratios)')
      .addStringOption(opt =>
        opt
          .setName('type')
          .setDescription('Select beverage type')
          .setRequired(true)
          .addChoices(
            { name: 'French Press Coffee', value: 'french-press' },
            { name: 'Pour Over Coffee', value: 'pour-over' },
            { name: 'Espresso', value: 'espresso' },
            { name: 'Cold Brew Coffee', value: 'cold-brew' },
            { name: 'Green Tea', value: 'green-tea' },
            { name: 'Black Tea / Earl Grey', value: 'black-tea' },
            { name: 'Herbal / Chamomile Tea', value: 'herbal-tea' }
          )
      )
  );

const ROULETTE_DISHES = [
  { name: "🍝 Spaghetti Carbonara", cuisine: "Italian", time: "20 mins", difficulty: "Medium" },
  { name: "🌮 Street Tacos (Carne Asada)", cuisine: "Mexican", time: "30 mins", difficulty: "Easy" },
  { name: "🥩 Reverse-Seared Ribeye Steak", cuisine: "American", time: "45 mins", difficulty: "Medium" },
  { name: "🍜 Rich Pork Tonkotsu Ramen", cuisine: "Japanese", time: "4+ hours", difficulty: "Hard" },
  { name: "🍛 Chicken Tikka Masala", cuisine: "Indian", time: "40 mins", difficulty: "Medium" },
  { name: "🍔 Smash Burgers with Caramelized Onions", cuisine: "American", time: "15 mins", difficulty: "Easy" },
  { name: "🥘 Seafood Paella", cuisine: "Spanish", time: "50 mins", difficulty: "Hard" },
  { name: "🍣 Homemade Sushi Rolls (Maki)", cuisine: "Japanese", time: "60 mins", difficulty: "Hard" },
  { name: "🍗 Smoked BBQ Pulled Pork", cuisine: "American BBQ", time: "8+ hours", difficulty: "Medium" }
];

const DIETARY_INFO = {
  vegan: {
    title: "🌱 Vegan Dishes & Tips",
    color: "#2ecc71",
    recipes: "• Chickpea Coconut Curry\n• Vegan Mushroom Risotto\n• Tofu Pad Thai\n• Avocado Pesto Pasta",
    tips: "Use Nutritional Yeast for cheesy flavor, Maple Syrup instead of honey, and Flaxseed Meal for baking binders."
  },
  vegetarian: {
    title: "🥗 Vegetarian Dishes & Tips",
    color: "#2ecc71",
    recipes: "• Eggplant Parmesan\n• Spinach & Feta Quiche\n• Roasted Vegetable Lasagna\n• Black Bean Quesadillas",
    tips: "Ensure cheeses are made with microbial/vegetable rennet rather than animal rennet."
  },
  keto: {
    title: "🥩 Keto & Low-Carb Guide",
    color: "#f1c40f",
    recipes: "• Bacon-Wrapped Garlic Chicken\n• Cauliflower Mac & Cheese\n• Butter-Poached Ribeye\n• Garlic Butter Salmon & Asparagus",
    tips: "Keep carbs under 20-50g per day. Focus on quality fats (olive oil, grass-fed butter, avocados) and protein."
  },
  'gluten-free': {
    title: "🌾 Gluten-Free Guide",
    color: "#3498db",
    recipes: "• Lemon Herb Grilled Chicken\n• Quinoa Salad Bowls\n• Corn Tortilla Tacos\n• Almond Flour Chocolate Brownies",
    tips: "Always check labels for hidden gluten in soy sauce, salad dressings, and thickeners (use cornstarch or arrowroot)."
  },
  'sub-egg': {
    title: "🥚 Egg Substitute Guide (Baking & Cooking)",
    color: "#e67e22",
    recipes: "• **1 Egg = 1 tbsp Flaxseed + 3 tbsp Water** (Nutty flavor, great for muffins/cookies)\n• **1 Egg = 1/4 cup Applesauce** (Moisture, great for cakes)\n• **1 Egg = 1/4 cup Aquafaba** (Chickpea liquid, whips like egg whites)\n• **1 Egg = 1/4 cup Mashed Banana** (Great binding & sweetness)",
    tips: "Choose the substitute based on whether you need binding, rise, or moisture in your recipe."
  },
  'sub-dairy': {
    title: "🥛 Dairy Substitute Guide",
    color: "#9b59b6",
    recipes: "• **Milk** ➔ Almond Milk (Light), Oat Milk (Creamy), Coconut Milk (Rich)\n• **Butter** ➔ Coconut Oil, Vegan Butter, Avocado Oil\n• **Heavy Cream** ➔ Coconut Cream (Chilled coconut milk top layer), Cashew Cream\n• **Cheese** ➔ Nutritional Yeast (For sauces), Cashew-based cheese blocks",
    tips: "Oat milk is the most neutral-tasting substitute for baking, while coconut cream is best for rich sauces."
  }
};

const BREW_GUIDES = {
  'french-press': {
    title: "☕ French Press Coffee Guide",
    ratio: "1:15 (e.g. 30g coffee to 450g water)",
    temp: "195°F - 200°F (Let boil rest 30s)",
    grind: "Coarse (like sea salt)",
    time: "4 Minutes total brew time",
    steps: "1. Add coffee, pour water to wet grounds.\n2. Stir gently after 1 min.\n3. Place plunger lid, steep until 4:00.\n4. Press down slowly and decant immediately."
  },
  'pour-over': {
    title: "☕ Pour Over Coffee Guide (V60 / Chemex)",
    ratio: "1:16 (e.g. 25g coffee to 400g water)",
    temp: "200°F - 205°F",
    grind: "Medium-Coarse (like sand)",
    time: "3 Minutes total brew time",
    steps: "1. Rinse paper filter with hot water.\n2. Add coffee, bloom with 50g water for 30s.\n3. Pour water in slow concentric circles.\n4. Aim to finish all pouring by 2:30."
  },
  'espresso': {
    title: "☕ Espresso Extraction Guide",
    ratio: "1:2 (e.g. 18g coffee ground in, 36g liquid out)",
    temp: "198°F - 202°F",
    grind: "Fine (like flour)",
    time: "25 - 30 Seconds pull time",
    steps: "1. Distribute grounds evenly in portafilter.\n2. Tamp firmly and level.\n3. Lock in group head and start shot immediately.\n4. Flow should look like warm honey."
  },
  'cold-brew': {
    title: "☕ Cold Brew Coffee Concentrate",
    ratio: "1:4 or 1:5 (e.g. 100g coffee to 400-500g room temp water)",
    temp: "Room Temperature / Steeled Cold",
    grind: "Extra Coarse",
    time: "12 - 18 Hours steep time",
    steps: "1. Mix coffee and water in jar.\n2. Seal and let steep at room temp or fridge.\n3. Filter through paper filter or mesh.\n4. Dilute concentrate 1:1 with water or milk."
  },
  'green-tea': {
    title: "🍵 Green Tea Steeping Guide",
    ratio: "1 tsp loose leaf per 8oz cup",
    temp: "175°F - 180°F (Do not use boiling water, it burns leaves!)",
    grind: "Whole Leaf",
    time: "2 - 3 Minutes (Steeping longer makes it bitter)",
    steps: "1. Heat water to 175°F.\n2. Pour over green tea leaves.\n3. Steep for exactly 2 minutes and remove leaves."
  },
  'black-tea': {
    title: "☕ Black Tea & Earl Grey Guide",
    ratio: "1 tsp loose leaf per 8oz cup",
    temp: "205°F - 212°F (Boiling water)",
    grind: "Whole Leaf / Broken",
    time: "3 - 5 Minutes",
    steps: "1. Pour rolling boiling water directly over leaves.\n2. Let steep for 4 minutes.\n3. Remove leaves and serve with milk or lemon if desired."
  },
  'herbal-tea': {
    title: "🌼 Chamomile & Herbal Tea Guide",
    ratio: "1-2 tsp loose herbs per 8oz cup",
    temp: "208°F - 212°F (Boiling water)",
    grind: "Dried botanicals",
    time: "5 - 10 Minutes",
    steps: "1. Herbal teas require longer steep times to extract oils.\n2. Steep covered to trap aromas.\n3. Serve hot with honey."
  }
};

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // 1. Fridge Matcher
  if (subcommand === 'fridge-match') {
    const ingredientInput = interaction.options.getString('ingredients');
    await interaction.deferReply();

    try {
      const list = ingredientInput.split(',').map(i => i.trim());
      const mainIngredient = list[0];

      // Fetch from MealDB filter by ingredient
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(mainIngredient)}`);
      const data = await res.json();

      if (!data.meals || data.meals.length === 0) {
        return interaction.editReply({ content: `🍳 No recipes matched the main ingredient: **"${mainIngredient}"**. Try using ingredients like *Chicken*, *Beef*, *Tomato*, *Salmon*, *Eggs*, or *Potato*!` });
      }

      const matchingMeals = data.meals.slice(0, 5);
      const lines = matchingMeals.map((m, idx) => `${idx + 1}. **${m.strMeal}**`);

      const embed = new EmbedBuilder()
        .setTitle('🍳 Fridge Matcher Recipes')
        .setColor('#2ecc71')
        .setDescription(`Found recipes matching your ingredients (**${list.join(', ')}**):`)
        .addFields({
          name: `Top Matches containing "${mainIngredient}"`,
          value: lines.join('\n') + `\n\n*Use \`/kitchen recipe\` with the dish name to view the full recipe!*`
        })
        .setFooter({ text: 'Chef Chris Cody\'s Kitchen Matcher' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Fridge matcher error:', err);
      await interaction.editReply({ content: `❌ Error searching ingredients: ${err.message}` });
    }
  }

  // 2. Dinner Roulette
  else if (subcommand === 'dinner-roulette') {
    await interaction.reply({ content: '🎰 *Spinning the culinary wheel...*' });

    setTimeout(async () => {
      const rolled = ROULETTE_DISHES[Math.floor(Math.random() * ROULETTE_DISHES.length)];

      const embed = new EmbedBuilder()
        .setTitle('🎰 Dinner Roulette Winner!')
        .setColor('#e74c3c')
        .setDescription(`The wheel landed on: **${rolled.name}**!`)
        .addFields(
          { name: 'Cuisine', value: rolled.cuisine, inline: true },
          { name: 'Prep Time', value: rolled.time, inline: true },
          { name: 'Difficulty', value: rolled.difficulty, inline: true }
        )
        .setFooter({ text: 'Chef Chris Cody\'s Kitchen • Spin again if you are still hungry!' })
        .setTimestamp();

      await interaction.editReply({ content: '🎉 Spin complete!', embeds: [embed] });
    }, 1500);
  }

  // 3. Dietary Info
  else if (subcommand === 'dietary') {
    const selected = interaction.options.getString('type');
    const info = DIETARY_INFO[selected];

    const embed = new EmbedBuilder()
      .setTitle(info.title)
      .setColor(info.color)
      .addFields(
        { name: '🍽️ Recommended Recipes / Items', value: info.recipes, inline: false },
        { name: '💡 Pro Chef Substitutes & Tips', value: info.tips, inline: false }
      )
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen dietary guidelines' });

    await interaction.reply({ embeds: [embed] });
  }

  // 4. Brew Guide
  else if (subcommand === 'brew') {
    const type = interaction.options.getString('type');
    const guide = BREW_GUIDES[type];

    const embed = new EmbedBuilder()
      .setTitle(guide.title)
      .setColor('#6f4e37')
      .addFields(
        { name: '⚖️ Water/Coffee Ratio', value: guide.ratio, inline: true },
        { name: '🌡️ Temperature', value: guide.temp, inline: true },
        { name: '⚙️ Grind size', value: guide.grind, inline: true },
        { name: '⏱️ Brew Time', value: guide.time, inline: false },
        { name: '📜 Instructions', value: guide.steps, inline: false }
      )
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen Sommelier Brew Guide' });

    await interaction.reply({ embeds: [embed] });
  }
}
