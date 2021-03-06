// sample share link: https://discordapp.com/oauth2/authorize?&client_id=552108652446744587&scope=bot&permissions=104324161
// authorization.json must be created with unique bot token

const settings = require('./settings.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./authorization.json');
const moment = require('moment');
module.exports.voice = voice = require('./voice.js');
module.exports.season = season = require('./season.js');
module.exports.race = race = require('./race.js');
const prefix = '!';
var textChannel = null;
var voiceChannel = null;
var voiceConnection = null;
var hasAnnouncedSelf = false;
var ready = false;

const helpString = '\
\n !help - display this text.\
\n !status - display championship standings etc.\
\n !register <steam name> <pronounciation> - register for the championship and tell the bot how to pronounce your name\
\n !schedule - display racing schedule\
\n !prepare - display start order of the next race\
\n !start start/restart race\
\n !abort - abort ongoing race\
\n !finish -  finish ongoing race and update standings with results\
\n !mute - silence the bot\
\n !unmute - unsilence the bot\
\n !honk - wake people up';

let oldLog = console.log.bind(console);
console.log = function() {
	oldLog.apply(console, ['[' + moment().format('HH:mm') + '] '].concat(Object.values(arguments)));
};


let shuttingDown = false;
let nbrDriversInChannel = 0;
let loopRunning = false;
async function discordLoop() {
	while (!shuttingDown) {
		if (voiceChannel !== null) {
			let nbrDrivers = 0;
			let nbrMembers = 0;
			voiceChannel.members.forEach((member, key, map) => {
				let driver = season.getDriver(member.user.username);
				if (typeof(driver) !== 'undefined' && driver !== null) {
					driver.seen = moment().format('YYYYMMDDTHHmmss');
					nbrDrivers++;
				}
				nbrMembers++;
			});
			if (nbrDrivers !== nbrDriversInChannel) {
				console.log(nbrDrivers + ' drivers present.');
				nbrDriversInChannel = nbrDrivers;
			}
		}
		await sleep(1000);
	}
	loopRunning = false;
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

client.on('ready', () => {
	console.log('Discord ready');
	client.user.setActivity('Project Cars 2', {
		"type": "WATCHING"
	});
	client.guilds.forEach((guild) => {
		console.log(guild.name + ': ');
		guild.channels.forEach((channel) => {
			// console.log('...' + channel.name);
			if (channel.name === "racecontrol") {
				textChannel = channel;
				console.log("...Found channel " + channel.name);
			} else if (channel.name === "pCars") {
				console.log("...Found channel " + channel.name);
				voiceChannel = channel;
			}
		});
	});
	joinVoiceChannel();
	if (textChannel === null) {
		console.error('Unable to find text channel "racecontrol".');
		ready = false;
	}
	if (ready) {
		race.init(voice, textChannel, season);
		console.log('Ready.');
	}
	if (!loopRunning) {
		loopRunning = true;
		discordLoop();
	}
});

function joinVoiceChannel() {
	ready = true;
	if (voiceChannel === null) {
		console.error('Unable to find voice channel "pCars".');
		ready = false;
	} else {
		voiceChannel.join()
			.then(connection => {
				voiceConnection = connection;
				voiceConnection.on('error', error => {
					console.log('********** ERROR in voiceConnection ************\n' + error);
					voice.setConnection(null);
					voiceConnection = null;
					reJoinVoiceChannel();
				});
				voiceConnection.on('speaking', (user, speaking) => {
					voice.handleOtherSpeaking(user, speaking);
				});
				voice.setConnection(connection);
				console.log('Joined voice channel.');
				if (!hasAnnouncedSelf) {
					voice.speak("Racing-bot online.");
					hasAnnouncedSelf = true;
				}
			})
			.catch(console.log);
	}
}

async function reJoinVoiceChannel() {
	await sleep(1000);
	joinVoiceChannel();
}

client.on('voiceStateUpdate', (oldMember, newMember) => {
	if (newMember.user.id === client.user.id) {
		return;
	}
	if (voiceConnection === null) {
		return;
	}
	if (newMember.voiceChannel === voiceChannel && oldMember.voiceChannel !== voiceChannel) {
		console.log(newMember.user.username + " joined channel.");
		if (voice.greet(season.getDriver(newMember.user.username))) {
			season.save();
		}
		// voice.speak("Hey, " + newMember.user.username);
	}
});

client.on('error', error => {
	console.log('******* ERROR in client *******\n' + error);
	waitAndLogin(5000);
});

function login() {
	client.login(auth.token)
	.then(() => {
		console.log('Reconnected');
	})
	.catch((error) => {
		reset();
		console.log(error);
		waitAndLogin(1000);
	});
}

function reset() {
	textChannel = null;
 	voiceChannel = null;
	voiceConnection = null;
	voice.setConnection(null);
	ready = false;
}

async function waitAndLogin(waitTime) {
	await sleep(waitTime);
	login();
}


client.on('message', message => {
	if (message.author.bot) {
		return;
	}
	console.log(message.content);
	if (message.content.substring(0, 1) === prefix) {
		var args = message.content.substring(1).split(/ +/);
		var cmd = args.shift().toLowerCase();
		console.log(message.author.username + ": " + message.content);
		switch (cmd) {
			case 'help':
			case '?':
			case 'h':
				message.channel.send(helpString);
				break;
			case 'ping':
				message.channel.send('Pong.');
				break;
			case 'standings':
			case 'status':
				message.channel.send(season.getTable());
				break;
			case 'register':
				if (args.length > 1) {
					season.register(message.author, args[0], args[1]);
					voice.names[message.author.username] = args[1];
				} else if (args.length > 0) {
					season.register(message.author, args[0]);
				} else {
					season.register(message.author);
				}
				voice.speak('Welcome ' + message.author.username);
			case 'info':
			case 'schedule':
				message.channel.send(season.getSchedule());
				break;
			case 'greet':
				voice.speak("Hey, " + message.author.username);
				break;
			case 'say':
				if (args.length > 0) {
					voice.speak(args.join(' '));
				} else {
					voice.speak("Say what, " + message.author.username + "?");
				}
				break;
			case 'write':
			case 'announce':
				if (args.length > 0) {
					textChannel.send(args.join(' '));
				} else {
					message.channel.send(message.author.username + ', the syntax is: "!write <text>"');
				}
				break;
			case 'honk':
				console.log("Honking");
				voiceConnection.playFile('./sfx/honk.wav');
				break;
			case 'mute':
				voice.mute();
				break;
			case 'unmute':
				voice.unMute();
				break;
			case 'prepare':
			case 'init':
				var msg = race.prepare();
				if (msg !== null && msg.length > 0) {
					textChannel.send(msg);
				}
				break;
			case 'begin':
			case 'start':
				race.start();
				break;
			case 'abort':
			case 'cancel':
			case 'reset':
				race.abort();
				break;
			case 'finish':
			case 'commit':
				race.finish();
				break;
			default:
				message.channel.send('Unknown command, type "!help".');
		}
	} else if (message.content.substring(0, 1) === '?') {
		message.channel.send(helpString);
	}
});

// client.login('NTUyMTA4NjUyNDQ2NzQ0NTg3.D172-Q.X2JDnUrmr9YegYIAe-mJbHTTHFg');
if (settings.offline) {
	textChannel = {
		'send': function(msg) {
			console.log('[ToRaceControl] ' + msg);
		}
	};
	race.init(voice, textChannel, season);
	const tests = require('./test.js');
	tests.runOffline(this);
	if (settings.runTest) {
		tests.runTests(this);
	}
} else {
	console.log('Logging in to Discord...');
	client.login(auth.token).then(() => {
		if (settings.runTest) {
			const tests = require('./test.js');
			tests.runTests(this);
		}
	})
	.catch((error) => {
		reset();
		console.log(error);
		waitAndLogin(5000);
	});
}

if (process.platform === "win32") {
	var rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on("SIGINT", function() {
		process.emit("SIGINT");
	});
}

process.on("SIGINT", function() {
	//graceful shutdown
	shuttingDown = true;
	if (!settings.offline && voiceConnection !== null) {
		voiceConnection.disconnect();
	}
	race.abort();
	client.destroy();
	process.exit();
});

