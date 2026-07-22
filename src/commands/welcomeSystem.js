import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChannelType 
} from 'discord.js';

export let welcomeChannelId = null;

export const data = new SlashCommandBuilder()
  .setName('welcome-setup')
  .setDescription('Set up a designated welcome channel for new server members.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Channel where welcome messages will be posted')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  welcomeChannelId = channel.id;

  const embed = new EmbedBuilder()
    .setTitle('👋 Welcome Channel Configured')
    .setColor('#2ecc71')
    .setDescription(`New members will now receive a custom greeting in <#${channel.id}>!`)
    .setFooter({ text: 'Chef Chris Cody\'s Kitchen' });

  await interaction.reply({ embeds: [embed] });
}

export async function handleMemberJoin(member) {
  if (!welcomeChannelId) return;

  const channel = member.guild.channels.cache.get(welcomeChannelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(`🍳 Welcome to ${member.guild.name}!`)
    .setColor('#e67e22')
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setDescription(`Welcome ${member}! Grab an apron and make yourself at home in **Chef Chris Cody's Kitchen**.\n\nBe sure to check out our rules and join the discussion in our categories!`)
    .addFields(
      { name: 'Member Count', value: `You are member **#${member.guild.memberCount}**!`, inline: true }
    )
    .setTimestamp();

  await channel.send({ content: `Hey ${member}, welcome!`, embeds: [embed] }).catch(() => {});
}
