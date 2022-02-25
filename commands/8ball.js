const rep = ['Yes', 'No', 'Of course! I believe in you <:pepepray:864351292297445376>', 'Oh fuk no you\'re done for', 'Yeah probably', 'Hm...... probably not', 'Indeed', 'I\'m afraid I\'ll have to say no', 'Certainly', 'Nope', 'Hell yeah', 'Nah m8'];
module.exports = {
	name: '8ball',
	description: 'replies with random yes/no',
	execute(message) {
		const ranMsg = rep[Math.floor(Math.random() * rep.length)];
		message.reply(ranMsg);
	},
};
