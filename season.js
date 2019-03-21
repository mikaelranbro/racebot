const fs = require('fs');
const moment = require('moment');
let drivers = JSON.parse(fs.readFileSync('drivers.json'));
let schedule = JSON.parse(fs.readFileSync('schedule.json'));
let nbrDrivers = Object.keys(drivers).length;
let nextRace = null;
let penaltyPerPoint = 2;

// Backup
fs.copyFile('drivers.json', ('backup/drivers_' + moment().format('YYYYMMDD_HHmmss') + '.json'), (err) => {
	if (err) throw err;
	console.log('Made backup of drivers.');
});

function sortDrivers() {
	let newDrivers = {};
	for (i = 1; i <= nbrDrivers; i++) {
		Object.keys(drivers).forEach(function(key) {
			if (drivers[key].position == i) {
				newDrivers[key] = drivers[key];
			}
		});		
	}
	drivers = newDrivers;
}
sortDrivers();
module.exports.drivers = drivers;

function parseSchedule(){
	let nextMoment = moment("20401010", "YYYYMMDD");
	Object.keys(schedule).forEach(function(key) {
		let race = schedule[key];
		race.moment = moment(race.date);
		race.id = key;
		if ((race.state === 'upcoming' || race.state === 'ongoing') && race.moment.isBefore(nextMoment)) {
			nextRace = race;
			nextMoment = race.moment;
		}
	});
}
parseSchedule();
console.log(nextRace);
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
			output += '\n**' + race.moment.format('DD/MM HH:mm:  ') + race.track + '**  ('	+ duration.humanize(true) + ')';
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

module.exports.getStartOrder = function getStartOrder(minDiff = 3, raceDrivers = drivers) {
 	var keys = Object.keys(drivers);
 	// console.log('-------------------\nKeys:\n' + keys);
 	var offset = drivers[keys[nbrDrivers-1]].points;
 	var starts = [];
 	var currentStart = {"delay": 0, "gap": 0, "drivers": []};
 	i = nbrDrivers;
 	var delay = 0;
 	while (i > 0) {
 		i--;
 		let driver = drivers[keys[i]];
 		if (raceDrivers.hasOwnProperty(driver.name)) {
 			let gap = (driver.points - offset) * penaltyPerPoint - delay;
 			console.log(driver.name + ' ... Delay: ' + delay + ', offset: ' + offset + ', gap: ' + gap);
 			if (gap >= minDiff) {
 				starts.push(currentStart);
 				delay = delay + gap;
 				currentStart = {"delay": delay, "gap": gap, "drivers": []};
 			}
			currentStart.drivers.push(driver);
		} else {
			console.log(driver.name + ' is not present.');
		}
 	}
 	starts.push(currentStart);
 	console.log('-------------------\nStarts:');
 	console.log(starts);
 	return starts;
};

module.exports.register = function register(user, steamName, sounds) {
	console.log('Registring user ' + user.username + ' as ' + steamName + ', ' + sounds);
	var driver;
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
		driver = drivers[user.username];
	}
	if (steamName !== undefined) {
		driver.steamName = steamName;
	}
	if (sounds !== undefined) {
		driver.sounds = sounds;
	}
	nbrDrivers = Object.keys(drivers).length;
	fs.writeFile('drivers.json', JSON.stringify(drivers, null, '\t'), 'utf8', (err) => {
		if (err) throw err;
		console.log('Saved "drivers.json"');
	});
};
//console.log(module.exports.getSchedule());