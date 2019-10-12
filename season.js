const fs = require('fs');
const settings = require('./settings.json');
const moment = require('moment');
let drivers = JSON.parse(fs.readFileSync('drivers.json'));
let schedule = JSON.parse(fs.readFileSync('schedule.json'));
let nbrDrivers = Object.keys(drivers).length;
let nextRace = null;

// Backup
if (!fs.existsSync('backup')) {
	fs.mkdirSync('backup');
}
fs.copyFile('drivers.json', ('backup/drivers_' + moment().format('YYYYMMDD_HHmmss') + '.json'), (err) => {
	if (err) throw err;
	console.log('Made backup of drivers.');
});

function sortDrivers() {
	let newDrivers = {};
	for (i = 1; i <= nbrDrivers; i++) {
		Object.keys(drivers).forEach(function(key) {
			if (drivers[key].position === i) {
				newDrivers[key] = drivers[key];
			}
		});
	}
	drivers = newDrivers;
}
sortDrivers();
module.exports.drivers = drivers;

function sortDriversOnPoints() {
	let unsorted = [];
	Object.keys(drivers).forEach(function(key) {
		unsorted.push(drivers[key]);
	});
	let sorted = unsorted.sort((a,b) => {
		return b.points - a.points;
	});
	drivers = {};
	let i = 1;
	sorted.forEach(driver => {
		driver.position = i;
		delete driver.startPosition;
		i++;
		drivers[driver.name] = driver;
	});
}

function parseSchedule() {
	let nextMoment = moment("20401010", "YYYYMMDD");
	Object.keys(schedule).forEach(function(key) {
		let race = schedule[key];
		race.moment = moment(race.date);
		race.id = key;
		if ((race.state === 'upcoming' || race.state === 'ongoing') && race.moment.isBefore(nextMoment)) {
			nextRace = race;
			module.exports.nextRace = nextRace;
			nextMoment = race.moment;
		}
	});
	console.log(JSON.stringify(nextRace));
}
module.exports.parseSchedule = parseSchedule;
parseSchedule();
module.exports.schedule = schedule;
module.exports.nextRace = nextRace;



// Code blocks: surround by ``` or `
// *italics*
// **bold**
module.exports.getTable = function getTable() {
	let i = 1;
	let now = moment();
	let output = 'Standings:\n==================================';
	Object.keys(drivers).forEach(function(key) {
		let entry = drivers[key];
		output += '\n' + i + ": **" + entry.name + '** - ' + entry.points + ' points';
		i++;
	});
	output += '\n==================================';
	output += '\n*Next race: ' + nextRace.track + '  (';
	let duration = moment.duration(nextRace.moment.diff(now));
	output += duration.humanize(true);
	output += ')*';
	return output;
};

module.exports.getSchedule = function getSchedule() {
	var output = 'Schedule:\n==================================';
	Object.keys(schedule).forEach(function(key) {
		let race = schedule[key];
		if (race.id === nextRace.id) {
			let duration = moment.duration(nextRace.moment.diff(moment()));
			output += '\n**' + race.moment.format('DD/MM HH:mm:  ') + race.track + '**  (' + duration.humanize(true) + ')';
		} else {
			output += '\n' + race.moment.format('DD/MM HH:mm:  ') + race.track
		}
		if (race.state !== 'upcoming') {
			output += '  [' + race.state + ']'
		}
	});
	output += '\n==================================';
	return output;
};

function getDriver(name) {
	let driver = null;
	if (drivers.hasOwnProperty(name)) {
		return drivers[name];
	} else {
		Object.keys(drivers).forEach((key) => {
			if (driver === null && (drivers[key].steamName.toLowerCase() == name.toLowerCase()) ||
				(key.toLowerCase() == name.toLowerCase())) {
				driver = drivers[key];
			}
		});
	}
	return driver;
}
module.exports.getDriver = getDriver;

module.exports.getStartOrder = function getStartOrder(minDiff = 3, participants = null) {
	var keys = Object.keys(drivers);
	// console.log('-------------------\nKeys:\n' + keys);	
	//var offset = drivers[keys[nbrDrivers - 1]].points;
	var offset = -1;
	var starts = [];
	var currentStart = {
		"delay": 0,
		"gap": 0,
		"drivers": []
	};
	i = nbrDrivers;
	var delay = 0;
	var startPos = 1;
	while (i > 0) {
		i--;
		let driver = drivers[keys[i]];
		if (participants === null || participants.hasOwnProperty(driver.steamName)) {
			if (offset < 0) {
				offset = driver.points;
			}
			driver.startPosition = startPos;
			startPos++;
			let gap = (driver.points - offset) * settings.secondsPerPoint - delay;
			console.log(driver.name + ' ... Delay: ' + delay + ', offset: ' + offset + ', gap: ' + gap);
			if (gap >= minDiff) {
				starts.push(currentStart);
				delay = delay + gap;
				currentStart = {
					"delay": delay,
					"gap": gap,
					"drivers": []
				};
			}
			currentStart.drivers.push(driver);
		} else {
			console.log(driver.name + ' (' + driver.steamName + ') is not present.');
		}
	}
	starts.push(currentStart);
	console.log('-------------------\nStarts:');
	console.log(starts);
	return starts;
};

