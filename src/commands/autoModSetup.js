import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  AutoModerationRuleTriggerType, 
  AutoModerationRuleEventType, 
  AutoModerationActionType 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('automod-setup')
  .setDescription('Enable 24/7 Auto-Moderation (Spam Protection, Bad Words Filter, Invite Link Blocking).')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addBooleanOption(option =>
    option
      .setName('block_invites')
      .setDescription('Automatically block Discord invite links sent by members? (default: True)')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option
      .setName('block_spam')
      .setDescription('Automatically block repetitive spam messages? (default: True)')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option
      .setName('block_profanity')
      .setDescription('Automatically filter severe profanity/slurs? (default: True)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const guild = interaction.guild;
    const blockInvites = interaction.options.getBoolean('block_invites') ?? true;
    const blockSpam = interaction.options.getBoolean('block_spam') ?? true;
    const blockProfanity = interaction.options.getBoolean('block_profanity') ?? true;

    const createdRules = [];

    // 1. Anti-Spam Protection Rule
    if (blockSpam) {
      const existingSpam = guild.autoModerationRules.cache.find(r => r.name === 'Nola Anti-Spam Protection');
      if (!existingSpam) {
        await guild.autoModerationRules.create({
          name: 'Nola Anti-Spam Protection',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Spam,
          actions: [
            { type: AutoModerationActionType.BlockMessage },
            { 
              type: AutoModerationActionType.Timeout, 
              metadata: { durationSeconds: 300 } // 5 minute timeout for spamming
            }
          ],
          enabled: true,
          reason: 'Automated 24/7 Anti-Spam Protection'
        });
        createdRules.push('✅ **Anti-Spam Filter** (Blocks repetitive spam & issues 5m timeout)');
      } else {
        createdRules.push('ℹ️ **Anti-Spam Filter** (Already active)');
      }
    }

    // 2. Severe Profanity Filter Rule
    if (blockProfanity) {
      const existingProfanity = guild.autoModerationRules.cache.find(r => r.name === 'Nola Profanity Filter');
      if (!existingProfanity) {
        await guild.autoModerationRules.create({
          name: 'Nola Profanity Filter',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Profanity,
          actions: [
            { type: AutoModerationActionType.BlockMessage }
          ],
          enabled: true,
          reason: 'Automated 24/7 Profanity Filter'
        });
        createdRules.push('✅ **Profanity & Slur Filter** (Blocks inappropriate language)');
      } else {
        createdRules.push('ℹ️ **Profanity Filter** (Already active)');
      }
    }

    // 3. Block External Discord Invite Links Rule
    if (blockInvites) {
      const existingInvites = guild.autoModerationRules.cache.find(r => r.name === 'Nola Anti-Invite Link');
      if (!existingInvites) {
        await guild.autoModerationRules.create({
          name: 'Nola Anti-Invite Link',
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Keyword,
          triggerMetadata: {
            keywordFilter: ['*discord.gg/*', '*discord.com/invite/*']
          },
          actions: [
            { type: AutoModerationActionType.BlockMessage }
          ],
          enabled: true,
          reason: 'Automated 24/7 Anti-Invite Link Protection'
        });
        createdRules.push('✅ **Anti-Invite Link Filter** (Blocks unapproved Discord invites)');
      } else {
        createdRules.push('ℹ️ **Anti-Invite Link Filter** (Already active)');
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🤖 24/7 Server Auto-Moderation Activated')
      .setColor('#2ecc71')
      .setDescription(`Successfully enabled automated server monitoring rules for **${guild.name}**!`)
      .addFields(
        { name: 'Active Monitoring Rules', value: createdRules.join('\n'), inline: false },
        { 
          name: 'How It Works', 
          value: 'Discord will automatically inspect messages 24/7 in real-time. Any message violating these rules will be instantly deleted before anyone sees it, and spammers will be automatically timed out.',
          inline: false 
        }
      )
      .setFooter({ text: 'Nola Discord Auto-Moderation Engine' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error executing automod-setup:', error);
    await interaction.editReply({ content: `❌ Failed to setup Auto-Moderation: ${error.message}` });
  }
}
