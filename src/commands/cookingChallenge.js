import { 
  SlashCommandBuilder, 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { addXp, getChefTitle } from './kitchenXP.js';

// In-memory active challenge store
export let activeChallenge = {
  theme: 'Sautéing & Pan-searing',
  details: 'Show off your best pan-seared dish (steak, fish, tofu, or veggies). Achieve a perfect golden crust!',
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  submissions: new Map() // userId -> dishName
};

export const data = new SlashCommandBuilder()
  .setName('challenge')
  .setDescription('Weekly Cooking Challenges — Participate and earn cooking XP!')
  .addSubcommand(sub =>
    sub
      .setName('view')
      .setDescription('View the current active cooking challenge')
  )
  .addSubcommand(sub =>
    sub
      .setName('submit')
      .setDescription('Submit your entry for the active challenge to earn +50 XP!')
      .addStringOption(opt => opt.setName('dish_name').setDescription('Name of the dish you prepared').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Describe your preparation or recipe').setRequired(true))
      .addAttachmentOption(opt => opt.setName('photo').setDescription('Photo of your completed dish').setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('set')
      .setDescription('Set a new weekly cooking challenge (Admin only)')
      .addStringOption(opt => opt.setName('theme').setDescription('Theme of the challenge (e.g. Sourdough Baking)').setRequired(true))
      .addStringOption(opt => opt.setName('details').setDescription('Detailed description of requirements').setRequired(true))
      .addIntegerOption(opt => opt.setName('duration_days').setDescription('Duration in days (default: 7)').setRequired(false))
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // 1. VIEW
  if (subcommand === 'view') {
    if (!activeChallenge || !activeChallenge.theme) {
      return interaction.reply({ content: '🍽️ There is currently no active cooking challenge. Check back later!', ephemeral: true });
    }

    const formattedDate = activeChallenge.endDate ? activeChallenge.endDate.toLocaleDateString() : 'N/A';
    const totalEntries = activeChallenge.submissions ? activeChallenge.submissions.size : 0;

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Active Cooking Challenge: ${activeChallenge.theme}`)
      .setColor('#f39c12')
      .setDescription(activeChallenge.details)
      .addFields(
        { name: '📅 Ends On', value: formattedDate, inline: true },
        { name: '👥 Total Submissions', value: `${totalEntries} entry/entries`, inline: true }
      )
      .setFooter({ text: 'Use /challenge submit to participate!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // 2. SUBMIT
  else if (subcommand === 'submit') {
    if (!activeChallenge || !activeChallenge.theme) {
      return interaction.reply({ content: '❌ There is no active challenge to submit to.', ephemeral: true });
    }

    const userId = interaction.user.id;
    if (activeChallenge.submissions.has(userId)) {
      return interaction.reply({ content: '❌ You have already submitted an entry for this weekly challenge!', ephemeral: true });
    }

    const dishName = interaction.options.getString('dish_name');
    const description = interaction.options.getString('description');
    const photo = interaction.options.getAttachment('photo');

    if (!photo.contentType || !photo.contentType.startsWith('image/')) {
      return interaction.reply({ content: '❌ Please upload a valid image file of your dish.', ephemeral: true });
    }

    // Save submission
    activeChallenge.submissions.set(userId, dishName);

    // Award +50 XP
    const xpResult = addXp(userId, 50);

    const embed = new EmbedBuilder()
      .setTitle(`🎉 Challenge Entry Submitted!`)
      .setColor('#2ecc71')
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(`**${interaction.user}** entered the challenge **"${activeChallenge.theme}"**!`)
      .addFields(
        { name: 'Dish Name', value: dishName, inline: false },
        { name: 'Description/Notes', value: description, inline: false },
        { name: 'Rewards Earned', value: '⭐ **+50 Kitchen XP**', inline: true }
      )
      .setImage(photo.url)
      .setFooter({ text: `Chef Chris Cody's Kitchen Challenge • Entry #${activeChallenge.submissions.size}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Handle level up if it happened
    if (xpResult.leveledUp) {
      const title = getChefTitle(xpResult.level);
      const levelUpEmbed = new EmbedBuilder()
        .setTitle('🎉 Level Up!')
        .setColor('#f1c40f')
        .setDescription(`⭐ **${interaction.user}** has leveled up to Kitchen Level **${xpResult.level}**!\nTitle Achieved: **${title}**`)
        .setTimestamp();
      
      await interaction.followUp({ content: `${interaction.user}`, embeds: [levelUpEmbed] }).catch(() => {});
    }
  }

  // 3. SET (ADMIN ONLY)
  else if (subcommand === 'set') {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ You need the "Manage Server" permission to update cooking challenges.', ephemeral: true });
    }

    const theme = interaction.options.getString('theme');
    const details = interaction.options.getString('details');
    const durationDays = interaction.options.getInteger('duration_days') || 7;

    activeChallenge = {
      theme,
      details,
      endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      submissions: new Map()
    };

    const embed = new EmbedBuilder()
      .setTitle('📢 New Cooking Challenge Set!')
      .setColor('#9b59b6')
      .setDescription(`**Theme:** ${theme}\n\n**Instructions:**\n${details}`)
      .addFields(
        { name: '📅 Ends On', value: activeChallenge.endDate.toLocaleDateString(), inline: true },
        { name: '⏳ Duration', value: `${durationDays} day(s)`, inline: true }
      )
      .setFooter({ text: 'Get cooking! Use /challenge submit when done.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
