const fs = require('fs');
const moment = require('moment');
const settings = require('./settings.json');
let fileStream = null;
let index = {};
let participants = null;
let lapTimes = {};
let nbrParticipants = 0;
let order = [];
let trackLength = 0;
let laps = 0;
let firstTick = false;
let startTime = null;
let snapshot = {};
let prevSnap = {};
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
	order.length = 0;
	laps = 0;
	index = {};
	firstTick = true;

	let path = 'race_data/' + moment().format('YYYYMMDD') + '_' + eventInfo.mTrackLocation + '_' + eventInfo.mTrackVariation + '.json';
	fileStream = fs.createWriteStream(path);
	fileStream.write('{\n\t"eventInformation": ');
	fileStream.write(JSON.stringify(eventInfo));
	let i = 0;

	Object.keys(participants).forEach((name) => {
		participants[name].index = i;
		index[participants[name].steamName] = i;
		order.push(participants[name].steamName);
		lapTimes[name] = [];
		i++;
	});
	nbrParticipants = i;
	fileStream.write(',\n\t"participants": ' + JSON.stringify(order))
	fileStream.write(',\n\t"distance": [');
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

module.exports.tick = function tick(timestamp, info) {
	if (fileStream === null) return;
	let stillRacing = false;
	let d = [];
	// console.log(info.length);
	if (firstTick) {
		startTime = moment();
	}
	for (let i = 0; i < info.length; i++) {
		if ((firstTick || snapshot[info[i].mName].raceState === 2) && info[i].mRacePosition !== 0) {
			let name = info[i].mName;
			if (!firstTick) {
				prevSnap[name] = snapshot[name];
			}
			let prev = prevSnap[name];
			snapshot[name] = {};
			let s = snapshot[name];
			s.lapDistance = Math.round(info[i].mCurrentLapDistance);
			s.position = info[i].mRacePosition;
			s.fastestLap = info[i].mFastestLapTimes;
			s.lastLap = info[i].mLastLapTimes;
			s.speed = info[i].mSpeeds;
			s.lapsCompleted = info[i].mLapsCompleted;
			s.raceState = info[i].mRaceStates;
			s.distance = Math.round(s.lapDistance + (s.lapsCompleted - startPosition.lap) * trackLength - startPosition.lapDistance);
			s.timestamp = timestamp;
			s.worldPos = info[i].mWorldPosition;
			s.orientation = info[i].mOrientations;
			s.speed = info[i].mSpeeds;

			if (!firstTick && s.lapsCompleted !== prev.lapsCompleted && s.lapsCompleted > startPosition.lap) {
				lapTimes[name].push(s.lastLap);
				console.log('Player ' + info[i].mName + ' finished lap ' + s.lapsCompleted + ' in ' + s.lastLap + ' seconds.');
			}
			stillRacing = true;
		} else {
			// console.log('Player ' + info[i].mName + ' not racing. RaceState: ' + info[i].mRaceStates);
		}
	}

	if (stillRacing) {
		// process.stdout.write('.');
		d.push(timestamp);
		for (let j = 0; j < order.length; j++) {
			let pData = [];
			pData.push(snapshot[order[j]].distance);
			pData.push(snapshot[order[j]].speed);
			pData.push(snapshot[order[j]].worldPos);
			pData.push(snapshot[order[j]].orientation);
			d.push(pData);
		}
		if (firstTick) {
			fileStream.write('\n\t\t' + JSON.stringify(d));
			firstTick = false;
		} else {
			fileStream.write(',\n\t\t' + JSON.stringify(d));
		}
	} else {
		console.log('Noone is racing anymore.');
	}
	// console.log(timestamp + ': ' + JSON.stringify(d));
};

function close() {
	if (fileStream !== null) {
		fileStream.write('\n\t]');
		fileStream.write(',\n\t"startPosition": ');
		fileStream.write(JSON.stringify(startPosition));
		fileStream.write(',\n\t"startTime": ');
		fileStream.write(JSON.stringify(startTime));
		if (lapTimes !== null) {
			fileStream.write(',\n\t"lapTimes": ');
			fileStream.write(JSON.stringify(lapTimes));
		}
		if (snapshot !== null) {
			fileStream.write(',\n\t"results":');
			fileStream.write(JSON.stringify(snapshot));
		}
		if (prevSnap !== null) {
			fileStream.write(',\n\t"last":');
			fileStream.write(JSON.stringify(prevSnap));
		}
		fileStream.write(',\n\t"penalties":');
		fileStream.write(JSON.stringify(penalties));
		fileStream.end('\n}');
		fileStream = null;
	}
}
module.exports.close = close;