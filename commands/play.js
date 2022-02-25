const { QueryType } = require("discord-player");

module.exports = {
    name: "play",
    description: "play a song",
    options: [
        {
            name: "songtitle",
            description: "title of the song",
            type: "STRING",
            required: true,
        },
    ],
    execute(message, player) {
        const songTitle = message.content.slice(5);
        if (!message.member.voice.channel) {
            message.reply('You have to be in a voice channel to use this command!');
        }
    },
};