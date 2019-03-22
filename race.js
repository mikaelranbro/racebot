const moment = require('moment');
const axios = require('axios');
const settings = require('./settings.json');
var voice = null;
var season = null;
var textChannel = null
var starts = null;
var running = false;
var racePromise = null;
var crestPromise = null;
var raceStartMoment = moment();
var currentMetrics = null;
var track = {};
const crestUrl = 'http://localhost:8180/crest2/v1/api';

//	[steamName]: {'name':'', 'steamName':'' 'speed': 0, 'position': 0, 'lapsCompleted': 0, 'currentLap': 0, distance': 0, 'fastestLap': 1000}
const participants = {};
const steamToDiscord = {};
const discordToSteam = {};
const announcements = [];

let collectMetrics = false;
let collectGameState = true;
let metricsInterval = 1000;
let gameStateInterval = 1000;

const PC = {
	"GameState": {
		"GAME_EXITED": 0,
		"GAME_FRONT_END": 1,
		"GAME_INGAME_PLAYING": 2,
		"GAME_INGAME_PAUSED": 3,
		"GAME_INGAME_INMENU_TIME_TICKING": 4,
		"GAME_INGAME_RESTARTING": 5,
		"GAME_INGAME_REPLAY": 6,
		"GAME_FRONT_END_REPLAY": 7,
		"GAME_MAX": 8
	},
	"SessionState": {
		"SESSION_INVALID": 0,
		"SESSION_PRACTICE": 1,
		"SESSION_TEST": 2,
		"SESSION_QUALIFY": 3,
		"SESSION_FORMATION_LAP": 4,
		"SESSION_RACE": 5,
		"SESSION_TIME_ATTACK": 6,
		"SESSION_MAX": 7
	},
	"RaceState": {
		"RACESTATE_INVALID": 0,
		"RACESTATE_NOT_STARTED": 1,
		"RACESTATE_RACING": 2,
		"RACESTATE_FINISHED": 3,
		"RACESTATE_DISQUALIFIED": 4,
		"RACESTATE_RETIRED": 5,
		"RACESTATE_DNF": 6,
		"RACESTATE_MAX": 7
	}
}
let currentPCState = {
	'gameState': PC.GameState.GAME_EXITED,
	'sessionState': PC.SessionState.SESSION_INVALID,
	'raceState': PC.RaceState.RACESTATE_INVALID
};

