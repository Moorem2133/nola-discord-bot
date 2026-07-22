import { 
  SlashCommandBuilder, 
  EmbedBuilder 
} from 'discord.js';

const PAIRINGS = [
  {
    keywords: ['steak', 'beef', 'ribeye', 'brisket', 'burger', 'roast', 'lamb'],
    category: '🥩 Red Meat & Steaks',
    wine: '🍷 Cabernet Sauvignon, Syrah / Shiraz, or Malbec',
    beer: '🍺 American IPA or Imperial Stout',
    nonAlcoholic: '🥤 Sparkling Cranberry Blackberry Soda or Iced Black Tea',
    notes: 'Rich tannins in Cabernet cuts through beef fat, cleansing the palate.'
  },
  {
    keywords: ['salmon', 'trout', 'tuna', 'seafood', 'shrimp', 'fish', 'crab', 'lobster', 'sushi'],
    category: '🐟 Seafood & Fish',
    wine: '🥂 Sauvignon Blanc, Pinot Grigio, or Chardonnay',
    beer: '🍺 Belgian Witbier or Pilsner',
    nonAlcoholic: '🥤 Sparkling Citrus Lemonade or Cucumber Tonic',
    notes: 'Crisp acidity in Sauvignon Blanc complements natural seafood sweetness and rich oils.'
  },
  {
    keywords: ['pasta', 'spaghetti', 'marinara', 'lasagna', 'pizza', 'tomato', 'bolognese'],
    category: '🍝 Italian & Tomato Dishes',
    wine: '🍷 Chianti (Sangiovese) or Barbera',
    beer: '🍺 Amber Ale or Peroni Nastro Azzurro',
    nonAlcoholic: '🥤 San Pellegrino Aranciata or Iced Herbal Tea',
    notes: 'High acidity in Sangiovese pairs seamlessly with tomato acidity.'
  },
  {
    keywords: ['chicken', 'turkey', 'poultry', 'pork', 'pork chop', 'veal'],
    category: '🍗 Poultry & Pork',
    wine: '🥂 Pinot Noir, Chardonnay, or Dry Rosé',
    beer: '🍺 Saison or Wheat Beer',
    nonAlcoholic: '🥤 Apple Cider or Ginger Beer',
    notes: 'Light red or full-bodied white wine enhances roasted savory poultry flavors.'
  },
  {
    keywords: ['taco', 'curry', 'spicy', 'thai', 'mexican', 'jalapeño', 'sriracha'],
    category: '🌶️ Spicy & Bold Flavors',
    wine: '🥂 Off-Dry Riesling, Gewürztraminer, or Moscato',
    beer: '🍺 Cold Lager or Mexican Pilsner (Modelo / Pacifico)',
    nonAlcoholic: '🥤 Horchata or Mango Lassi',
    notes: 'Residual sugar and cold lagers tame capsaicin heat on the tongue.'
  },
  {
    keywords: ['chocolate', 'dessert', 'cake', 'brownie', 'ice cream', 'sweet'],
    category: '🍫 Desserts & Sweets',
    wine: '🍷 Ruby Port, Sherry, or Moscato d\'Asti',
    beer: '🍺 Milk Stout or Chocolate Porter',
    nonAlcoholic: '☕ Espresso or Cold Brew Coffee',
    notes: 'The wine should always be sweeter than the dessert itself to prevent bitterness.'
  }
];

export const data = new SlashCommandBuilder()
  .setName('pair')
  .setDescription('Get professional Wine, Beer & Beverage pairing recommendations for any dish!')
  .addStringOption(opt => opt.setName('dish').setDescription('Name of food or main ingredient (e.g. Ribeye Steak, Salmon, Tacos, Pizza)').setRequired(true));

export async function execute(interaction) {
  const dishInput = interaction.options.getString('dish').toLowerCase();

  const match = PAIRINGS.find(p => p.keywords.some(k => dishInput.includes(k))) || {
    category: `🍽️ Custom Dish: ${dishInput}`,
    wine: '🍷 Pinot Noir or Dry Rosé (Versatile all-around pairing)',
    beer: '🍺 Crisp Pale Ale or Pilsner',
    nonAlcoholic: '🥤 Sparkling Mineral Water with Lime',
    notes: 'Versatile pairings that complement a wide variety of herbs and seasonings.'
  };

  const embed = new EmbedBuilder()
    .setTitle(`🍷 Beverage Pairing: "${dishInput}"`)
    .setColor('#8e44ad')
    .addFields(
      { name: 'Food Category', value: match.category, inline: false },
      { name: '🍷 Recommended Wine', value: match.wine, inline: false },
      { name: '🍺 Recommended Craft Beer', value: match.beer, inline: false },
      { name: '🥤 Non-Alcoholic Pairing', value: match.nonAlcoholic, inline: false },
      { name: '👨‍🍳 Sommelier Note', value: `*${match.notes}*`, inline: false }
    )
    .setFooter({ text: 'Chef Chris Cody\'s Kitchen Sommelier Guide' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
