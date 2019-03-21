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
var execFile = require('child_process').execFile;
var voiceConnection = null;
var drivers = null;
var muted = false;
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
	"roblind": "Row-bert"
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

module.exports.speak = async function speak(text, speed = 0, delay_s=0) {
	var volume = 100;
	if (muted) {return;}

	if (delay_s > 0) {
		await sleep(delay_s * 1000);
	}

	if (voiceConnection === null) {
		console.log("Locally: " + text);
		const child = execFile('nircmd/nircmd.exe', ['speak', 'text', text, speed, volume], (error, stdout, stderr) => {
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
		if (speed > 0) {filename += '_' + speed}
		filename = filename.replace(/[, \.]+/, '_');
		filename = './sound/' + filename.replace('.', '_') + '.wav';
		if (!fs.existsSync(filename)) {
			Object.keys(names).forEach(function(name) {
  			var spelling = names[name];
				text = text.replace(name, spelling);
			});
			const child = execFile('nircmd/nircmd.exe', ['speak', 'text', text, speed, volume, filename, '48kHz16BitMono'], (error, stdout, stderr) => {
				if (error) {
					console.error('stderr', stderr);
					throw error;
				} else {
		  		const dispatcher = voiceConnection.playFile(filename);
		  		dispatcher.on('end', () => {
						console.log("Done playing '" + filename + "' - took " + dispatcher.totalStreamTime);
					});
					dispatcher.on('error', e => {
						console.error(e);
					});
		  	}
			});
		} else {
		  const dispatcher = voiceConnection.playFile(filename);
		  dispatcher.on('end', () => {
			console.log("Done playing '" + filename + "' - took " + dispatcher.totalStreamTime);
			});
			dispatcher.on('error', e => {
				console.error(e);
			});
		}
	}
};

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

// Mikael -> Meekell, Michael
// Borbo -> Boarboo
// Sadjev -> Sedjef, Sadjaeve ?
// Anders -> Anderrs
// Robert -> Robert, Rowbert
// Rymdkatten -> Riymdkattene