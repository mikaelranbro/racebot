// share link: https://discordapp.com/oauth2/authorize?&client_id=552108652446744587&scope=bot&permissions=104324161

var offline = false; // <---- For offline debug sessions

const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
module.exports.voice = voice = require('./voice.js');
module.exports.season = season = require('./season.js');
module.exports.race = race = require('./race.js');
const prefix = '!';
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var execFile = require('child_process').execFile;
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
\n !prepare - prepare the next race\
\n !start <delay> - start/restart prepared race in <delay> seconds\
\n !abort - abort ongoing race (it will still be prepared)\
\n !finish -  finish ongoing race and update standings with results\
\n !mute - silence the bot\
\n !unmute - unsilence the bot\
\n !honk - wake people up';

// https://stackoverflow.com/questions/20643470/execute-a-command-line-binary-with-node-js
/*
var result= execSync("voice.exe This is a test!",,{});
 
console.log("voice...");
console.log("stdout: " + result.stdout);
console.log("stderr: " + result.stderr);
console.log("error: " + result.error);
*/

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// voice.speak("1 .. 2 .. 3 .. 4", 5);


async function after() {
	await sleep(2000);
	// console.log(child);
	console.log(child.stderr);
}

// after();


// voice.mute(); //                                     <------------------- REMOVE!!

client.once('ready', () => {
	client.user.setActivity('Project Cars 2', {"type": "WATCHING"});
	client.guilds.forEach((guild) => {
		console.log(guild.name + ': ');
		guild.channels.forEach((channel) => {
			console.log('...' + channel.name);
			if (channel.name === "racecontrol") {
				textChannel = channel;
				console.log("Found channel " + channel.name);
			} else if (channel.name === "pCars") {
				voiceChannel = channel;
			}
		});
	});
	ready = true;
	if ( voiceChannel === null) {
		console.error('Unable to find voice channel "pCars".');
		ready = false;
	} else {
		voiceChannel.join()
			.then(connection => {
				voiceConnection = connection;
				voice.setConnection(connection);
				console.log('Joined voice channel.');
				if (!hasAnnouncedSelf) {
					voice.speak("Racing-bot online.");
					hasAnnouncedSelf = true;
				}
			})
			.catch(console.log);
	}
	if (textChannel === null) {
		console.error('Unable to find text channel "racecontrol".');
		ready = false;
	}
	if (ready) {
		race.init(voice, textChannel, season);
		console.log('Ready.');
	}
});

client.on('voiceStateUpdate', (oldMember, newMember) => {
	if (newMember.user.id === client.user.id) {return;}
	if (voiceConnection === null) { return; }
	if (newMember.voiceChannel === voiceChannel) {
		console.log(newMember.user.username + " joined channel.");
		voice.speak("Hey, " + newMember.user.username);
	}
});

client.on('error', error => {
	console.log(error);
	client.login();
});

client.on('message', message => {
	if (message.author.bot) {
		return;
	}
	console.log(message.content);
	if (message.content.substring(0,1) === prefix) {
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
				voice.speak("Say what, " + message.author.username + "?", 1);
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
	  	voiceConnection.playFile('./carhorn.mp3');
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
			if (args.length > 0) {
				race.start(parseInt(args[0], 10));
			} else {
				race.start();
			}
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
	} else if (message.content.substring(0,1) === '?') {
		message.channel.send(helpString);
	}
});

// client.login('NTUyMTA4NjUyNDQ2NzQ0NTg3.D172-Q.X2JDnUrmr9YegYIAe-mJbHTTHFg');
if (offline) {
	textChannel = { 'send': function(msg) {console.log('[ToRaceControl] ' + msg);}};
	race.init(voice, textChannel, season);
	const tests = require('./test.js');
	tests.runOffline(this);
} else {
	client.login(auth.token);
}

if (process.platform === "win32") {
  var rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function () {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", function () {
  //graceful shutdown
  if (!offline) {
  	voiceConnection.disconnect();
  }
  race.abort();
  client.destroy();
  process.exit();
});




/*
console.log("Bot created");
client.on('ready', function (evt) {
  console.log('Connected');
  console.log('Logged in as: ');
  console.log(client.username + ' - (' + client.id + ')');
});
client.on('message', function (user, userID, channelID, message, evt) {
  // Our bot needs to know if it will execute a command
  // It will listen for messages that will start with `!`
  if (message.substring(0, 1) == '!') {
   	var args = message.substring(1).split(' ');
    var cmd = args[0];
    console.log(cmd);
    args = args.splice(1);
    switch(cmd) {
      // !ping
    case 'ping':
      bot.sendMessage({
	      to: channelID,
        message: 'Pong!'
      });
      break;
      // Just add any case commands if you want to..
    }
  }
});

client.login(auth.token);
*/