const moment = require('moment');
const axios = require('axios');
var voice = null;
var season = null;
var textChannel = null
var starts = null;
var prepared = false;
var running = false;
var racePromise = null;
var collectPromise = null;
var raceStartMoment = moment();
var crestEnabled = false;
var crestPollInterval = 1000;
var currentMetrics = null;
const crestUrl = 'http://localhost:8180/crest2/v1/api';
const drivers = {};
const steamToDiscord = {};
const discordToSteam = {};
const announcements = [];

const RaceState = {
	PENDING: 'pending',
	PREPARING: {
		WATING_FOR_GAME_START: 'Waiting for game',
		WAITING_FOR_RACE_START: 'Waiting for race start',
		CALCULATING: 'Calculating start order',
		DONE: 'Ready to start race'
	},
	STARTING: {
		WAITING_FOR_DELAY: 'Waiting for delay',
		STARTING: 'Starting'
	},
	RUNNING: 'running',
	FINISHING: {
		UPDATING_STANDINGS: 'Updating standings',
		DONE: 'Race finished'
	}
};

const CrestParam = {
	BUILD_INFO: 'buildInfo=true',
 	GAME_STATES: 'gameStates=true',
 	PARTICIPANTS: 'participants=true',
	UNFILTERED_INPUTS: 'unfilteredInputs=true',
	VEHICLE_INFORMATION: 'vehicleInformation=true',
	EVENT_INFORMATION: 'eventInformation=true',
	TIMINGS: 'timings=true',
  FLAGS: 'flags=true',
	PIT_INFO: 'pitInfo=true',
	CAR_STATE: 'carState=true',
	MOTION_DEVICE_RELATED: 'motionDeviceRelated=true',
	WHEELS_AND_TYRES: 'wheelsAndTyres=true',
	CAR_DAMAGE: 'carDamage=true',
	WEATHER: 'weather=true'
};

module.exports.RaceState = RaceState;
var raceState = RaceState.PENDING;


module.exports.init = function init(voice_, textChannel_, season_) {
	voice = voice_;
	textChannel = textChannel_;
	season = season_;
};

const metrics = [];
module.exports.metrics = metrics;

module.exports.prepare = function prepare(minDiff = 3) {
	raceState = RaceState.PREPARING;
	startOrder = [];
	Object.keys(season.drivers).forEach(function(key) {
		var driver = season.drivers[key];
		steamToDiscord[driver.steamName] = driver.name;
		discordToSteam[driver.name] = driver.steamName;
	});

	if (crestEnabled) {
		axios.get(crestUrl + '?' + CrestParam.PARTICIPANTS).then(response => {
			var p = response.data.participants;
			for (var i = 0; i < p.mNumParticipants; i++) {
 				if (typeof steamToDiscord[p.mParticipantInfo[i].mName] === undefined) {
 					console.log('Unknown participant "' + p.mParticipantInfo[i].mName + '"');
 				} else {
 					var name = steamToDiscord[p.mParticipantInfo[i].mName];
 					drivers[name] = {};
 					drivers[name].name = name;
 					drivers[name].speed = 0;
 				}
			}
		}).catch(error => {
			console.log(error);
		})
		starts = season.getStartOrder(minDiff, drivers);
	} else {
		starts = season.getStartOrder(minDiff);
	}

	
	var msg = 'Start order:\n==================================\n';
	for (var i = 0; i < starts.length; i++) {
		var padding = '';
		msg += ('    +' + starts[i].delay).slice(-4) + ': ';
		for (var j = 0; j < starts[i].drivers.length; j++) {
			msg += padding + starts[i].drivers[j].name + '\n';
			padding = '      ';
		}
	}
	msg += '==================================';
	prepared = true;
	return msg;
};

module.exports.start = function start(startDelay = 10) {
	if (this.running) {
		this.abort();
	}
	if (!prepared) {
		this.prepare();
	}
	if (!prepared) {return;}
	for (var i = 0; i < starts.length; i++) {
		starts[i].done = false;
	}
	console.log('Start delay: ' + startDelay);
	voice.speak("Starting race in " + startDelay + " seconds.");
	running = true;

	crestPollInterval = 1000;
	if (crestEnabled) {
		collectPromise = collectMetrics();
	}
	racePromise = runRace(startDelay);
	console.log("race start initiated");
};

module.exports.abort = function abort() {
	running = false;
	if (racePromise != null) {
		console.log(racePromise);
		racePromise = null;
	}
	voice.speak('Race aborted.');
};

module.exports.finish = function finish() {

};

