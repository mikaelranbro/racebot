const moment = require('moment');
const axios = require('axios');
const settings = require('./settings.json');
const raceData = require('./race_data.js');
const fs = require('fs');
var voice = null;
var season = null;
var textChannel = null
var starts = null;
var running = false;
var raceOngoing = false; // first car has started, last has not finished
var racePromise = null;
var crestPromise = null;
var raceStartMoment = moment();
var previousAnnounce = moment();
var currentMetrics = null;
var eventInformation = null;
const crestUrl = 'http://localhost:8180/crest2/v1/api';

//	[steamName]: {'name':'', 'steamName':'' 'speed': 0, 'position': 0, 'lapsCompleted': 0, 'currentLap': 0, distance': 0, 'fastestLap': 1000}
const participants = {};
let nbrParticipants = 0;
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
	RUNNING: {
		SILENT: 'running silent',
		LOUD: 'running'
	},
	FINISHING: {
		UPDATING_STANDINGS: 'Updating standings',
		DONE: 'Race finished'
	},
	ABORTED: 'Race aborted'
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
module.exports.getState = function getState() {
	return raceState;
};


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

function getEventInformation() {
	return axios.get(crestUrl + '?' + CrestParam.EVENT_INFORMATION);
}

function prepareParticipants(data, minDiff) {
	for (var i = 0; i < data.mNumParticipants; i++) {
		var name = 'unknown';
		if (steamToDiscord.hasOwnProperty(data.mParticipantInfo[i].mName)) {
			name = steamToDiscord[data.mParticipantInfo[i].mName];
		} else {
			console.log('Unknown participant "' + data.mParticipantInfo[i].mName + '"');
			name = data.mParticipantInfo[i].mName;
		}
		var steam = data.mParticipantInfo[i].mName;
		participants[steam] = {};
		participants[steam].name = name;
		participants[steam].steamName = steam;
		participants[steam].speed = 0;
		participants[steam].currentLap = 0;
		participants[steam].completedLaps = 0;
		participants[steam].position = 0;
		participants[steam].lapDistance = 0;
		participants[steam].hasFinished = false;
	}
	nbrParticipants = data.mNumParticipants;

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


module.exports.start = async function start() {
	await this.abort();
	running = true;

	if (settings.crestEnabled) {
		metricsInterval = 1000;
		gameStateInterval = 1000;
		crestPromise = crestLoop();
	}
	racePromise = raceLoop();
	console.log('>----------------- Race initiated -----------------<');
	voice.speak('Race start initiated.')
};

module.exports.abort = async function abort() {
	if (racePromise !== null) {
		running = false;
		await racePromise;
		raceData.close();
		console.log('>------------------ Race aborted ------------------<');
		voice.speak('Race aborted.');
	}
};

module.exports.finish = async function finish() {
	voice.speak('Races cannot be finished.');
};

function speakAnnouncements() {
	var now = moment();
	if (announcements.length > 0 && voice !== null && now.diff(previousAnnounce) > 5000) {
		previousAnnounce = moment();
		voice.speak(announcements.shift(), voice.Priority.EVENTUAL);
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
			announcements.push('...' + driver.sounds + ' made a false start.');
			raceData.addPenalty(driver.steamName, raceData.Penalty.FALSE_START);
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
						participants[p.mParticipantInfo[i].mName].lapDistance = p.mParticipantInfo[i].mCurrentLapDistance;
						participants[p.mParticipantInfo[i].mName].fastestLap = p.mParticipantInfo[i].mFastestLapTimes;
						participants[p.mParticipantInfo[i].mName].car = p.mParticipantInfo[i].mCarNames;
						participants[p.mParticipantInfo[i].mName].raceState = p.mParticipantInfo[i].mRaceStates;
					}

					if (raceOngoing && settings.saveRaceData) {
						raceData.process(moment().diff(raceStartMoment), p.mParticipantInfo);
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
	raceOngoing = false;
	let stateTime = moment();
	stateTime = changeState(RaceState.PREPARING.WATING_FOR_GAME_START, stateTime);
	let startDelay = settings.startDelay;
	let nextStart = 0;
	collectMetrics = false;
	collectGameState = true;
	let hasExecutedStart = false;
	let reminderMoment = null;
	let welcomeDone = false;
	let explain = true;
	let nextExplain = 0;
	let hasDeclaredFalseStarts = false;
	while (running) {
		let elapsed = moment().diff(stateTime); // time in the current state
		switch (raceState) {
			case RaceState.PREPARING.WATING_FOR_GAME_START:
				if (currentPCState.gameState !== PC.GameState.GAME_EXITED) {
					stateTime = changeState(RaceState.PREPARING.WAITING_FOR_RACE_START, stateTime);
					reminderMoment = moment();
				} else {
					speakAnnouncements();
				}
				break;
			case RaceState.PREPARING.WAITING_FOR_RACE_START:
				collectMetrics = true;
				if (currentPCState.sessionState === PC.SessionState.SESSION_RACE &&
					currentPCState.raceState === PC.RaceState.RACESTATE_NOT_STARTED &&
					!welcomeDone) {
					var eventResponse = await getEventInformation();
					eventInformation = eventResponse.data.eventInformation;
					voice.speak('Welcome to ' + eventInformation.mTrackLocation + ' ' + eventInformation.mTranslatedTrackVariation, voice.Priority.NONSENSE);
					welcomeDone = true;
				}

				if (currentPCState.sessionState === PC.SessionState.SESSION_RACE &&
					currentPCState.raceState === PC.RaceState.RACESTATE_RACING) {
					if (!welcomeDone) {
						var eventResponse = await getEventInformation();
						eventInformation = eventResponse.data.eventInformation;
						voice.speak('Welcome to ' + eventInformation.mTrackLocation + ' ' + eventInformation.mTranslatedTrackVariation, voice.Priority.NONSENSE);
						welcomeDone = true;
					}
					stateTime = changeState(RaceState.PREPARING.CALCULATING, stateTime);
					nextExplain = 0;
				} else {
					var now = moment();
					if (now.diff(reminderMoment) > 20000) {
						reminderMoment = now;
						// explainProcedure(nextExplain++);
					} else {
						speakAnnouncements();
					}
				}
				break;
			case RaceState.PREPARING.CALCULATING:
				var response = await getParticipants();
				prepareParticipants(response.data.participants, settings.minStartDiff);
				raceData.init(eventInformation, participants);
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
					// console.log(elapsed + '   ' + name + ': ' + participants[name].speed);
					if (participants[name].speed > 1) {
						stateTime = moment();
						stationary = false;
						totalSpeed += participants[name].speed;
					}
				});
				if (elapsed > 1000 * settings.startTriggerTime) {
					stateTime = changeState(RaceState.STARTING.WAITING_FOR_DELAY, stateTime);
					voice.speak('Everyone in position. Get ready.', voice.Priority.CRITICAL);
				} else {
					var now = moment();
					if (now.diff(reminderMoment) > 30000) {
						reminderMoment = now;
						explain = true;
						checkOrder();
					} else {
						if (explain && now.diff(reminderMoment) > 15000) {
							explainProcedure(nextExplain++);
							explain = false;
						}
						speakAnnouncements();
					}
				}
				break;
			case RaceState.STARTING.WAITING_FOR_DELAY:
				metricsInterval = 1000;
				let driver = participants[starts[0].drivers[0].steamName];
				raceData.setStartPosition(driver.lapsCompleted, driver.lapDistance);
				if (elapsed >= ((startDelay - settings.startSilenceBuffer) * 1000)) {
					raceStartMoment = null;
					stateTime = changeState(RaceState.STARTING.EXECUTING, stateTime);
					voice.speak('Attention!', voice.Priority.CRITICAL, 3);
				} else {
					speakAnnouncements();
				}
				break;
			case RaceState.STARTING.EXECUTING:
				// Entered startSilenceBuffer seconds before first start
				metricsInterval = 100;

				if (!hasExecutedStart) {
					hasExecutedStart = true;
					executeStarts(settings.startSilenceBuffer * 1000);
				}
				if (elapsed > (settings.startSilenceBuffer + starts[starts.length - 1].delay) * 1000) {
					console.log(elapsed + ' >= ' + settings.startSilenceBuffer * 1000);
					stateTime = changeState(RaceState.RUNNING.SILENT, stateTime);
				}
				break;
			case RaceState.RUNNING.SILENT:
				metricsInterval = 1000;
				if (elapsed > 10000) {
					stateTime = changeState(RaceState.RUNNING.LOUD, stateTime);
				}
				break;
			case RaceState.RUNNING.LOUD:
				metricsInterval = 1000;
				if (!hasDeclaredFalseStarts) {
					hasDeclaredFalseStarts = true;
					if (raceData.penalties.length === 0) {
						voice.speak('Everyone started in good order. Well done!');
					}
				}
				let stillRacing = false;
				Object.keys(participants).forEach((steamName) => {
					let p = participants[steamName];
					if (p.raceState === PC.RaceState.RACESTATE_RACING) {
						stillRacing = true;
					} else if (p.hasFinished === false) {
						p.hasFinished = true;
						voice.speak(p.name + ' has finished ' + voice.getPosition(p.position, nbrParticipants), voice.Priority.EVENTUAL);
					}
				});
				if (stillRacing) {
					speakAnnouncements();
				} else {
					console.log('Race finished. Game RaceState: ' + currentPCState.raceState);
					stateTime = changeState(RaceState.FINISHING.UPDATING_STANDINGS, stateTime);
				}
				break;
			case RaceState.FINISHING.UPDATING_STANDINGS:
				raceOngoing = false;
				voice.speak('Race finished.');
				raceData.close();
				stateTime = changeState(RaceState.FINISHING.DONE, stateTime);
				break;
			case RaceState.FINISHING.DONE:
				raceOngoing = false;
				collectMetrics = false;
				running = false;
				break;
		}
		await sleep(100);
	}
	raceOngoing = false;
	if (RaceState !== RaceState.FINISHING.DONE) {
		changeState(RaceState.ABORTED, stateTime);
	}
	racePromise = null;
}



