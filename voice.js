/*
speak [type] [text/Filename] {rate} {volume} {.wav Output Filename} {Output Format}
Speaks the contents of the text or file that you specify, by using the Speech library (SAPI) that comes with Windows XP and Windows Vista. If {.wav Output Filename} and {Output Format} are specified, the speaking is saved into a .wav file instead of speaking on your sound device. 
In the [type] parameter, you can specify one of the following values:
text: The second parameter contains a simple text.
xml: The second parameter contains a text with Speech xml data.
file: The second parameter contains a text filename.
The {rate} parameter is optional parameter that you can specify the Speech rate, a value between -10 (very slow) and 10 (very fast). The {volume} parameter is optional parameter that you can specify the volume of the Speech, a value between 0 and 100.

if {.wav Output Filename} contains a .wav filename, you should also specify one of the following output format strings in the {Output Format} parameter: 
8kHz8BitMono, 8kHz8BitStereo, 8kHz16BitMono, 8kHz16BitStereo, 11kHz8BitMono, 11kHz8BitStereo, 11kHz16BitMono, 11kHz16BitStereo, 12kHz8BitMono, 12kHz8BitStereo, 12kHz16BitMono, 12kHz16BitStereo, 16kHz8BitMono, 16kHz8BitStereo, 16kHz16BitMono, 16kHz16BitStereo, 22kHz8BitMono, 22kHz8BitStereo, 22kHz16BitMono, 22kHz16BitStereo, 24kHz8BitMono, 24kHz8BitStereo, 24kHz16BitMono, 24kHz16BitStereo, 32kHz8BitMono, 32kHz8BitStereo, 32kHz16BitMono, 32kHz16BitStereo, 44kHz8BitMono, 44kHz8BitStereo, 44kHz16BitMono, 44kHz16BitStereo, 48kHz8BitMono, 48kHz8BitStereo, 48kHz16BitMono, 48kHz16BitStereo, TrueSpeech_8kHz1BitMono, CCITT_ALaw_8kHzMono, CCITT_ALaw_8kHzStereo, CCITT_ALaw_11kHzMono, CCITT_ALaw_11kHzStereo, CCITT_ALaw_22kHzMono, CCITT_ALaw_22kHzStereo, CCITT_ALaw_44kHzMono, CCITT_ALaw_44kHzStereo, CCITT_uLaw_8kHzMono, CCITT_uLaw_8kHzStereo, CCITT_uLaw_11kHzMono, CCITT_uLaw_11kHzStereo, CCITT_uLaw_22kHzMono, CCITT_uLaw_22kHzStereo, CCITT_uLaw_44kHzMono, CCITT_uLaw_44kHzStereo, ADPCM_8kHzMono, ADPCM_8kHzStereo, ADPCM_11kHzMono, ADPCM_11kHzStereo, ADPCM_22kHzMono, ADPCM_22kHzStereo, ADPCM_44kHzMono, ADPCM_44kHzStereo, GSM610_8kHzMono, GSM610_11kHzMono, GSM610_22kHzMono, GSM610_44kHzMono

Examples: 
speak text ~$clipboard$ 
speak text "Please visit the Web site of NirSoft at http://www.nirsoft.net" 2 80 
speak file "c:\temp\speak1.txt" 
speak file "c:\temp\speak1.txt" 0 100 "c:\temp\speak.wav" 48kHz16BitStereo
*/
const fs = require('fs');
const player = require('node-wav-player');
const settings = require('./settings.json');
const moment = require('moment');
var execFile = require('child_process').execFile;
var voiceConnection = null;
var drivers = null;
var muted = settings.startMute;
var busy = false;

const Priority = {
	'NONSENSE': 0,
	'INFO': 1,
	'EVENTUAL': 2,
	'CRITICAL': 3
};
module.exports.Priority = Priority;
var currentPriority = Priority.NONSENSE;

