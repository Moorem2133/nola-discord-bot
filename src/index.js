import { Client, GatewayIntentBits, Collection, ActivityType } from 'discord.js';
import dotenv from 'dotenv';

import * as setupCategoryMod from './commands/setupCategoryMod.js';
import * as modWizard from './commands/modWizard.js';
import * as categoryStatus from './commands/categoryStatus.js';
import * as catModTools from './commands/catModTools.js';
import * as setupServerMod from './commands/setupServerMod.js';
import * as serverModTools from './commands/serverModTools.js';
import * as autoModSetup from './commands/autoModSetup.js';
import * as setupLogs from './commands/setupLogs.js';
import * as toggleCommand from './commands/toggleCommand.js';
import * as kitchenTools from './commands/kitchenTools.js';
import * as ticketSystem from './commands/ticketSystem.js';
import * as welcomeSystem from './commands/welcomeSystem.js';
import * as communityFun from './commands/communityFun.js';
import * as kitchenXP from './commands/kitchenXP.js';
import * as dishShowcase from './commands/dishShowcase.js';
import * as winePairing from './commands/winePairing.js';
import * as groceryList from './commands/groceryList.js';
import * as advancedKitchen from './commands/advancedKitchen.js';
import * as recipeBook from './commands/recipeBook.js';
import * as cookingChallenge from './commands/cookingChallenge.js';
import * as recipeScaler from './commands/recipeScaler.js';
import * as pantryManager from './commands/pantryManager.js';
import * as youtubeFeed from './commands/youtubeFeed.js';
import * as testAlerts from './commands/testAlerts.js';
import { initLiveNotifier } from './liveNotifier.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

client.commands = new Collection();

// Register command modules
const commandList = [
  setupCategoryMod, 
  modWizard, 
  categoryStatus, 
  catModTools, 
  setupServerMod, 
  serverModTools,
  autoModSetup,
  setupLogs,
  toggleCommand,
  kitchenTools,
  ticketSystem,
  welcomeSystem,
  communityFun,
  kitchenXP,
  dishShowcase,
  winePairing,
  groceryList,
  advancedKitchen,
  recipeBook,
  cookingChallenge,
  recipeScaler,
  pantryManager,
  youtubeFeed,
  testAlerts
];

for (const cmd of commandList) {
  client.commands.set(cmd.data.name, cmd);
}

client.once('ready', () => {
  console.log('----------------------------------------------------');
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`🛡️ Category Moderation Bot Ready for Server Management`);
  console.log('----------------------------------------------------');

  client.user.setActivity('Chef Chris Cody\'s Kitchen | /chef', {
    type: ActivityType.Watching
  });

  // Initialize YouTube & TikTok Live Notifier background alerts
  initLiveNotifier(client);
});

// Auto-reconnect handling for WebSocket network resets
client.on('error', error => {
  console.error('⚠️ Discord Client WebSocket Error:', error.message);
});

process.on('unhandledRejection', error => {
  console.error('⚠️ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('⚠️ Uncaught Exception:', error);
});

// Event: Message Sent (Earn XP)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  
  // Award 15 XP per message
  const result = kitchenXP.addXp(message.author.id, 15);
  
  // Send Level Up message
  if (result.leveledUp) {
    const title = kitchenXP.getChefTitle(result.level);
    const embed = new EmbedBuilder()
      .setTitle('🎉 Level Up!')
      .setColor('#f1c40f')
      .setDescription(`⭐ **${message.author}** has leveled up to Kitchen Level **${result.level}**!\nTitle Achieved: **${title}**`)
      .setTimestamp();
      
    await message.channel.send({ content: `${message.author}`, embeds: [embed] }).catch(() => {});
  }
});

// Event: New Member Joined
client.on('guildMemberAdd', async member => {
  await welcomeSystem.handleMemberJoin(member);
});

client.on('interactionCreate', async interaction => {
  // Handle Button Interactions (Tickets & Trivia)
  if (interaction.isButton()) {
    await ticketSystem.handleTicketInteraction(interaction);
    await communityFun.handleTriviaInteraction(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  // Check if command is disabled by admin
  if (toggleCommand.disabledCommands.has(interaction.commandName)) {
    return interaction.reply({
      content: `❌ The command \`/${interaction.commandName}\` has been disabled by a server administrator.`,
      ephemeral: true
    });
  }

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    const replyPayload = {
      content: '❌ There was an error executing this command.',
      ephemeral: true
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyPayload);
    } else {
      await interaction.reply(replyPayload);
    }
  }
});

// Login using DISCORD_TOKEN
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('\n⚠️ WARNING: DISCORD_TOKEN is missing in your .env file!');
  console.error('👉 Please open .env and insert your Bot Token before starting.\n');
  process.exit(1);
} else {
  client.login(token).catch(err => {
    console.error('❌ Login failed:', err.message);
  });
}