async function executeStarts(timeUntilStart) {
	raceOngoing = false;
	let nextStart = 0;
	let timeElapsed = 0;
	let initMoment = moment.now();
	console.log('Starting in ' + timeUntilStart + ' ms');

	while (nextStart < starts.length && running) {
		let start = starts[nextStart];
		let now = moment();
		timeElapsed = now.diff(initMoment);
		console.log('\n' + timeElapsed + ':');
		let leftToStart = timeUntilStart + start.delay * 1000 - timeElapsed;
		executeStart(start, leftToStart);
		await sleep(leftToStart);
		if (!raceOngoing) {
			console.log('>----------- Race Start -----------<');
			raceOngoing = true;
			raceStartMoment = moment();
		}
		nextStart++;
	}
}

function executeStart(start, leftToStart) {
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
		checkStart(start.drivers[j], leftToStart + 100);
	}
	if (leftToStart > 3000) {
		voice.speak(names, voice.Priority.CRITICAL, 1 + start.drivers.length, leftToStart - 3000);
	} else {
		voice.speak(names, voice.Priority.CRITICAL, 1 + start.drivers.length);
	}
	voice.play('sfx/start_1_1.wav', voice.Priority.CRITICAL, leftToStart - 1000);
}

function explainProcedure(step) {
	switch (step) {
		case 0:
			voice.speak('I will explain the start procedure... When your name is called, you are next and will start within 3 seconds.', voice.Priority.INFO);
			break;
		case 1:
			voice.speak('So,. after your name, there will be two beeps. Start on the second beep.', voice.Priority.EVENTUAL);
			voice.play('sfx/start_1_1.wav', voice.Priority.EVENTUAL, 500);
			break;
		case 2:
			voice.speak('I repeat, after your name there will be two beeps.', voice.Priority.EVENTUAL);
			voice.play('sfx/start_1_1.wav', voice.Priority.EVENTUAL, 500);
			voice.speak('Start on the second beep.', voice.Priority.EVENTUAL, 0, 5000);
			break;
		case 3:
			voice.speak('There can be multiple names on the same start time. They all start on the same beeps.', voice.Priority.EVENTUAL);
			break;
		case 4:
			voice.speak('Example.', voice.Priority.EVENTUAL);
			voice.speak('Håkan, Staffan', voice.Priority.CRITICAL, 3, 2000);
			voice.play('sfx/start_1_1.wav', voice.Priority.CRITICAL, 4000);
			break;
	}
}

function checkOrder() {
	var correct = true;
	var text = '';
	for (let i = 0; i < startOrder.length; i++) {
		if (participants[startOrder[i].steamName].position !== (i + 1)) {
			correct = false;
			text += startOrder[i].sounds + ', ';
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