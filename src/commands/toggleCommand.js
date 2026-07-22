import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder 
} from 'discord.js';
import { db } from '../db.js';

// Global memory map of disabled commands for runtime, seeded from DB
export const disabledCommands = new Set(db.get('disabledCommands', []));

export const data = new SlashCommandBuilder()
  .setName('toggle-command')
  .setDescription('Enable or disable specific bot commands in this server.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option =>
    option
      .setName('command')
      .setDescription('Select the command to enable or disable')
      .setRequired(true)
      .addChoices(
        { name: '/catmod (Category Mod Tools)', value: 'catmod' },
        { name: '/mod (Server Mod Tools)', value: 'mod' },
        { name: '/setup-category-mod', value: 'setup-category-mod' },
        { name: '/setup-server-mod', value: 'setup-server-mod' },
        { name: '/mod-wizard', value: 'mod-wizard' },
        { name: '/category-status', value: 'category-status' },
        { name: '/automod-setup', value: 'automod-setup' }
      )
  )
  .addBooleanOption(option =>
    option
      .setName('enabled')
      .setDescription('True to enable command, False to disable command')
      .setRequired(true)
  );

export function toggleCommandState(commandName, enabled) {
  if (!enabled) {
    disabledCommands.add(commandName);
  } else {
    disabledCommands.delete(commandName);
  }
  db.set('disabledCommands', Array.from(disabledCommands));
}

export async function execute(interaction) {
  const commandName = interaction.options.getString('command');
  const enabled = interaction.options.getBoolean('enabled');

  toggleCommandState(commandName, enabled);

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Command Permissions Updated')
    .setColor(enabled ? '#2ecc71' : '#e74c3c')
    .setDescription(`Command **\`/${commandName}\`** has been **${enabled ? 'ENABLED' : 'DISABLED'}**.`)
    .addFields({
      name: 'Current Disabled Commands',
      value: disabledCommands.size > 0 
        ? Array.from(disabledCommands).map(c => `• \`/${c}\``).join('\n') 
        : '*All commands are currently enabled.*'
    })
    .setFooter({ text: 'Updated by Administrator' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