const names = {
	"Mikael": "Meekell",
	"borbo": "Boarboo",
	"Sadjev": "Zadj-eve",
	"Anders": "And-errs",
	"Robert": "Row-bert",
	"Rymdkatten": "Riymdkattene",
	"Per": "Paire",
	"Håkan": "Hawk-anne",
	"Staffan": "Stuff-anne",
	"roblind": "Row-bert",
	"Nurburgring": "Neur-burg-ring"
};
module.exports.names = names;

module.exports.mute = function mute() {
	muted = true;
}

module.exports.unMute = function unMute() {
	muted = false;
}

module.exports.setConnection = function setConnection(voiceConnection_) {
	voiceConnection = voiceConnection_;
}

module.exports.setDrivers = function setDrivers(drivers_) {
	drivers = drivers_;
}

function speakText(text, priority, speed = 0, volume = 0.75) {
	currentPriority = priority;
	busy = true;

	if (voiceConnection === null) {
		console.log("Locally: " + text);
		const child = execFile('nircmd/nircmd.exe', ['speak', 'text', text, speed, volume * 100], (error, stdout, stderr) => {
			console.log('Done speaking ' + text);
			busy = false;
			if (error) {
				console.log(error);
				throw error;
			}
		});
	} else {
		var filename;
		if (text.length > 64) {
			filename = text.substring(0, 64);
		} else {
			filename = text;
		}
		if (speed > 0) {
			filename += '_' + speed
		}
		filename = filename.replace(/[, \.]+/, '_');
		filename = './sound/' + filename.replace('.', '_') + '.wav';
		if (!fs.existsSync(filename)) {
			Object.keys(names).forEach(function(name) {
				var spelling = names[name];
				text = text.replace(name, spelling);
			});
			const child = execFile('nircmd/nircmd.exe', ['speak', 'text', text, speed, 100, filename, '48kHz16BitMono'], (error, stdout, stderr) => {
				if (error) {
					console.error('stderr', stderr);
					throw error;
				} else {
					const dispatcher = voiceConnection.playFile(filename, {
						'volume': volume,
						'passes': priority + 2
					});
					dispatcher.on('end', () => {
						busy = false;
						console.log("Done playing '" + filename + "' - took " + dispatcher.totalStreamTime);
					});
					dispatcher.on('error', e => {
						console.error(e);
					});
				}
			});
		} else {
			const dispatcher = voiceConnection.playFile(filename, {
				'volume': volume,
				'passes': priority + 2
			});
			dispatcher.on('end', () => {
				busy = false;
				console.log("Done playing '" + filename + "' - took " + dispatcher.totalStreamTime);
			});
			dispatcher.on('error', e => {
				console.error(e);
			});
		}
	}
};

module.exports.speak = async function speak(text, priority = Priority.INFO, speed = 0, delay_ms = 0) {
	if (muted) return;
	if (delay_ms > 0) await sleep(delay_ms);

	switch (priority) {
		case Priority.NONSENSE:
			if (isBusy()) {
				speakText(text, priority, speed, 0.7);
			}
			break;
		case Priority.INFO:
			if (!isBusy() || priority > currentPriority) {
				speakText(text, priority, speed, 0.8);
			}
			break;
		case Priority.EVENTUAL:
			var tries = 0;
			while (isBusy() && currentPriority > Priority.NONSENSE) {
				if (tries > 20) return;
				await sleep(1000);
				tries++;
			}
			speakText(text, priority, speed, 0.80);
			break;
		case Priority.CRITICAL:
			speakText(text, priority, speed, 1);
			break;
	}
}


function isBusy() {
	if (voiceConnection !== null) {
		return voiceConnection.speaking;
	} else {
		return busy;
	}
}
module.exports.isBusy = isBusy;