// Not yet in use
async function run() {
	while (running) {
		let elapsed = moment().diff(startTime);
		switch (raceState) {
			case RaceState.PREPARING.WATING_FOR_GAME_START:
			break;
			case RaceState.PREPARING.WAITING_FOR_RACE_START:
			break;
			case RaceState.PREPARING.CALCULATING:
			break;
			case RaceState.PREPARING.DONE:
			break;

			case RaceState.STARTING.WAITING_FOR_DELAY:
				crestPollInterval = 1000;
				if (!delayDone && elapsed >= ((startDelay - 4) * 1000)) {
					raceStartMoment = null;
					raceState = RaceState.STARTING.STARTING;
				} else {
					speakAnnouncements();
				}
			break;

			case RaceState.STARTING.STARTING:
				crestPollInterval = 100;
				if (raceStartMoment === null && elapsed >= (startDelay * 1000)) {
					raceStartMoment = moment();
				}
				if (nextStart < starts.length) {
					let start = starts[nextStart];
					if (elapsed >= (start.delay - 3 + startDelay) * 1000) {
						console.log('\n' + elapsed + ':');
						console.log(start);
						let names = '';
						let comma = '';
						for (let j = 0; j < start.drivers.length; j++) {
							names += comma;
							if (start.drivers[j].sounds !== undefined && start.drivers[j].sounds !== null) {
								names += start.drivers[j].sounds;
							} else {
								names += start.drivers[j].name;
							}
							comma = ', '
							checkStart(start.drivers[j].name, 3100);
						}
						voice.speak(names, 1 + start.drivers.length);
						voice.speak('1', 3, 2);
						voice.speak('Go!', 1, 3);
						nextStart++;
					}
					if (nextStart >= starts.length) {
						startDuration = start.delay * 1000 + 1000;
					}
				} else {
					if (elapsed >= startDuration) {
						raceState = RaceState.RUNNING;
						console.log('Race is now running.');
					}
				}
			break;

			case RaceState.RUNNING:
				crestPollInterval = 5000;
				speakAnnouncements();
			break;
			case RaceState.FINISHING.UPDATING_STANDINGS:
			break;
			case RaceState.FINISHING.DONE:
			break;
		}
		await sleep(100);
	}
}

function speakAnnouncements() {
	if (announcements.length > 0 && voice !== null) {
		voice.speak(announcements.shift());
	}
}

async function runRace(startDelay = 10) {
	raceState = RaceState.STARTING
	let startTime = moment();
	let nextStart = 0;
	let elapsed = 0;
	let delayDone = false;
	let letStartDuration = 0;
	// raceState = RaceState.STARTING.WAITING_FOR_DELAY;
	while (running) {
		let elapsed = moment().diff(startTime);
/**		switch (raceState) {
			case RaceState.STARTING.WAITING_FOR_DELAY:
				crestPollInterval = 1000;
				if (!delayDone && elapsed >= ((startDelay - 4) * 1000)) {
					delayDone = true;
					raceState = RaceState.STARTING.STARTING;
				}
			break;
			case RaceState.STARTING.STARTING:
				crestPollInterval = 100;
			break;
			case RaceState.RUNNING:
				crestPollInterval = 5000;
			break;
		}*/
		if (raceState === RaceState.STARTING) {
			if (!delayDone && elapsed >= (startDelay - 2) * 1000) {
				crestPollInterval = 100;
			}
			if (!delayDone && elapsed >= (startDelay * 1000)) {
				delayDone = true;
				raceStartMoment = moment();
			}
			if (nextStart < starts.length) {
				let start = starts[nextStart];
				if (elapsed >= (start.delay - 3 + startDelay) * 1000) {
					console.log('\n' + elapsed + ':');
					console.log(start);
					let names = '';
					let comma = '';
					for (let j = 0; j < start.drivers.length; j++) {
						names += comma;
						if (start.drivers[j].sounds !== undefined && start.drivers[j].sounds !== null) {
							names += start.drivers[j].sounds;
						} else {
							names += start.drivers[j].name;
						}
						comma = ', '
						checkStart(start.drivers[j].name, 3100);
					}
					voice.speak(names, 1 + start.drivers.length);
					voice.speak('1', 3, 2);
					voice.speak('Go!', 1, 3);

					nextStart++;
				}
				if (nextStart >= starts.length) {
					startDuration = start.delay * 1000 + 1000;
				}
			} else {
				if (elapsed >= startDuration) {
					raceState = RaceState.RUNNING;
					console.log('Race is now running.');
					crestPollInterval = 1000;
				}
			}
		} else if (raceState === RaceState.RUNNING) {
			if (announcements.length > 0) {
				voice.speak(announcements.shift());
			}
		}
		await sleep(100);
	}
}

async function checkStart(driver, delay_ms) {
	if (crestEnabled) {
		await sleep(delay_ms);	
		if (!currentMetrics.hasOwnProperty(driver.name)) {
			console.out('*** No driver named ' + driver.name + ' ***');
			return;
		}
		if (currentMetrics[driver.name].speed > 0) {
			console.out('False start by ' + driver.name);
			announcements.push('...' + driver.name + ' made a false start...');
		}	
	}
}

async function collectMetrics() {
	while (running) {
		if (raceState === RaceState.STARTING || raceState === RaceState.RUNNING) {
			axios.get(crestUrl + '?' + CrestParam.PARTICIPANTS).then(response => {
				var data = [];
				var p = response.data.participants;
				for (var i = 0; i < p.mNumParticipants; i++) {
					var metric = {};
					metric['name'] = steamToDiscord[p.mParticipantInfo[i].mName];
					metric['speed'] = p.mParticipantInfo[i].mSpeeds;
					data.push(metric);
				}
				var snap = {'time': moment().diff(raceStartMoment), 'data': data};
				metrics.push(snap);
				currentMetrics = snap;
			}).catch(error => {
				console.log(error);
			})
		}
		await sleep(crestPollInterval);
	}
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}




