module.exports = {
	name: 'choose',
	description: 'choose one of the options',
	execute(message, args) {
		const ranMsg = args[Math.floor(Math.random() * args.length)];
		message.reply(ranMsg);
	},
};