function playFile(filename, priority, volume) {
	currentPriority = priority;
	console.log('Playing file ' + filename);
	busy = true;
	if (voiceConnection !== null) {
		const dispatcher = voiceConnection.playFile(filename, {
			'volume': volume,
			'passes': 5
		});
		dispatcher.on('end', (reason) => {
			busy = false;
			currentPriority = Priority.NONSENSE;
		});
		dispatcher.on('error', (error) => {
			busy = false;
			currentPriority = Priority.NONSENSE;
			console.log('Failed to play ' + filename + ':\n' + error);
		})
	} else {
		player.play({
			'path': filename,
			'sync': true
		}).then(() => {
			busy = false;
			currentPriority = Priority.NONSENSE;
		}).catch((error) => {
			busy = false;
			currentPriority = Priority.NONSENSE;
			console.log('Failed to play ' + filename + ' locally;' + error);
		});
	}
}

module.exports.play = async function play(filename, priority = Priority.INFO, delay_ms = 0) {
	if (muted) return;
	if (delay_ms > 0) await sleep(delay_ms);

	switch (priority) {
		case Priority.NONSENSE:
			if (isBusy()) {
				playFile(filename, priority, 0.7);
			}
			break;
		case Priority.INFO:
			if (!isBusy() || priority > currentPriority) {
				playFile(filename, priority, 0.8);
			}
			break;
		case Priority.EVENTUAL:
			var tries = 0;
			while (isBusy() && currentPriority > Priority.NONSENSE) {
				if (tries > 20) return;
				await sleep(1000);
				tries++;
			}
			playFile(filename, priority, 0.8);
			break;
		case Priority.CRITICAL:
			playFile(filename, priority, 1);
			break;
	}

};

module.exports.handleOtherSpeaking = function(user, speaking) {};


module.exports.greet = function greet(driver) {
	let now = moment();
	if (typeof(driver) === 'undefined' || driver === null) return;
	let sinceGreet = now.diff(moment(driver.greeted));
	let sinceSeen = now.diff(moment(driver.seen));
	driver.seen = now.format('YYYYMMDDTHHmmss');
	if (sinceGreet < 400000 || sinceSeen < 60000) {
		console.log('Not greeting ' + driver.name + ' Time since last greet: ' + sinceGreet + ', since seen: ' + sinceSeen);
		return false;
	} else {
		console.log('Greeting ' + driver.name);
		let text = '';
		driver.greeted = now.format('YYYYMMDDTHHmmss');
		if (sinceSeen < 8000000) {
			let d = dice(3);
			switch (d) {
				case 1:
					text = 'Welcome back ' + driver.sounds + '.';
					break;
				case 2:
					text = 'Hello again ' + driver.sounds + '.';
					break;
				case 3:
					text = 'Hi again, ' + driver.sounds + '.';
					break;
			}
		} else {
			text = getGreeting(driver);
			if (sinceGreet > 700000000 && sinceSeen > 700000000) {
				// more than a week
				let d = dice(6);
				switch (d) {
					case 1:
						text += ' I missed you.';
						break;
					case 2:
						text += ' Finally, you are back.';
						break;
					case 3:
						text += ' Long time no see.';
						break;
					case 4:
						text += ' I havent seen you in a while.';
						break;
					case 5:
						text += ' I remember you.'
						break;
					case 6:
						text += ' You are back!'
						break;
				}
			}
		}
		this.speak(text);
		return true;
	}
}

function getGreeting(driver) {
	let d = dice(4);
	switch (d) {
		case 1:
			return "Hey " + driver.sounds + '.';
		case 2:
			return "Hello, " + driver.sounds + '.';
		case 3:
			return "Welcome, " + driver.sounds + '.';
		case 4:
			return "Greetings, " + driver.sounds + '.';
		default:
			console.error('Unknown outcome: ' + d);
			break;
	}
}


module.exports.getPosition = function getPosition(pos, max) {
	if (pos === max) {
		return 'last';
	}
	switch (pos) {
		case 0:
			return 'unknown';
		case 1:
			return '1st';
		case 2:
			return '2nd';
		case 3:
			return '3rd';
		default:
			return 'on ' + pos + 'th place';
	}
}

function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}

function dice(n) {
	return Math.floor((Math.random() * n) + 1);
}