const fs = require('fs');
const { Client, Collection, Intents, MessageEmbed } = require('discord.js');
const { token } = require('./config.json');
// const { MessageActionRow, MessageButton } = require('discord.js');
// const wait = require('util').promisify(setTimeout);
const prefix = '-';
const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_VOICE_STATES],
});
const queue = new Map();
const ytdl = require("ytdl-core");
const { createAudioPlayer, NoSubscriberBehavior, AudioPlayerStatus, state } = require('@discordjs/voice');
const { joinVoiceChannel } = require('@discordjs/voice');
const player = createAudioPlayer({
	behaviors: {
		noSubscriber: NoSubscriberBehavior.Pause,
	},
});

const { createAudioResource } = require('@discordjs/voice');

let musicMsg = new MessageEmbed()
	.setTitle('None');

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.name, command);
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.on('message', msg => {
	// if (msg.author.id === '351059345817206784') {
	// 	const b1 = new MessageButton().setStyle('SUCCESS').setCustomId('0').setLabel('Yes');
	// 	const b2 = new MessageButton().setStyle('SUCCESS').setCustomId('1').setLabel('YES');
	// 	const row = new MessageActionRow().addComponents([b1, b2]);
	// 	msg.reply({ content: 'Is kenny a god?', components: [row] });
	// }
	if (!msg.content.startsWith(prefix) || msg.author.bot) return;

	const args = msg.content.slice(prefix.length).split(/ +/);
	const cmd = args.shift().toLowerCase();

	if (cmd == '8ball') {
		client.commands.get('8ball').execute(msg);
	}
	else if (cmd == 'choose') {
		const ok = msg.content.slice(7).split('|');
		client.commands.get('choose').execute(msg, ok);
	}
	else if (cmd == 'god') {
		msg.reply('<@261216944823336960> is the God <:pepepray:864351292297445376>');
	}
	else if (cmd == 'clear') {
		client.commands.get('clear').execute(msg, args);
	}
	else if ((cmd == 'doubleup' || cmd == 'du') && msg.author.id == '351059345817206784') {
		msg.reply('<@206848157030678529> DOUBLE UP?');
	}
	// else if (cmd == 'play') {
	// 	client.commands.get('play').execute(msg, player);
	// }
});

client.on('interactionCreate', interaction => {
	if (!interaction.isButton()) return;
	// Fetch the reply to this interaction
	interaction.fetchReply()
		.then(interaction.update({ content: 'I know right, I\'m in his cult too!', components: [] }))
		.catch(console.error);
});

client.on('message', async message => {
	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)) return;

	const serverQueue = queue.get(message.guild.id);

	if (message.content.startsWith(`${prefix}stop`)
		|| message.content.startsWith(`${prefix}pause`)) {
		stop(message);
		return;
	}
	else if (message.content.startsWith(`${prefix}play`)
		|| message.content.startsWith(`${prefix}p`)) {
		execute(message, serverQueue);
		return;
	}
	else if (message.content.startsWith(`${prefix}skip`)) {
		skip(message);
		return;
	}
	else if (message.content.startsWith(`${prefix}continue`)
		|| message.content.startsWith(`${prefix}unpause`)) {
		unpause(message);
		return;
	}
	else if (message.content.startsWith(`${prefix}np`)) {
		nowPlaying(message);
		return;
	}
});

async function execute(message, serverQueue) {
	const args = message.content.split(' ');

	if (!args[1]) {
		unpause(message);
		return;
	}
	const voiceChannel = message.member.voice.channel;
	if (!voiceChannel) {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**You need to be in a voice channel to play music!**');
		return message.channel.send({ embeds: [msg] });
	}
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**I need the permissions to join and speak in your voice channel!**');
		return message.channel.send({ embeds: [msg] });
	}

	const songInfo = await ytdl.getInfo(args[1]);
	const song = {
		title: songInfo.videoDetails.title,
		url: songInfo.videoDetails.video_url,
		thumbnail: songInfo.videoDetails.thumbnails
	};

	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true,
		};
		queueContruct.songs.push(song);
		queue.set(message.guild.id, queueContruct);
		play(message);
	}
	else {
		serverQueue.songs.push(song);
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle(`**${song.title} has been added to the queue!**`);
		return message.channel.send({ embeds: [msg] });
	}
}

function nowPlaying(message) {
	if (!message.member.voice.channel) {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**You have to be in the voice channel to use this command!**');
		return message.channel.send({ embeds: [msg] });
	}

	if (player.state.status === 'idle') {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**Nothing is currently playing!**');
		return message.channel.send({ embeds: [msg] });
	}
	else {
		musicMsg.setTitle('**Current Song**');
		return message.channel.send({ embeds: [musicMsg] });
	}
}

function skip(message) {
	if (!message.member.voice.channel) {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**You have to be in the voice channel to skip the music!**');
		return message.channel.send({ embeds: [msg] });
	}
	if (player.state.status === 'idle') {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**The queue is empty!**');
		return message.channel.send({ embeds: [msg] });
	}
	else {
		player.stop();
		play(message);
	}

}

function unpause(message) {
	if (!message.member.voice.channel) {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**You have to be in the voice channel to unpause the music!**');
		return message.channel.send({ embeds: [msg] });
	}

	if (player.state.status === 'idle') {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**The queue is empty!**');
		return message.channel.send({ embeds: [msg] });
	}
	else if (player.state.status === 'paused') {
		player.unpause();
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**The track will now continue!**');
		return message.channel.send({ embeds: [msg] });
	}

	else if (player.state.status === 'playing') {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**The track is already playing!**');
		return message.channel.send({ embeds: [msg] });
	}
}

function stop(message) {
	if (!message.member.voice.channel) {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**You have to be in the voice channel to stop the music!**');
		return message.channel.send({ embeds: [msg] });
	}

	if (player.state.status === 'idle') {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**The queue is empty!**');
		return message.channel.send({ embeds: [msg] });
	}

	else if (player.state.status === 'paused') {
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**The track is already paused!**');
		return message.channel.send({ embeds: [msg] });
	}

	else if (player.state.status === 'playing') {
		player.pause();
		const msg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**Paused!**');
		return message.channel.send({ embeds: [msg] });
	}
}

function play(message) {
	const serverQueue = queue.get(message.guild.id);
	console.log("running play")
	if (!serverQueue) {
		return;
	}
	const song = serverQueue.songs.shift();
	if (song) {
		const stream = ytdl(song.url, { filter: 'audioonly' })
		const resource = createAudioResource(stream)

		const connection = joinVoiceChannel({
			channelId: message.member.voice.channel.id,
			guildId: message.member.voice.channel.guild.id,
			adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
		});
		connection.subscribe(player);
		player.play(resource);
		musicMsg = new MessageEmbed()
			.setColor('#e75480')
			.setTitle('**Now Playing**')
			.setDescription(`[${song.title}](${song.url})`)
			.setThumbnail(`${song.thumbnail[3].url}`)
			.setTimestamp()
			.setFooter({ text: `Added by ${message.author.username}`, iconURL: `${message.author.avatarURL()}` });
		message.channel.send({ embeds: [musicMsg] });

		player.on(AudioPlayerStatus.Idle, () => {
			play(message);
		})
	}
	else {
		queue.delete(message.guild.id);
		return;
	}

}
//TODO: loop, loop queue, queue? 
client.login(token);
