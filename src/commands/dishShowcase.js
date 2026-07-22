import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('submit-dish')
  .setDescription('Submit a home-cooked dish for community review & 5-star ratings!')
  .addStringOption(opt => opt.setName('dish_name').setDescription('Name of your dish (e.g. Smoked Pork Ribs)').setRequired(true))
  .addStringOption(opt => opt.setName('description').setDescription('Brief description or recipe notes').setRequired(true))
  .addAttachmentOption(opt => opt.setName('photo').setDescription('Photo of your cooked dish').setRequired(true));

export async function execute(interaction) {
  const dishName = interaction.options.getString('dish_name');
  const description = interaction.options.getString('description');
  const photo = interaction.options.getAttachment('photo');

  if (!photo.contentType || !photo.contentType.startsWith('image/')) {
    return interaction.reply({ content: `❌ Please attach a valid image file (JPG, PNG, WEBP).`, ephemeral: true });
  }

  const ratings = new Map(); // userId -> score (1-5)

  const buildDishEmbed = () => {
    const totalVotes = ratings.size;
    let avg = 0;
    if (totalVotes > 0) {
      const sum = Array.from(ratings.values()).reduce((a, b) => a + b, 0);
      avg = (sum / totalVotes).toFixed(1);
    }

    const stars = '⭐'.repeat(Math.round(avg)) || 'Unrated';

    return new EmbedBuilder()
      .setTitle(`📸 Dish Showcase: ${dishName}`)
      .setColor('#e67e22')
      .setDescription(`**Prepared by:** ${interaction.user}\n\n**Notes:**\n${description}`)
      .setImage(photo.url)
      .addFields(
        { name: 'Community Rating', value: `**${avg} / 5.0** (${stars})\n*${totalVotes} vote(s)*`, inline: true }
      )
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen • Click a star button to rate this dish!' })
      .setTimestamp();
  };

  const buttons = [1, 2, 3, 4, 5].map(score =>
    new ButtonBuilder()
      .setCustomId(`rate_dish_${score}`)
      .setLabel(`${score} ⭐`)
      .setStyle(ButtonStyle.Secondary)
  );

  const row = new ActionRowBuilder().addComponents(buttons);

  const msg = await interaction.reply({ embeds: [buildDishEmbed()], components: [row], fetchReply: true });

  const collector = msg.createMessageComponentCollector({ time: 604800000 }); // 7 days

  collector.on('collect', async i => {
    if (!i.customId.startsWith('rate_dish_')) return;

    const score = parseInt(i.customId.replace('rate_dish_', ''), 10);
    ratings.set(i.user.id, score);

    await i.update({ embeds: [buildDishEmbed()] });
  });
}
