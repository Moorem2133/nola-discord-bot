import { 
  SlashCommandBuilder, 
  EmbedBuilder 
} from 'discord.js';

// Parse fractions, decimals, or whole numbers
function parseQuantity(str) {
  str = str.trim();
  // Mixed number like "1 1/2"
  if (str.includes(' ')) {
    const parts = str.split(/\s+/);
    if (parts.length === 2) {
      const whole = parseFloat(parts[0]);
      const frac = parseQuantity(parts[1]);
      return isNaN(whole) ? frac : whole + frac;
    }
  }
  // Fraction like "1/2"
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      return !isNaN(num) && !isNaN(den) && den !== 0 ? num / den : 0;
    }
  }
  return parseFloat(str) || 0;
}

// Convert decimal back to clean mixed number/fraction or decimal
function formatQuantity(val) {
  if (val <= 0) return '';
  
  // Close to integer
  if (Math.abs(val - Math.round(val)) < 0.01) {
    return Math.round(val).toString();
  }

  // Try common fractions: 1/2, 1/3, 2/3, 1/4, 3/4, 1/8, 3/8, 5/8, 7/8
  const commonFractions = [
    { frac: 0.5, text: '1/2' },
    { frac: 0.25, text: '1/4' },
    { frac: 0.75, text: '3/4' },
    { frac: 0.333, text: '1/3' },
    { frac: 0.666, text: '2/3' },
    { frac: 0.125, text: '1/8' },
    { frac: 0.375, text: '3/8' },
    { frac: 0.625, text: '5/8' },
    { frac: 0.875, text: '7/8' }
  ];

  const whole = Math.floor(val);
  const decimal = val - whole;

  if (whole > 0) {
    // Check if decimal part matches a common fraction
    for (const cf of commonFractions) {
      if (Math.abs(decimal - cf.frac) < 0.04) {
        return `${whole} ${cf.text}`;
      }
    }
    return val.toFixed(2).replace(/\.?0+$/, '');
  } else {
    for (const cf of commonFractions) {
      if (Math.abs(decimal - cf.frac) < 0.04) {
        return cf.text;
      }
    }
    return val.toFixed(2).replace(/\.?0+$/, '');
  }
}

// Main scaler logic
function scaleRecipe(recipeText, ratio) {
  // Regex to match quantity patterns: e.g. "2 1/2", "1/2", "1.5", "3"
  // Look for leading digits or fractions optionally followed by text units
  const regex = /(?:^|\n|,\s*|\(\s*)(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)/g;
  
  // To avoid matching numbers inside words (like "V8 juice" or "375F oven temp"),
  // we check the context. But for simplicity, we will replace parsed numbers on each line.
  const lines = recipeText.split('\n');
  const scaledLines = lines.map(line => {
    // Process matching number in the line
    return line.replace(/(?:^|\b)(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)(?=\b|\s)/g, (match) => {
      const q = parseQuantity(match);
      if (q > 0) {
        return formatQuantity(q * ratio);
      }
      return match;
    });
  });

  return scaledLines.join('\n');
}

export const data = new SlashCommandBuilder()
  .setName('scale')
  .setDescription('Recipe Scaler — Adjust recipe ingredient quantities to fit a target yield')
  .addStringOption(opt => 
    opt
      .setName('ingredients')
      .setDescription('Copy-paste ingredients, one per line (e.g. "2 cups flour, 1/2 tsp salt")')
      .setRequired(true)
  )
  .addNumberOption(opt => 
    opt
      .setName('from')
      .setDescription('Original serving yield (e.g. 4)')
      .setRequired(true)
  )
  .addNumberOption(opt => 
    opt
      .setName('to')
      .setDescription('Target serving yield (e.g. 6)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const ingredientsInput = interaction.options.getString('ingredients');
  const fromYield = interaction.options.getNumber('from');
  const toYield = interaction.options.getNumber('to');

  if (fromYield <= 0 || toYield <= 0) {
    return interaction.reply({ content: '❌ Yield amounts must be greater than zero.', ephemeral: true });
  }

  const ratio = toYield / fromYield;
  const scaledText = scaleRecipe(ingredientsInput, ratio);

  const embed = new EmbedBuilder()
    .setTitle('🧮 Recipe Scaling Calculator')
    .setColor('#3498db')
    .setDescription(`Scaled recipe from **${fromYield} servings** to **${toYield} servings** (Factor: **${ratio.toFixed(2)}x**):`)
    .addFields(
      { name: '🍳 Adjusted Ingredients', value: scaledText.substring(0, 2048) || 'No ingredients detected' }
    )
    .setFooter({ text: 'Chef Chris Cody\'s Kitchen Yield Scaler' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
