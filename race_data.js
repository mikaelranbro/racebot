const fs = require('fs');
const moment = require('moment');
const settings = require('./settings.json');
let fileStream = null;
let filename = 'unknown_data.js';
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
	'lapDistance': 0,
	'set': false
};
module.exports.filename = filename;

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

	filename = 'race_data/' + moment().format('YYYYMMDD') + '_' + eventInfo.mTrackLocation + '_' + eventInfo.mTrackVariation + '.js';
	fileStream = fs.createWriteStream(filename);
	fileStream.write('var eventInformation= ');
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
	startPosition.set = false;
	fileStream.write(';\nvar participants= ' + JSON.stringify(order));
};

module.exports.setStartPosition = function setStartPosition(lap, lapDistance) {
	if (!startPosition.set) {
		console.log('Setting start position to lap ' + lap + ' distance ' + lapDistance);
		startPosition.lap = lap;
		startPosition.lapDistance = lapDistance;
		startPosition.set = true;
	}
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
		if (!startPosition.set) {
			let maxLap = 0;
			let maxD = 0;
			let maxTotal = 0;
			for (let i = 0; i < info.length; i++) {
				let d = info[i].mCurrentLapDistance + s.lapsCompleted * trackLength;
				if (d >= maxTotal) {
					maxTotal = d;
					maxLap = info[i].lapsCompleted;
					maxD = info[i].mCurrentLapDistance;
				}
			}
			console.log('Calculated start position to lap ' + maxLap + ' distance ' + maxD);
			startPosition.lap = maxLap;
			startPosition.lapDistance = maxD;
			startPosition.set = true;
		}

		startTime = moment();
		fileStream.write(';\nvar startTime= "' + startTime.format('YYYYMMDDTHHmmss') + '"') ;
		fileStream.write(';\nvar startPosition= ' + JSON.stringify(startPosition));
		fileStream.write(';\nvar data= [');
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
			s.distance = Math.round(s.lapDistance + (s.lapsCompleted - startPosition.lap) * trackLength);
			s.timestamp = timestamp;
			s.worldPos = info[i].mWorldPosition;
			s.orientation = info[i].mOrientations;
			s.speed = info[i].mSpeeds;

			if (!firstTick && s.lapsCompleted !== prev.lapsCompleted && s.lapsCompleted > startPosition.lap) {
				lapTimes[name].push(s.lastLap);
				console.log('Player ' + name + ' finished lap ' + (s.lapsCompleted - startPosition.lap) + ' in ' + s.lastLap + ' seconds.');
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
			fileStream.write('\n\t' + JSON.stringify(d));
			firstTick = false;
		} else {
			fileStream.write(',\n\t' + JSON.stringify(d));
		}
	} else {
		console.log('Noone is racing anymore.');
		close();
	}
	// console.log(timestamp + ': ' + JSON.stringify(d));
};

function close() {
	if (fileStream !== null) {
		fileStream.write(']');
		if (lapTimes !== null) {
			fileStream.write(';\nvar lapTimes = ');
			fileStream.write(JSON.stringify(lapTimes));
		}
		if (snapshot !== null) {
			fileStream.write(';\nvar results = ');
			fileStream.write(JSON.stringify(snapshot));
		}
		if (prevSnap !== null) {
			fileStream.write(';\nvar last = ');
			fileStream.write(JSON.stringify(prevSnap));
		}
		fileStream.write(';\nvar penalties = ');
		fileStream.write(JSON.stringify(penalties));
		fileStream.write(';\nvar dataLoaded = true');
		fileStream.end(';');
		fileStream = null;
	}
	return filename;
}
module.exports.close = close;

module.exports.getResults = function getResults() {
	return snapshot;
};