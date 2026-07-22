import { 
  SlashCommandBuilder, 
  EmbedBuilder 
} from 'discord.js';

// In-memory store for user XP & levels: userId -> { xp: number, level: number }
export const userXpStore = new Map();

// Helper to determine Chef Title based on level
export function getChefTitle(level) {
  if (level >= 50) return '👨‍🍳 Master Chef';
  if (level >= 35) return '⭐ Executive Chef';
  if (level >= 25) return '🍳 Head Chef';
  if (level >= 15) return '🔥 Sous Chef';
  if (level >= 8)  return '🔪 Chef de Partie';
  if (level >= 3)  return '🍲 Line Cook';
  return '🥗 Apprentice Cook';
}

export function addXp(userId, amount = 15) {
  const current = userXpStore.get(userId) || { xp: 0, level: 1 };
  current.xp += amount;

  const nextLevelXp = current.level * 100;
  let leveledUp = false;

  if (current.xp >= nextLevelXp) {
    current.level += 1;
    leveledUp = true;
  }

  userXpStore.set(userId, current);
  return { ...current, leveledUp };
}

export const data = new SlashCommandBuilder()
  .setName('level')
  .setDescription('Kitchen XP & Chef Rank System')
  .addSubcommand(sub =>
    sub
      .setName('rank')
      .setDescription('View your current Kitchen Rank, XP, and Chef Title')
      .addUserOption(opt => opt.setName('user').setDescription('Member to check rank for').setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('leaderboard')
      .setDescription('View the Top 10 Ranked Chefs in the server')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'rank') {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userData = userXpStore.get(targetUser.id) || { xp: 0, level: 1 };

    const title = getChefTitle(userData.level);
    const nextLevelXp = userData.level * 100;
    const progressPct = Math.min(100, Math.floor((userData.xp / nextLevelXp) * 100));
    
    // Build visual progress bar
    const barLength = 10;
    const filled = Math.floor((progressPct / 100) * barLength);
    const progressBar = '🟩'.repeat(filled) + '⬜'.repeat(barLength - filled);

    const embed = new EmbedBuilder()
      .setTitle(`🍳 Kitchen Rank: ${targetUser.username}`)
      .setColor('#f39c12')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Chef Title', value: `**${title}**`, inline: true },
        { name: 'Kitchen Level', value: `Level **${userData.level}**`, inline: true },
        { name: 'Total XP', value: `**${userData.xp}** / ${nextLevelXp} XP`, inline: true },
        { name: 'Level Progress', value: `${progressBar} (${progressPct}%)`, inline: false }
      )
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen • Chat in channels to earn XP!' });

    await interaction.reply({ embeds: [embed] });
  }

  else if (subcommand === 'leaderboard') {
    if (userXpStore.size === 0) {
      return interaction.reply('👨‍🍳 No active chef ranks recorded yet. Start chatting in channels to earn Kitchen XP!');
    }

    const sorted = Array.from(userXpStore.entries())
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    const guild = interaction.guild;
    const lines = [];

    for (let i = 0; i < sorted.length; i++) {
      const [uId, data] = sorted[i];
      const member = guild.members.cache.get(uId);
      const name = member ? member.user.tag : `User ${uId}`;
      const title = getChefTitle(data.level);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

      lines.push(`${medal} **${name}** — Level ${data.level} (${data.xp} XP) • *${title}*`);
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 Top Ranked Kitchen Chefs')
      .setColor('#f1c40f')
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Chef Chris Cody\'s Kitchen Leaderboard' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
