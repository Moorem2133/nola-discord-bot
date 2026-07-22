import { REST, Routes } from 'discord.js';
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

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in .env file!');
  process.exit(1);
}

const commands = [
  setupCategoryMod.data.toJSON(),
  modWizard.data.toJSON(),
  categoryStatus.data.toJSON(),
  catModTools.data.toJSON(),
  setupServerMod.data.toJSON(),
  serverModTools.data.toJSON(),
  autoModSetup.data.toJSON(),
  setupLogs.data.toJSON(),
  toggleCommand.data.toJSON(),
  kitchenTools.data.toJSON(),
  ticketSystem.data.toJSON(),
  welcomeSystem.data.toJSON(),
  communityFun.data.toJSON(),
  kitchenXP.data.toJSON(),
  dishShowcase.data.toJSON(),
  winePairing.data.toJSON(),
  groceryList.data.toJSON(),
  advancedKitchen.data.toJSON(),
  recipeBook.data.toJSON(),
  cookingChallenge.data.toJSON(),
  recipeScaler.data.toJSON(),
  pantryManager.data.toJSON(),
  youtubeFeed.data.toJSON(),
  testAlerts.data.toJSON()
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`📡 Registering ${commands.length} slash commands...`);

    if (guildId) {
      console.log('🧹 Clearing previous global commands to prevent duplicate entries...');
      await rest.put(Routes.applicationCommands(clientId), { body: [] });

      console.log(`🎯 Registering commands for Guild ID: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log('✅ Successfully registered Guild Slash Commands cleanly!');
    } else {
      console.log('🌐 Registering Global Slash Commands (may take up to 1 hour to propagate)...');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log('✅ Successfully registered Global Slash Commands!');
    }

  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
})();