const RaceState = {
	PENDING: 'pending',
	PREPARING: {
		WATING_FOR_GAME_START: 'Waiting for game',
		WAITING_FOR_RACE_START: 'Waiting for race start',
		CALCULATING: 'Calculating start order',
		DONE: 'Ready to start race'
	},
	STARTING: {
		WAITING_FOR_POSITIONING: 'Waiting for positioning',
		WAITING_FOR_DELAY: 'Waiting for delay',
		EXECUTING: 'Starting'
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

	Object.keys(season.drivers).forEach(function(key) {
		var driver = season.drivers[key];
		steamToDiscord[driver.steamName] = driver.name;
		discordToSteam[driver.name] = driver.steamName;
	});
};

const metrics = [];
module.exports.metrics = metrics;


function getParticipants() {
	return axios.get(crestUrl + '?' + CrestParam.PARTICIPANTS);
}

function prepareParticipants(data, minDiff) {
	for (var i = 0; i < data.mNumParticipants; i++) {
		if (typeof steamToDiscord[data.mParticipantInfo[i].mName] === undefined) {
			console.log('Unknown participant "' + data.mParticipantInfo[i].mName + '"');
		} else {
			var steam = data.mParticipantInfo[i].mName;
			var name = steamToDiscord[data.mParticipantInfo[i].mName];
			participants[steam] = {};
			participants[steam].name = name;
			participants[steam].steamName = steam;
			participants[steam].speed = 0;
			participants[steam].currentLap = 0;
			participants[steam].position = 0;
			participants[steam].distance = 0;
		}
	}

	startOrder = [];
	starts = season.getStartOrder(minDiff, participants);
	starts.forEach((start) => {
		start.done = false;
		start.drivers.forEach((driver) => {
			startOrder.push(driver);
		});
	});
}

function prepare(minDiff = settings.minStartDiff) {
	var s = season.getStartOrder(minDiff);

	var msg = 'Start order:\n==================================\n';
	for (var i = 0; i < s.length; i++) {
		var padding = '';
		msg += ('    +' + s[i].delay).slice(-4) + ': ';
		for (var j = 0; j < s[i].drivers.length; j++) {
			msg += padding + s[i].drivers[j].name + '\n';
			padding = '      ';
		}
	}
	msg += '==================================';
	return msg;
}
module.exports.prepare = prepare;


module.exports.start = function start() {
	if (this.running) {
		this.abort();
	}
	running = true;

	if (settings.crestEnabled) {
		metricsInterval = 1000;
		gameStateInterval = 1000;
		crestPromise = crestLoop();
	}
	racePromise = raceLoop();
	console.log("Race start initiated");
};

module.exports.abort = function abort() {
	running = false;
	console.log('Race aborted');
	voice.speak('Race aborted.');
};

module.exports.finish = function finish() {
	running = false;
};

function speakAnnouncements() {
	if (announcements.length > 0 && voice !== null) {
		voice.speak(announcements.shift());
	}
}

async function checkStart(driver, delay_ms) {
	if (settings.crestEnabled) {
		await sleep(delay_ms);
		if (!participants.hasOwnProperty(driver.steamName)) {
			console.log('*** No driver named ' + driver.steamName + ' ***');
			return;
		}
		if (participants[driver.steamName].speed > 1) {
			console.log('False start by ' + driver.name);
			announcements.push('...' + driver.name + ' made a false start...');
		} else {
			console.log('Ok start by ' + driver.name);
		}
	}
}


async function crestLoop() {
	var time = moment();
	var gameStateAge = 0;
	var metricsAge = 0;
	while (running) {
		var newTime = moment();
		var elapsed = newTime.diff(time);
		time = newTime;

		gameStateAge += elapsed;
		if (collectGameState) {

			if (gameStateAge > gameStateInterval) {
				// console.log('Collecting gameState, ' + gameStateAge + 'ms since last time.');
				gameStateAge = 0;
				axios.get(crestUrl + '?' + CrestParam.GAME_STATES).then(response => {
					if (currentPCState.gameState !== response.data.gameStates.mGameState ||
						currentPCState.sessionState !== response.data.gameStates.mSessionState ||
						currentPCState.raceState !== response.data.gameStates.mRaceState) {
						currentPCState.gameState = response.data.gameStates.mGameState;
						currentPCState.sessionState = response.data.gameStates.mSessionState;
						currentPCState.raceState = response.data.gameStates.mRaceState;
						console.log(currentPCState);
					}
				}).catch(error => {
					// console.log(error);
				})
			}
		}
		metricsAge += elapsed;
		if (collectMetrics) {
			if (metricsAge > metricsInterval) {
				// console.log('Collecting metrics, ' + metricsAge + 'ms since last time.');
				metricsAge = 0;
				axios.get(crestUrl + '?' + CrestParam.PARTICIPANTS).then(response => {
					var p = response.data.participants;
					for (var i = 0; i < p.mNumParticipants; i++) {
						participants[p.mParticipantInfo[i].mName].speed = p.mParticipantInfo[i].mSpeeds;
						participants[p.mParticipantInfo[i].mName].lap = p.mParticipantInfo[i].mCurrentLap;
						participants[p.mParticipantInfo[i].mName].position = p.mParticipantInfo[i].mRacePosition;
						participants[p.mParticipantInfo[i].mName].currentLap = p.mParticipantInfo[i].mCurrentLap;
						participants[p.mParticipantInfo[i].mName].lapsCompleted = p.mParticipantInfo[i].mLapsCompleted;
						participants[p.mParticipantInfo[i].mName].distance = p.mParticipantInfo[i].mCurrentLapDistance;
						participants[p.mParticipantInfo[i].mName].fastestLap = p.mParticipantInfo[i].mFastestLapTimes;
						participants[p.mParticipantInfo[i].mName].car = p.mParticipantInfo[i].mCarNames;
					}
				}).catch(error => {
					// console.log(error);
				})
			}
		}
		await sleep(settings.crestTickInterval);
	}
}

function changeState(newState, oldTime) {
	var time = oldTime;
	if (newState !== raceState) {
		time = moment();
		console.log('[' + time.format('HH:mm:ss.SSS') + '] "' + raceState + '" => "' + newState + '"');
		// announcements.push(newState);
		raceState = newState;
	}
	return time;
}

async function raceLoop() {

	var stateTime = moment();
	stateTime = changeState(RaceState.PREPARING.WATING_FOR_GAME_START, stateTime);
	var startDelay = settings.startDelay;
	var nextStart = 0;
	collectMetrics = false;
	collectGameState = true;
	var reminderMoment = null;
	while (running) {
		let elapsed = moment().diff(stateTime); // time in the current state
		switch (raceState) {
			case RaceState.PREPARING.WATING_FOR_GAME_START:
				if (currentPCState.gameState !== PC.GameState.GAME_EXITED) {
					stateTime = changeState(RaceState.PREPARING.WAITING_FOR_RACE_START, stateTime);
				} else {
					speakAnnouncements();
				}
				break;
			case RaceState.PREPARING.WAITING_FOR_RACE_START:
				collectMetrics = true;
				if (currentPCState.sessionState === PC.SessionState.SESSION_RACE &&
					currentPCState.raceState == PC.RaceState.RACESTATE_RACING) {
					stateTime = changeState(RaceState.PREPARING.CALCULATING, stateTime);
				} else {
					speakAnnouncements();
				}
				break;
			case RaceState.PREPARING.CALCULATING:
				var response = await getParticipants();
				prepareParticipants(response.data.participants, settings.minStartDiff);
				stateTime = changeState(RaceState.PREPARING.DONE, stateTime);
				break;
			case RaceState.PREPARING.DONE:
				stateTime = changeState(RaceState.STARTING.WAITING_FOR_POSITIONING, stateTime);
				var text = 'Line up in the following order..';
				startOrder.forEach((driver) => {
					text += ', ' + driver.sounds;
				});
				reminderMoment = moment();
				voice.speak(text);
				break;
			case RaceState.STARTING.WAITING_FOR_POSITIONING:
				var totalSpeed = 0;
				var stationary = true;
				metricsInterval = 1000;
				collectMetrics = true;
				Object.keys(participants).forEach((name) => {
					console.log(elapsed + '   ' + name + ': ' + participants[name].speed);
					if (participants[name].speed > 1) {
						stateTime = moment();
						stationary = false;
						totalSpeed += participants[name].speed;
					}
				});
				if (elapsed > 1000 * settings.startTriggerTime) {
					stateTime = changeState(RaceState.STARTING.WAITING_FOR_DELAY, stateTime);
					voice.speak('Everyone in position. Get ready.');
				} else {
					var now = moment();
					if (now.diff(reminderMoment) > 15000) {
						reminderMoment = now;
						checkOrder();
					} else {
						speakAnnouncements();
					}
				}
				break;
			case RaceState.STARTING.WAITING_FOR_DELAY:
				metricsInterval = 1000;
				if (elapsed >= ((startDelay - 4) * 1000)) {
					raceStartMoment = null;
					stateTime = changeState(RaceState.STARTING.EXECUTING, stateTime);
				} else {
					speakAnnouncements();
				}
				break;
			case RaceState.STARTING.EXECUTING:
				metricsInterval = 100;
				if (raceStartMoment === null && elapsed >= (startDelay * 1000)) {
					raceStartMoment = moment();
				}
				if (nextStart < starts.length) {
					let start = starts[nextStart];
					if (elapsed >= (start.delay + 1) * 1000) {
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
							checkStart(start.drivers[j], 3100);
						}
						voice.speak(names, 1 + start.drivers.length);
						voice.speak('1', 3, 2);
						voice.speak('Go!', 1, 3, 100);
						nextStart++;
					}
					if (nextStart >= starts.length) {
						startDuration = start.delay * 1000 + 1000;
					}
				} else {
					if (elapsed >= startDuration) {
						stateTime = changeState(RaceState.RUNNING, stateTime);
					}
				}
				break;

			case RaceState.RUNNING:
				metricsInterval = 1000;
				speakAnnouncements();
				if (currentPCState.raceState === PC.RaceState.RACESTATE_FINISHED) {
					stateTime = changeState(RaceState.FINISHING.UPDATING_STANDINGS, stateTime);
				}
				break;
			case RaceState.FINISHING.UPDATING_STANDINGS:
				speakAnnouncements();
				stateTime = changeState(RaceState.FINISHING.DONE, stateTime);
				break;
			case RaceState.FINISHING.DONE:
				collectMetrics = false;
				running = false;
				break;
		}
		await sleep(100);
	}
}

function checkOrder() {
	var correct = true;
	var text = '';
	for (let i = 0; i < startOder.length; i++) {
		if (participants[startOrder[i].steamName].position !== (i + 1)) {
			correct = false;
			text += startOder[i].sounds + ', ';
		}
	}
	if (!correct) {
		text += ' you are in the wrong order. The correct order is '
		startOrder.forEach((driver) => {
			text += ', ' + driver.sounds;
		});
		voice.speak(text);
	}
}


function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}