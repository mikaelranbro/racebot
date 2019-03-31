const fs = require('fs');
const moment = require('moment');
const settings = require('./settings.json');
let fileStream = null;
let index = {};
let participants = null;
let lapTimes = [];
let nbrParticipants = 0;
let order = [];
let trackLength = 0;
let laps = 0;
let firstProcess = false;
let snapshot = {};
let startPosition = {
	'lap': settings.nbrFormationLaps,
	'lapDistance': 0
};
const penalties = []; // {name, penalty}
module.exports.penalties = penalties;

Penalty = {
	UNKNOWN: 0,
	FALSE_START: 1,
};
module.exports.Penalty = Penalty;

module.exports.init = function init(eventInfo, participants_) {
	if (fileStream !== null) {
		close();
	}
	trackLength = eventInfo.mTrackLength;
	laps = eventInfo.mLapsInEvent;
	participants = participants_;
	penalties.length = 0;

	let path = 'race_data/' + moment().format('YYYYMMDD') + '_' + eventInfo.mTrackLocation + '_' + eventInfo.mTrackVariation + '.json';
	fileStream = fs.createWriteStream(path);
	fileStream.write('{\n\t"eventInformation": ');
	fileStream.write(JSON.stringify(eventInfo));
	let i = 0;
	Object.keys(participants).forEach((name) => {
		participants[name].index = i;
		index[participants[name].steamName] = i;
		order.push(participants[name].steamName);
		i++;
	});
	nbrParticipants = i;
	fileStream.write(',\n\t"participants": ' + JSON.stringify(order))
	fileStream.write(',\n\t"distance": [');
	firstProcess = true;
};

module.exports.setStartPosition = function setStartPosition(lap, lapDistance) {
	startPosition.lap = lap;
	startPosition.lapDistance = lapDistance;
}

module.exports.addPenalty = function addPenalty(name, penalty) {
	penalties.push({
		name,
		penalty
	});
}

module.exports.process = function process(timestamp, info) {
	if (fileStream === null) return;
	let d = [];
	for (let i = 0; i < info.length; i++) {
		snapshot[info[i].mName] = {};
		let s = snapshot[info[i].mName];
		s.lapDistance = Math.round(info[i].mCurrentLapDistance);
		s.position = info[i].mPosition;
		s.fastestLap = info[i].mFastestLapTimes;
		s.speed = info[i].mSpeeds;
		s.lapsCompleted = info[i].mLapsCompleted;
		s.raceState = info[i].mRaceStates;
		s.distance = Math.round(s.lapDistance + (s.lapsCompleted - startPosition.lap) * trackLength - startPosition.lapDistance);
	}
	d.push(timestamp);
	for (let j = 0; j < order.length; j++) {
		d.push(snapshot[order[j]].distance);
	}
	if (firstProcess) {
		fileStream.write('\n\t\t' + JSON.stringify(d));
		firstProcess = false;
	} else {
		fileStream.write(',\n\t\t' + JSON.stringify(d));
	}
	// console.log(timestamp + ': ' + JSON.stringify(d));
};

function close() {
	if (fileStream !== null) {
		fileStream.write('\n\t]')
		if (lapTimes !== null) {
			fileStream.write(',\n\t"lapTimes": ');
			fileStream.write(JSON.stringify(lapTimes));
		}
		if (participants !== null) {
			fileStream.write(',\n\t"results":');
			fileStream.write(JSON.stringify(snapshot));
		}
		fileStream.write(',\n\t"penalties":');
		fileStream.write(JSON.stringify(penalties));
		fileStream.end('\n}');
		fileStream = null;
	}
}
module.exports.close = close;