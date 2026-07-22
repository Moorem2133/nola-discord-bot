import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('fun')
  .setDescription('Community Games & Tools (Food Trivia, Custom Polls)')
  .addSubcommand(sub =>
    sub
      .setName('food-trivia')
      .setDescription('Test your culinary knowledge with a food trivia question')
  )
  .addSubcommand(sub =>
    sub
      .setName('poll')
      .setDescription('Create an interactive poll in this channel')
      .addStringOption(opt => opt.setName('question').setDescription('The poll question').setRequired(true))
      .addStringOption(opt => opt.setName('option1').setDescription('Option 1').setRequired(true))
      .addStringOption(opt => opt.setName('option2').setDescription('Option 2').setRequired(true))
      .addStringOption(opt => opt.setName('option3').setDescription('Option 3').setRequired(false))
      .addStringOption(opt => opt.setName('option4').setDescription('Option 4').setRequired(false))
  );

const TRIVIA_QUESTIONS = [
  {
    question: "Which country is the origin of the sauce 'Béchamel'?",
    options: ["Italy", "France", "Spain", "Greece"],
    correctIndex: 1,
    explanation: "Béchamel is one of the five French mother sauces, created in 17th-century France."
  },
  {
    question: "What type of pasta translates to 'little ribbons' in Italian?",
    options: ["Penne", "Fettuccine", "Farfalle", "Rigatoni"],
    correctIndex: 1,
    explanation: "'Fettuccine' literally translates to 'little ribbons' in Italian."
  },
  {
    question: "Which spice is derived from the dried stigma of the Crocus sativus flower?",
    options: ["Turmeric", "Paprika", "Saffron", "Cardamom"],
    correctIndex: 2,
    explanation: "Saffron comes from the hand-harvested stigmas of the autumn crocus flower."
  },
  {
    question: "What key ingredient gives Traditional Gumbo its signature dark brown color and rich nutty flavor?",
    options: ["Tomato Paste", "Dark Roux", "Soy Sauce", "Molasses"],
    correctIndex: 1,
    explanation: "A dark roux (flour cooked slowly in oil to a chocolate brown) is the foundation of authentic Louisiana gumbo."
  }
];

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // 1. Food Trivia
  if (subcommand === 'food-trivia') {
    const qIndex = Math.floor(Math.random() * TRIVIA_QUESTIONS.length);
    const qData = TRIVIA_QUESTIONS[qIndex];

    const embed = new EmbedBuilder()
      .setTitle('🧠 Food & Cooking Trivia')
      .setColor('#f39c12')
      .setDescription(`**Question:**\n${qData.question}`)
      .setFooter({ text: 'Click your answer button below!' });

    const buttons = qData.options.map((opt, idx) =>
      new ButtonBuilder()
        .setCustomId(`trivia_ans_${qIndex}_${idx}`)
        .setLabel(`${idx + 1}. ${opt}`)
        .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // 2. Interactive Poll
  else if (subcommand === 'poll') {
    const question = interaction.options.getString('question');
    const opt1 = interaction.options.getString('option1');
    const opt2 = interaction.options.getString('option2');
    const opt3 = interaction.options.getString('option3');
    const opt4 = interaction.options.getString('option4');

    const options = [opt1, opt2, opt3, opt4].filter(Boolean);

    const votes = new Array(options.length).fill(0);
    const voters = new Map(); // userId -> optionIndex

    const generatePollEmbed = () => {
      const totalVotes = votes.reduce((a, b) => a + b, 0);
      const fields = options.map((opt, i) => {
        const count = votes[i];
        const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(0) : 0;
        return {
          name: `Option ${i + 1}: ${opt}`,
          value: `📊 **${count} vote(s)** (${pct}%)`,
          inline: true
        };
      });

      return new EmbedBuilder()
        .setTitle(`📊 Poll: ${question}`)
        .setColor('#3498db')
        .addFields(fields)
        .setFooter({ text: `Total Votes: ${totalVotes} • Poll created by ${interaction.user.tag}` })
        .setTimestamp();
    };

    const buttons = options.map((opt, idx) =>
      new ButtonBuilder()
        .setCustomId(`poll_vote_${idx}`)
        .setLabel(`${idx + 1}. ${opt}`)
        .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    const pollMsg = await interaction.reply({ embeds: [generatePollEmbed()], components: [row], fetchReply: true });

    const collector = pollMsg.createMessageComponentCollector({ time: 86400000 }); // 24 hours

    collector.on('collect', async i => {
      if (!i.customId.startsWith('poll_vote_')) return;

      const selectedOptIdx = parseInt(i.customId.replace('poll_vote_', ''), 10);
      const userId = i.user.id;

      if (voters.has(userId)) {
        const prevOpt = voters.get(userId);
        votes[prevOpt]--;
      }

      voters.set(userId, selectedOptIdx);
      votes[selectedOptIdx]++;

      await i.update({ embeds: [generatePollEmbed()] });
    });
  }
}

// Trivia Button Handler
export async function handleTriviaInteraction(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('trivia_ans_')) return;

  const [_, __, qIdxStr, chosenIdxStr] = interaction.customId.split('_');
  const qIdx = parseInt(qIdxStr, 10);
  const chosenIdx = parseInt(chosenIdxStr, 10);

  const qData = TRIVIA_QUESTIONS[qIdx];
  const isCorrect = chosenIdx === qData.correctIndex;

  const resultEmbed = new EmbedBuilder()
    .setTitle(isCorrect ? '🎉 Correct!' : '❌ Incorrect!')
    .setColor(isCorrect ? '#2ecc71' : '#e74c3c')
    .setDescription(`**Question:** ${qData.question}\n\n**Your Answer:** ${qData.options[chosenIdx]}\n**Correct Answer:** ${qData.options[qData.correctIndex]}\n\nℹ️ *${qData.explanation}*`)
    .setFooter({ text: `Answered by ${interaction.user.tag}` });

  await interaction.reply({ embeds: [resultEmbed], ephemeral: true });
}