function getNextEvent() {
	let nextMoment = moment("20401010", "YYYYMMDD");
	let nRace = null;
	Object.keys(schedule).forEach(key => {
		if ((schedule[key].state === 'upcoming') && schedule[key].moment.isBefore(nextMoment)) {
			nRace = schedule[key];
			nextMoment = schedule[key].moment;
		}
	});
	return nRace;
}
module.exports.getNextEvent = getNextEvent;

module.exports.register = function register(user, steamName, sounds) {
	console.log('Registring user ' + user.username + ' as ' + steamName + ', ' + sounds);
	var driver;
	let now = moment();
	if (drivers.hasOwnProperty(user.username)) {
		driver = drivers[user.username];
	} else {
		drivers[user.username] = {};
		drivers[user.username].name = user.username;
		drivers[user.username].steamName = user.username;
		drivers[user.username].points = 0;
		drivers[user.username].position = Object.keys(drivers).length;
		drivers[user.username].car = null;
		drivers[user.username].sounds = user.username;
		drivers[user.username].seen = now.format('YYYYMMDDTHHmmss');
		drivers[user.username].greeted = now.format('YYYYMMDDTHHmmss');
		driver = drivers[user.username];
	}
	if (steamName !== undefined) {
		driver.steamName = steamName;
	}
	if (sounds !== undefined) {
		driver.sounds = sounds;
	}
	nbrDrivers = Object.keys(drivers).length;
	this.save();
};

module.exports.updateStandings = function updateStandings(results, eventInformation) {
	let commit = true;
	let multiplier = 1;
	let minNbrLaps = 15;
	let bonusPoints = [1];
	if (settings.practiceMode === true) {
		console.log('Discarding standings because of practice mode.');
		commit = false;
	}
	let scheduled = getNextEvent();
	if (scheduled === null) {
		console.log('Discarding standings because there are no more events scheduled.');
		commit = false;
	}
	dateMoment = moment(scheduled.date);
	let diff = dateMoment.diff(moment());
	if (diff > (3 * 60 * 60 * 1000) || diff < (-3*60*60*1000)) {
		let duration = moment.duration(diff);
		console.log('Discarding standings because the scheduled start time (' + scheduled.date + ') is more than 3 hours off (' + duration.humanize(true) + ').');
		commit = false;
	}
	if (scheduled.hasOwnProperty('type')) {
			if (scheduled.type === 'sprint') {
				minNbrLaps = 6;
				multiplier = 1;
				bonusPoints = [1];
			} else {
				minNbrLaps = 15;
				multiplier = 2;
				bonusPoints = [4, 2, 1];
			}
	}

	let nbrDrivers = Object.keys(drivers).length;
	Object.keys(results).forEach(name => {
		//console.log('Calculating results for ' + name);
		let driver = getDriver(name);
		if (driver !== null) {
			let result = results[name];
			if (result.raceState === 3) {
				let points = 0;
				points = nbrDrivers + 1 - result.position;
				if (result.position <= bonusPoints.length) {
					points += bonusPoints[result.position-1];
				}
				points = points * multiplier;
				if (result.position === 1) {
					console.log('Participant ' + name + ' won the race and gains ' + points + ' points.');
				} else {
					console.log('Participant ' + name + ' finished on position ' + result.position + ' and gains ' + points + ' points.');
				}
				if (commit) {
					driver.points += points;
				}
			} else {
				console.log('Participant ' + name + ' did not finish.');
			}
		} else {
			console.log('Participant ' + name + ' not found among registered drivers.');
		}
	});
	if (commit) {
		sortDriversOnPoints();
		this.save();
		scheduled.state = 'finished';
		fs.writeFile('schedule.json', JSON.stringify(schedule, null, '\t'), 'utf8', (err) => {
			if (err) throw err;
			console.log('Saved "schedule.json"');
			parseSchedule();
		});
	}
};


module.exports.save = function save() {
	fs.writeFile('drivers.json', JSON.stringify(drivers, null, '\t'), 'utf8', (err) => {
		if (err) throw err;
		console.log('Saved "drivers.json"');
	});
}
