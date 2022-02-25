const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
// const { MessageActionRow, MessageButton } = require('discord.js');
// const wait = require('util').promisify(setTimeout);
const prefix = '-';
const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_VOICE_STATES],
});
const queue = new Map();
const ytdl = require("ytdl-core");
const { createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');
const { joinVoiceChannel } = require('@discordjs/voice');
const player = createAudioPlayer({
	behaviors: {
		noSubscriber: NoSubscriberBehavior.Pause,
	},
});
const { createAudioResource, StreamType } = require('@discordjs/voice');

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

// add the trackStart event so when a song will be played this message will be sent
// player.on("trackStart", (queue, track) => queue.metadata.channel.send(`🎶 | Now playing **${track.title}**!`))

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

	if (message.content.startsWith(`${prefix}play`)) {
		execute(message, serverQueue);
		return;
	}
	else if (message.content.startsWith(`${prefix}skip`)) {
		skip(message, serverQueue);
		return;
	}
	else if (message.content.startsWith(`${prefix}stop`)) {
		stop(message, serverQueue);
		return;
	}
});

async function execute(message, serverQueue) {
	const args = message.content.split(' ');

	const voiceChannel = message.member.voice.channel;
	if (!voiceChannel) {
		return message.channel.send('You need to be in a voice channel to play music!');
	}
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return message.channel.send('I need the permissions to join and speak in your voice channel!');
	}

	const songInfo = await ytdl.getInfo(args[1]);
	const song = {
		title: songInfo.videoDetails.title,
		url: songInfo.videoDetails.video_url,
	};
	// console.log(song.url);
	const { join } = require('path');
	ytdl(song.url, { filter: 'audioonly' }).pipe(fs.createWriteStream('video.mp3'));
	const resource = createAudioResource(join(__dirname,'video.mp3'));
	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true,
		};

		queue.set(message.guild.id, queueContruct);

		queueContruct.songs.push(song);

		try {
			const connection = joinVoiceChannel({
				channelId: message.member.voice.channel.id,
				guildId: message.member.voice.channel.guild.id,
				adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
			});
			connection.subscribe(player);
			player.play(resource);
		}
		catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	}
	else {
		serverQueue.songs.push(song);
		return message.channel.send(`${song.title} has been added to the queue!`);
	}
}

function skip(message, serverQueue) {
	if (!message.member.voice.channel) {
		return message.channel.send('You have to be in a voice channel to stop the music!');
	}
	if (!serverQueue) {
		return message.channel.send('There is no song that I could skip!');
	}
	serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
	if (!message.member.voice.channel) {
		return message.channel.send('You have to be in a voice channel to stop the music!');
	}

	if (!serverQueue) {
		return message.channel.send('There is no song that I could stop!');
	}
	serverQueue.songs = [];
	serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);
	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection
		.play(ytdl(song.url))
		.on('finish', () => {
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(token);