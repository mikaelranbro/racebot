const ROW = {
	"SPEED": 0,
	"X": 1,
	"Z": 2,
	"Y": 3,
	"ANGLE_X": 4,
	"ANGLE_Z": 5,
	"ANGLE_Y": 6
};
const MODE = {
	'PLAYBACK': 0,
	'GRAPH': 1,
	'ALIGNMENT': 2
};
const modeString = ['Playback', 'Graphs', 'Race line'];
const GRAPH_MODE = {
	'TIME_OVER_RACE': 0,
	'SPEED_OVER_LAP': 1,
	'TOP_SPEED': 2,
	'LAP_TIMES': 3
}
const nbrGraphModes = 4;
const graphModeString = ['Race Pace', 'Speed', 'Top Speed', 'Lap Times'];
const traceLength = 100;
let bounds = {
	"x": 10000,
	"y": 10000,
	"width": -1,
	"height": -1
}
let rotation = 0;

window.requestAnimFrame = (function(callback) {
	return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
		function(callback) {
			window.setTimeout(loop, 1000 / 30);
		};
})();

Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};

window.addEventListener("keypress", handleKeyDown, false);

let backgroundVisible = false;
let offset = {'x': 100, 'y':0};
let loopCount = 0;
let i0 = 0;
let i1 = 0;
let playbackScale = 2;
let lastTime = new Date().getTime();
let time = lastTime;
let raceTime = 0;
let lastRaceTime = raceTime;
let hue = [0, 40, 70, 120, 170, 210, 270, 300, 340];
let meters = [];
let selectedLap = 0;
let selectedMeter = -1;
let graphMode = GRAPH_MODE.TIME_OVER_RACE;
let nbrLaps = 0;
let maxTimeDiff = 0;
let headline = 'RaceView';
const nbrMeters = 201;
let info = {};
let details = {};


let mapAlignment = {
	"width": 1378,
	"height": 552,
	"x": 804.2000000000005,
	"y": 396.80000000000007,
	"rotation": 3.035592653589794,
	"scale": 1.015000000000002,
	"granularity": 1
}
const helpText = [
	'Mode: Playback<br>W: speed = 1, S: speed = 0; A: decrease speed, D: increase speed',
	'Mode: Graph<br>WS: change graph,  AD: change lap, QE: traverse',
	'Mode: Racing line'
];
let mode = MODE.PLAYBACK;
let mapImage = null;
window.onload = function () {
	document.getElementById('help').innerHTML = helpText[mode];
}

function initiate() {
	nbrLaps = eventInformation.mLapsInEvent - startPosition.lap;
	let title = document.getElementById('title');
	title.innerHTML = eventInformation.mTranslatedTrackLocation + ' ' + eventInformation.mTranslatedTrackVariation;
	let p = document.getElementById('participants');
	p.innerHTML = '';
	for (let j = 0; j < participants.length; j++) {
		p.innerHTML += '<div><input type="checkbox" id="' + participants[j] +'" name="' + participants[j] +'" checked><label style="cursor: pointer; font-weight: bold; color: ' + getColor(j) +  '" for="' + participants[j] +'">' + participants[j] + '</label></div>';
	}
	setBounds();
	createMeters();
	maxTimeDiff = getMaxTimeDiff();
}

function setBounds() {
	let c = document.getElementById("canvas");
  let ctx = c.getContext("2d");
	ctx.topMargin = 128;
	ctx.leftMargin = 64;
	ctx.bottomMargin = 64;
	ctx.rightMargin = 128;
	for (let i = 0; i < data.length; i++) {
		for (let j = 0; j < participants.length; j++) {
			let x = data[i][j+1][2][0];
			let y = - data[i][j+1][2][2];
			if (x < bounds.x) {
				bounds.x = Math.floor(x);
			}
			if (x - bounds.x > bounds.width) {
				bounds.width = Math.ceil(x - bounds.x);
			}
			if (y < bounds.y) {
				bounds.y = Math.floor(y);
			}
			if (y - bounds.y > bounds.height) {
				bounds.height = Math.ceil(y - bounds.y);
			}
		}
	}
	var canvas = document.getElementById("canvas");

	if (bounds.height > bounds.width) {
		rotation = Math.PI / 2;
		offset.x = ctx.topMargin - bounds.x;
		offset.y = - ctx.leftMargin - bounds.y;
		canvas.width = bounds.height + ctx.leftMargin + ctx.rightMargin;
		canvas.height = bounds.width + ctx.topMargin + ctx.bottomMargin;
		rotation = Math.PI / 2;
	} else {
		offset.x = ctx.leftMargin - bounds.x;
		offset.y = ctx.topMargin - bounds.y;
		canvas.width = bounds.width + ctx.leftMargin + ctx.rightMargin;
		canvas.height = bounds.height + ctx.topMargin + ctx.bottomMargin;
		rotation = 0;
	}
}

function getColor(j, s = 100, l = 40, a = 1) {
	return 'hsla(' + hue[j] + ', ' + s +'%, ' + l +'%, ' + a +')';
}

let previousMode = mode;
function loop() {
	lastTime = time;

	time = new Date().getTime();
	let timeDiff = time - lastTime; // milliseconds
	lastRaceTime = raceTime;
	raceTime = raceTime + playbackScale * timeDiff;
	info = {};
	details = {};
	if (raceTime > data[data.length - 1][0]) {
		raceTime = data[data.length -1][0];
		playbackScale = 0;
	}
	if (raceTime < 0) {
		raceTime = 0;
		playbackScale = 0;
	}
	if (previousMode !== mode) {
		helpP = document.getElementById('help');
		helpP.innerHTML = helpText[mode];
	}
	previousMode = mode;
	if (window.hasOwnProperty('dataLoaded')) {
		let row = getInterpolatedData(raceTime);
		let c = document.getElementById("canvas");
		let ctx = c.getContext("2d");
		ctx.width = c.width;
		ctx.height = c.height;
		ctx.save();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		/*
		if (backgroundVisible && mapImage !== null) {
			ctx.save();
			ctx.translate(mapAlignment.x, mapAlignment.y);
			ctx.globalAlpha = 0.25;
			ctx.rotate(mapAlignment.rotation);
			ctx.scale(mapAlignment.scale, mapAlignment.scale);
			ctx.drawImage(mapImage, -mapAlignment.width / 2, -mapAlignment.height / 2, mapAlignment.width, mapAlignment.height);
			ctx.restore();
		}
		*/
		if (rotation !== 0) {
			ctx.translate(bounds.height / 2,  + bounds.height / 2);
			ctx.rotate(rotation);
			ctx.translate(- bounds.height / 2,  - bounds.height / 2);
		}
		ctx.translate(offset.x, offset.y);
		if (backgroundVisible && mode !== MODE.GRAPH) {
			drawTrack(ctx);
			//drawMeters(ctx);
		}
	  // drawBounds(ctx, 'rgba(64,64,255,0.5)');
	  switch (mode) {
	  	case MODE.PLAYBACK:
			for (let j = 0; j < participants.length; j++) {
				if (!document.getElementById(participants[j]).checked) continue;
				drawTrace(ctx, j, row[j][ROW.X], -row[j][ROW.Y]);
			}
			for (let j = 0; j < participants.length; j++) {
				if (!document.getElementById(participants[j]).checked) continue;
				ctx.save();
				ctx.fillStyle = getColor(j);
				ctx.translate(row[j][ROW.X] ,  -row[j][ROW.Y]);
				ctx.rotate(row[j][ROW.ANGLE_Z]);
				//ctx.fillRect(- 2, - 3, 4, 6);
				drawCar(ctx, j, row[j][ROW.Z], row[j][ROW.SPEED]);
				ctx.restore();
			}
			headline = eventInformation.mTranslatedTrackLocation + ' ' + eventInformation.mTranslatedTrackVariation;
			info['Race Time'] = ('0' + Math.floor(raceTime / 60000)).slice(-2) + ':' + ('0' + Math.round((raceTime % 60000) / 1000)).slice(-2);
			info['Speed'] = 'x' + playbackScale;
	  	break;
	  	case MODE.ALIGNMENT:
	  	headline = eventInformation.mTranslatedTrackLocation + ' ' + eventInformation.mTranslatedTrackVariation;
	  	info['Race Line'] = 'Work in progress';
			for (let j = 0; j < participants.length; j++) {
				if (!document.getElementById(participants[j]).checked) continue;
				drawLap(ctx, i0, j);
			}
	  	break;
	  	case MODE.GRAPH:
	  		info['']
	  		if (graphMode !== GRAPH_MODE.LAP_TIMES) {
	  	  ctx.save();
	  	  if (rotation !== 0) {
  	  		ctx.translate(128 + bounds.width / 2, bounds.height / 4);
  	  	} else {
  	  		ctx.translate(0, bounds.height / 3);
  	  	}
	  	  ctx.scale(0.25, 0.25);
	  	  ctx.globalAlpha = 0.25;
	  	  drawTrack(ctx, true);
	  	  ctx.globalAlpha = 0.8;
	  	  if (selectedMeter > -1 && selectedMeter < nbrMeters) {
	  	  	drawMeter(ctx, selectedMeter);
	  	  }
	  	  if (hooverMeter > -1 && hooverMeter < nbrMeters) {
	  	  	drawMeter(ctx, hooverMeter, rulerColor);
	  	  }
	  	  ctx.restore();
	  		}
	  	  headline = graphModeString[graphMode];
	  		switch (graphMode) {
	  			case GRAPH_MODE.TIME_OVER_RACE:
	  				info['Y-Axis'] = 'Time relative average pace';
	  				info['X-Axis'] = 'Distance';
	  				drawTimeOverRaceGraph(ctx);
	  			break;
	  			case GRAPH_MODE.SPEED_OVER_LAP:
	  				info['Y-Axis'] = 'Speed';
	  				info['X-Axis'] = 'Lap position';
	  				if (selectedLap > 0) {
	  					info['Lap'] = selectedLap;
	  				} else {
	  					info['Lap'] = 'Culled average';
	  				}
	  				drawSpeedGraph(ctx, selectedLap);
	  			break;
	  			case GRAPH_MODE.TOP_SPEED:
	  				info['Y-Axis'] = 'Top speed (Averge speed in grey)';
	  				info['X-Axis'] = 'Lap position';
	  				drawTopSpeedGraph(ctx, selectedLap);
	  			break;
	  			case GRAPH_MODE.LAP_TIMES:
	  				info['Y-Axis'] = 'Reverse Lap Times (Fastest on top)';
	  				info['X-Axis'] = 'Lap';
	  				drawLapTimesGraph(ctx);
	  			break;
	  		}
	  	break;
	  }
		ctx.restore();
		drawInfo(ctx);
		drawDetails(ctx);
		drawButtons(ctx, mode);
 	  drawHeadline(ctx, headline);
	}
	window.requestAnimFrame(loop);
}

function getInterpolatedData(targetTime) {
	// add search/jump if diff is large
	if (targetTime > this.data[i1][0]) {
		seekForward(targetTime);
	} else if (targetTime < data[i0][0]) {
		seekBackward(targetTime);
	}

	var w = 1;
	if (data[i1][0] > data[i0][0]) {
		let t0 = data[i0][0];
		let t1 = data[i1][0];
		w = (targetTime - data[i0][0]) / (data[i1][0] - data[i0][0]);
		// console.log(t0 + ' --- [' + targetTime + '] ---' + t1 + ' ==> ' + w);
	}
	let row = [];
	for (let j = 1; j < data[i0].length; j++) {
		let d = [];
		d.push(interpolate(data[i0][j][1], data[i1][j][1], w));
		for (let k = 0; k < 3; k++) {
			d.push(interpolate(data[i0][j][2][k], data[i1][j][2][k], w));
		}
		for (let k = 0; k < 3; k++) {
			d.push(interpolateAngles(data[i0][j][3][k], data[i1][j][3][k], w));
		}
		row.push(d);
	}
	return row;
}

function interpolate(a, b, w) {
	if (a instanceof Array) {
		let result = [];
		for (let i = 0; i < a.length; i++) {
			result.push(b[i] * w + a[i] * (1 - w));
		}
		return result;
	} else {
		return b * w + a * (1 - w);
	}
}

function interpolateAngles(a, b, w) {
	if ((b - a) > Math.PI) {
		return b * w + (a + Math.PI * 2) * (1 - w);
	} else if ((a - b) > Math.PI) {
		return (b + Math.PI * 2) * w + a * (1 - w);
	} else {
		return b * w + a * (1 - w);		
	}
}

function seekForward(targetTime) {
	while (i1 < data.length && data[i1][0] < targetTime) {
		i1++;
	}
	if (i1 >= data.length) {
		i1 = data.length - 1;
		i0 = data.length - 1;
	} else if (i1 > 0) {
		i0 = i1 - 1;
	} else {
		i0 = i1;
	}
}

function seekBackward(targetTime) {
	while (i0 > 0 && data[i0][0] > targetTime) {
		i0--;
	}
	if (i0 <= 0) {
		i1 = 0;
		i0 = 0;
	} else if (i0 < data.length - 1) {
		i1 = i0 + 1;
	} else {
		i1 = i0;
	}
}

function drawHeadline(ctx, s) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = '#222222';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';
	ctx.font = 'bold 24px "Courier New"';
	ctx.fillText(s.toUpperCase(), 32, 32);
	ctx.restore();
}

function drawInfo(ctx) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = '#222222';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';
	let i = 0;
	Object.keys(info).forEach(key => {
		ctx.font = '20px "Courier New"';
		ctx.fillText(key.toUpperCase(), 32, 64 + i * 24);
		if (key.toLowerCase() === 'race time' || key.toLowerCase() === 'speed') {
			ctx.font = '20px "Courier New"';
		} else {
			ctx.font = '20px "Courier New"';
			// ctx.font = "20px Lindsey";
		}
		ctx.fillText(info[key], 168, 64 + i * 24);
		i++;
	});
	ctx.restore();
}

function drawDetails(ctx) {
	let nbrDetails = Object.keys(details).length;
	if (nbrDetails < 1) return;
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = '#222222';
	ctx.strokeStyle = selectColor;
	ctx.lineWidth = 6;
	let y0 = ctx.height - 32 - 20 * nbrDetails;
	ctx.textBaseline = 'middle';
	Object.keys(details).forEach((key, i) => {
		ctx.font = '16px "Arial"';
		ctx.textAlign = 'left';
		ctx.save();
		if (participants.includes(key)) {
			ctx.fillStyle = getColor(participants.indexOf(key), 90, 40, 1);
		}
		ctx.fillText(key, 32, y0 + i * 20);
		ctx.restore();
		ctx.font = '16px "Courier New"';
		ctx.textAlign = 'right';
		ctx.fillText(details[key], 260, y0 + i * 20);
	});
	ctx.strokeRect(16, y0 - 24, 260 + 16, nbrDetails * 20 + 24);
	ctx.restore();
}

let rulerColor = 'rgba(210, 200, 180, 1)';
let selectColor = 'rgba(220, 210, 160, 0.3)';
let hooverColor = 'rgba(200, 200, 200, 0.3)';
let hooverLap = -1;
let hooverMeter = -1;
function drawTimeOverRaceGraph(ctx) {
	let rightMargin = 64;
	let leftMargin = ctx.leftMargin;
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.lineJoin = 'round';
	ctx.lineWidth = 4;
	let offset = meters[0].raceTimes[0].reduce((total, current) =>{
		return total + current;
	}) / meters[0].raceTimes[0].length;
	let step = (ctx.width - leftMargin - rightMargin) / nbrMeters / nbrLaps;
	let y = 0;
	let y0 = ctx.height / 2;
	let lapPace = meters[nbrMeters-1].pace;
	ctx.beginPath();
	ctx.strokeStyle = rulerColor;
	ctx.moveTo(leftMargin, y0);
	ctx.lineTo(ctx.width - rightMargin, y0)
	ctx.stroke();
	ctx.fillStyle = rulerColor;
	let yScale = (ctx.height - ctx.topMargin - ctx.bottomMargin) / 2 / maxTimeDiff;
	for (let l = 0; l < nbrLaps; l++) {
		ctx.fillRect(leftMargin + l * step * nbrMeters - 1, y0-8, 2, 16);
	}
	if (mouse.x > ctx.leftMargin && mouse.x < ctx.width - rightMargin && mouse.y > y0 - 32 && mouse.y < y0 + 32) {
		ctx.fillStyle = hooverColor;
		hooverLap = Math.ceil((mouse.x - leftMargin) / (step * nbrMeters));
		hooverMeter = Math.floor((mouse.x - leftMargin - (hooverLap-1) * step * nbrMeters) / step);
		ctx.fillRect(leftMargin + (hooverLap-1) * step * nbrMeters + step * hooverMeter - 2, y0 - 32, 4, 64);
		if (mouse.button === 0) {
			selectedLap = hooverLap;
			selectedMeter = hooverMeter;
		}
	} else {
		hooverLap = -1;
		hooverMeter = -1;
	}
	if (selectedLap > 0 && selectedMeter >= 0 && selectedMeter < nbrMeters) {
		ctx.fillStyle = selectColor;
		ctx.fillRect(leftMargin + (selectedLap - 1) * step * nbrMeters + step * selectedMeter - 1, ctx.topMargin, 2, ctx.height - ctx.bottomMargin - ctx.topMargin);
		addTimeDetails(meters[selectedMeter], selectedLap-1);
	}
	for (let j = 0; j < participants.length; j++) {
		if (!document.getElementById(participants[j]).checked) continue;
		ctx.beginPath();
		ctx.strokeStyle = getColor(j, 100, 50, 0.3);
		ctx.moveTo(leftMargin, y0 + (meters[0].raceTimes[0][j]- offset) * yScale);
		for (let l = 0; l < nbrLaps; l++) {
			for (let i = 0; i < nbrMeters; i++) {
				y = (meters[i].raceTimes[l][j] - offset - (lapPace * l + meters[i].pace)) * yScale;
				if (j === 3) {
					//console.log('raceTime: ' + meters[i].raceTimes[l][j] + ', pace: ' + lapPace * l - meters[])
				}
				ctx.lineTo(leftMargin + step * i + l * nbrMeters * step, y0 + y);
			}
		}
		ctx.stroke();
	}


	ctx.restore();	
}

function drawSpeedGraph(ctx, lap = 0) {
	if (lap > eventInformation.mLapsInEvent - startPosition.lap) return;
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.lineJoin = 'round';
	ctx.lineWidth = 3;
	let rightMargin = 64;
	let step = (ctx.width - ctx.leftMargin - rightMargin) / nbrMeters;
	let y = 0;
	let alpha = 0.3;
	let yScale = 8;
	let nbrVisible = 0;
	for (let j = 0; j < participants.length; j++) {
		if (!document.getElementById(participants[j]).checked) continue;
		nbrVisible++;
	}
	if (nbrVisible === 2) {
		drawSpeedGraphDiff(ctx, lap);
		alpha = 1;
		ctx.lineWidth = 1;
	}
	let aMeter = Math.floor((mouse.x - ctx.leftMargin) / step);
	let spread = getSpeedSpread(lap, aMeter);
	if (mouse.x > ctx.leftMargin && mouse.x < ctx.width - rightMargin && mouse.y > ctx.topMargin && mouse.y < ctx.height - ctx.bottomMargin &&
		mouse.y > ctx.height - ctx.bottomMargin - spread.max * yScale - 64 && mouse.y < ctx.height - ctx.bottomMargin - spread.min * yScale + 64) {
		ctx.fillStyle = hooverColor;
		hooverMeter = aMeter;
		ctx.fillRect(ctx.leftMargin + step * hooverMeter - step/2, ctx.height - ctx.bottomMargin - spread.max * yScale - 12, step, (spread.max - spread.min) * yScale + 24);
		if (mouse.button === 0) {
			selectedMeter = hooverMeter;
		}
	} else {
		hooverLap = -1;
		hooverMeter = -1;
	}

	if (selectedMeter >= 0 && selectedMeter < nbrMeters) {
		ctx.fillStyle = selectColor;
		ctx.fillRect(ctx.leftMargin + step * selectedMeter - step / 2, ctx.topMargin, step, ctx.height - ctx.topMargin - ctx.bottomMargin);
		addSpeedDetails(meters[selectedMeter], lap);
	}
	for (let j = 0; j < participants.length; j++) {
		if (!document.getElementById(participants[j]).checked) continue;
		ctx.beginPath();
		ctx.strokeStyle = getColor(j, 100, 50, alpha);
		if (lap === 0) {
			y = meters[0].averageSpeeds[j];
		} else {
			y = meters[0].speeds[lap-1][j];
		}
		ctx.moveTo(ctx.leftMargin, ctx.height - 64 - y * yScale);
		for (let i = 0; i < nbrMeters; i++) {
			if (lap === 0) {
				y = meters[i].averageSpeeds[j];
			} else {
				y = meters[i].speeds[lap-1][j];
			}
			ctx.lineTo(ctx.leftMargin + step * i, ctx.height - ctx.bottomMargin - y * yScale);
		}
		ctx.stroke();
	}
	ctx.restore();
}

function getSpeedSpread(lap, i) {
	if (!(i >= 0 && i < nbrMeters)) {
		return {"mean": NaN, "max": NaN, "min": NaN};
	}
	let y0 = 0;
	let n = 0;
	let y = 0;
	let min = 1000;
	let max = 0;
	let meter = meters[i];
	for (let j = 0; j < participants.length; j++) {
		if (!document.getElementById(participants[j]).checked) continue;
		if (lap === 0) {
			y = meter.averageSpeeds[j];
		} else {
			y = meter.speeds[lap-1][j];
		}
		if (!Number.isNaN(y)) {
			y0 += y;
			n++;
			min = Math.min(min, y);
			max = Math.max(max, y);
		}
	}
	return {"mean": y0, "max": max, "min": min};
}

function drawSpeedGraphDiff(ctx, lap = 0) {
	if (lap > eventInformation.mLapsInEvent - startPosition.lap) return;
	ctx.save();
	let rightMargin = 64;
	let step = (ctx.width - ctx.leftMargin - rightMargin) / nbrMeters;
	let y = 0;
	let yScale = 8;

	if (selectedMeter >= 0 && selectedMeter < nbrMeters) {
		ctx.fillStyle = selectColor;
		ctx.fillRect(ctx.leftMargin + step * selectedMeter - step / 2, 0, step, ctx.height);
	}
	let j0 = -1;
	let j1 = -1;
	for (let j = 0; j < participants.length; j++) {
		if (document.getElementById(participants[j]).checked) {
			if (j0 < 0)
			{
				j0 = j;
			} else {
				j1 = j;
				break;
			}
		}
	}
	let j = j0;
	ctx.beginPath();
	ctx.fillStyle = 'rgba(40, 40, 40, 0.5)';
	if (lap === 0) {
		y = meters[0].averageSpeeds[j];
	} else {
		y = meters[0].speeds[lap-1][j];
	}
	ctx.moveTo(ctx.leftMargin, ctx.height - ctx.bottomMargin - y * yScale);
	for (let i = 0; i < nbrMeters; i++) {
		if (lap === 0) {
			y = meters[i].averageSpeeds[j];
		} else {
			y = meters[i].speeds[lap-1][j];
		}
		ctx.lineTo(ctx.leftMargin + step * i, ctx.height - ctx.bottomMargin - y * yScale);
	}
	j = j1;
	for (let i = nbrMeters - 1; i >= 0; i--) {
		if (lap === 0) {
			y = meters[i].averageSpeeds[j];
		} else {
			y = meters[i].speeds[lap-1][j];
		}
		ctx.lineTo(ctx.leftMargin + step * i, ctx.height - ctx.bottomMargin - y * yScale);
	}
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

function drawTopSpeedGraph(ctx) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.lineJoin = 'round';
	ctx.lineWidth = 3;
	let rightMargin = 64;
	hooverLap = -1;
	let step = (ctx.width - ctx.leftMargin - rightMargin) / nbrMeters;
	let y = 0;
	let yScale = 8;
	/*	ctx.beginPath();
	ctx.strokeStyle = rulerColor;
	ctx.moveTo(64, ctx.height - 64 - meters[0].averageSpeed * 8)
	for (let i = 0; i < nbrMeters; i++) {
		y = meters[i].averageSpeed;
		ctx.lineTo(64 + step * i, ctx.height - 64 - y * 8);
	}
	ctx.stroke();*/
	let aMeter = Math.floor((mouse.x - ctx.leftMargin) / step);
	let spread = getTopSpeedSpread(aMeter);
	if (mouse.x > ctx.leftMargin && mouse.x < ctx.width - rightMargin && mouse.y > ctx.topMargin && mouse.y < ctx.height - ctx.bottomMargin &&
		mouse.y > ctx.height - ctx.bottomMargin - spread.max * yScale - 64 && mouse.y < ctx.height - ctx.bottomMargin - spread.min * yScale + 64) {
		ctx.fillStyle = hooverColor;
		hooverMeter = aMeter;
		ctx.fillRect(ctx.leftMargin + step * hooverMeter - step/2, ctx.height - ctx.bottomMargin - spread.max * yScale - 12, step, (spread.max - spread.min) * yScale + 24);
		if (mouse.button === 0) {
			selectedMeter = hooverMeter;
		}
	} else {
		hooverMeter = -1;
	}

	if (selectedMeter >= 0 && selectedMeter < nbrMeters) {
		ctx.fillStyle = selectColor;
		ctx.fillRect(ctx.leftMargin + step * selectedMeter - step / 2, ctx.topMargin, step, ctx.height - ctx.bottomMargin - ctx.topMargin);
		addTopSpeedDetails(meters[selectedMeter]);
	}
	for (let j = 0; j < participants.length; j++) {
		if (!document.getElementById(participants[j]).checked) continue;
		ctx.beginPath();
		ctx.strokeStyle = getColor(j, 100, 50, 0.3);
		y = meters[0].topSpeeds[j];
		ctx.moveTo(ctx.leftMargin, ctx.height - ctx.bottomMargin - y * yScale);
		for (let i = 0; i < nbrMeters; i++) {
			y = meters[i].topSpeeds[j];
			ctx.lineTo(ctx.leftMargin + step * i, ctx.height - ctx.bottomMargin - y * yScale);
		}
		ctx.stroke();
	}

	ctx.restore();
}

function getTopSpeedSpread(i) {
	if (!(i >= 0 && i < nbrMeters)) {
		return {"mean": NaN, "max": NaN, "min": NaN};
	}
	let y0 = 0;
	let n = 0;
	let y = 0;
	let min = 1000;
	let max = 0;
	let meter = meters[i];
	for (let j = 0; j < participants.length; j++) {
		if (!document.getElementById(participants[j]).checked) continue;
		y = meter.topSpeeds[j];
		if (!Number.isNaN(y)) {
			y0 += y;
			n++;
			min = Math.min(min, y);
			max = Math.max(max, y);
		}
	}
	return {"mean": y0, "max": max, "min": min};
}

function drawLapTimesGraph(ctx) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.lineJoin = 'round';
	ctx.lineWidth = 5;
	let rightMargin = 64;
	hooverMeter = -1;
	let step = (ctx.width - ctx.leftMargin - rightMargin) / nbrLaps;
	let min = 1000000;
	let max = 0;
	let meter = meters[nbrMeters -1];
	for (let j = 0; j < participants.length; j++) {
		for (let l = 1; l < nbrLaps; l++) {
			if (!Number.isNaN(meter.lapTimes[l][j])) {
				min = Math.min(meter.lapTimes[l][j], min);
				max = Math.max(meter.lapTimes[l][j], max);
			}
		}
	}
	let yScale = (ctx.height - ctx.bottomMargin - ctx.topMargin) / (max - min);
	let avg = (max + min) / 2;
	// console.log('Average: ' + Math.round(avg) / 1000 + ' s');
	let y0 = (ctx.height - ctx.bottomMargin + ctx.topMargin) / 2;

	let aLap = Math.round((mouse.x - ctx.leftMargin) / step) + 1;
	let spread = getLapTimesSpread(aLap);
	console.log('Lap: ' + aLap + ' max: ' + spread.max + ' min: ' + spread.min + '  block height: ' + (spread.max - spread.min) * yScale);
	if (mouse.x > ctx.leftMargin && mouse.x < ctx.width - rightMargin && mouse.y > ctx.topMargin && mouse.y < ctx.height - ctx.bottomMargin  &&
		mouse.y > y0 + (spread.min - avg) * yScale - 64 && mouse.y < y0 + (spread.max - avg) * yScale + 64) {
		ctx.fillStyle = hooverColor;
		hooverLap = aLap;
		console.log('Lap: ' + aLap + ' max: ' + spread.max + ' min: ' + spread.min + '  block height: ' + (spread.max - spread.min) * yScale);
		ctx.fillRect(ctx.leftMargin + step * (hooverLap -1) - step/4, y0 + (spread.min - avg) * yScale - 12, step/2, (spread.max - spread.min) * yScale + 24);
		if (mouse.button === 0) {
			selectedLap = hooverLap;
		}
	} else {
		hooverLap = -1;
	}

	if (selectedLap > 0 && selectedLap < nbrLaps +1) {
		ctx.fillStyle = selectColor;
		ctx.fillRect(ctx.leftMargin + step * (selectedLap-1) - step / 4, ctx.topMargin, step / 2, ctx.height - ctx.bottomMargin - ctx.topMargin);
		addLapTimesDetails(selectedLap - 1);
	}

	//let y0 = ctx.height - ctx.bottomMargin - (ctx.height - ctx.bottomMargin - ctx.topMargin) / 2;
	for (let j = 0; j < participants.length; j++) {
		if (!document.getElementById(participants[j]).checked) continue;
		ctx.beginPath();
		ctx.moveTo(ctx.leftMargin, y0 + (meter.lapTimes[0][j] - avg) * yScale);
		ctx.strokeStyle = getColor(j, 100, 50, 0.3);
		for (let l = 0; l < nbrLaps; l++) {
			if (j === 0) {
				// console.log('time diff: ' + Math.round(meter.lapTimes[l][j] - avg) / 1000);
				//console.log('offset: ' + (meter.lapTimes[l][j] - avg) * yScale);
				let pos = [ctx.leftMargin + l * step, y0 + (meter.lapTimes[l][j] - avg) * yScale];
				//console.log(pos);
			}
			ctx.lineTo(ctx.leftMargin + l * step, y0 + (meter.lapTimes[l][j] - avg) * yScale);
		}
		ctx.stroke();
	}
	ctx.restore();
}

function getLapTimesSpread(lap) {
	if (!(lap > 0 && lap < nbrLaps + 1)) {
		return {"mean": NaN, "max": NaN, "min": NaN};
	}
	let y0 = 0;
	let n = 0;
	let y = 0;
	let min = 10000000;
	let max = 0;
	for (let j = 0; j < participants.length; j++) {
		if (!document.getElementById(participants[j]).checked) continue;
		y = meters[nbrMeters-1].lapTimes[lap-1][j];
		if (!Number.isNaN(y)) {
			y0 += y;
			n++;
			min = Math.min(min, y);
			max = Math.max(max, y);
		}
	}
	return {"mean": y0, "max": max, "min": min};
}

function drawMeters(ctx) {
	ctx.save();
	for (let i = 0; i < nbrMeters; i++) {
		ctx.fillStyle = '#ff2222';
		ctx.fillRect(meters[i].position[0] - 1, - meters[i].position[2] - 1, 2, 2);
	}
	ctx.restore();
}

function drawMeter(ctx, i, style = '#ff0000') {
	ctx.save();
//	ctx.strokeStyle = rulerColor;
//	ctx.lineWidth = 12;
//	ctx.beginPath();
//	ctx.arc(meters[i].position[0], - meters[i].position[2], 26, 0, 2 * Math.PI);
//	ctx.stroke();
	ctx.strokeStyle = style;
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.arc(meters[i].position[0], - meters[i].position[2], 24, 0, 2 * Math.PI);
	ctx.stroke();
	ctx.restore();
}

function drawTrack(ctx, contrast = false) {
	ctx.save();
	ctx.lineWidth = 16;
	if (contrast) {
		ctx.strokeStyle = '#dfd8d0';
	} else {
		ctx.strokeStyle = '#ffffff';
		ctx.shadowBlur = 50;
		ctx.shadowColor = 'rgba(80, 100, 20, 0.5)';
	}
//	ctx.fillRect(meters[0].position[0], meters[0].position[2], 8, 8);
	ctx.beginPath();
	ctx.moveTo(meters[0].position[0], -meters[0].position[2]);
	for (let i = 1; i < nbrMeters; i++) {
		if (i>1 && i < nbrMeters-1) {
			ctx.bezierCurveTo((meters[i].position[0] - meters[i-2].position[0]) / 6 + meters[i-1].position[0],
												-(meters[i].position[2] - meters[i-2].position[2]) / 6 - meters[i-1].position[2],
												(meters[i-1].position[0] - meters[i+1].position[0]) / 6 + meters[i].position[0],
												-(meters[i-1].position[2] - meters[i+1].position[2]) / 6 - meters[i].position[2],
												meters[i].position[0], -meters[i].position[2]);
		} else {
			ctx.lineTo(meters[i].position[0], -meters[i].position[2]);
		}
	}	
	ctx.stroke();
	ctx.restore();
}

function drawBounds(ctx, fillStyle) {
	ctx.save();
	ctx.globalAlpha = 0.2;
	ctx.fillStyle = fillStyle;
	ctx.strokeStyle = fillStyle;
	ctx.fillRect(bounds.x + offset.x, bounds.y + offset.y, bounds.width, bounds.height);
	ctx.strokeRect(bounds.x - 200, bounds.y - 200, bounds.width + 400, bounds.height + 400);
	ctx.restore();
}

function drawLap(ctx, startIndex, j) {
	ctx.save();
	ctx.beginPath();
	ctx.strokeStyle = getColor(j, 100, 50, 0.3);
	ctx.moveTo(data[startIndex][j+1][2][0], - data[startIndex][j+1][2][2]);
	let i = startIndex + 1;
	while (i < data.length && data[i][j+1][0] - data[startIndex][j+1][0] <= eventInformation.mTrackLength) {
		ctx.lineTo(data[i][j+1][2][0], - data[i][j+1][2][2]);
		i++;
	}
	ctx.stroke();
	ctx.restore();
}

function drawTrace(ctx, j, x, y) {
	ctx.save();
	//ctx.beginPath();
	let xx = x;
	let yy = y;
	
	ctx.globalAlpha = 1;
	ctx.lineWidth = 2;
	//ctx.strokeStyle = '#555555';
	ctx.strokeStyle = getColor(j, 30);
	let n = 0;
	for (let i  = i0; i > 0 && i > i0 - traceLength; i--) {
		let d = data[i][j+1];
		let a = 0.25;
		let alpha = (traceLength - n) / (traceLength * 5);
		
		ctx.lineWidth = 2;
		if (i > 1) {
			if ((data[i-2][j+1][1] - data[i-1][j+1][1]) > 0) {
				//alpha = alpha * 1.25;
				alpha = alpha * (1 + (data[i-2][j+1][1] - data[i-1][j+1][1]) / 16);
			}
		}
		if (i > 0) {
			if (data[i-1][j+1][1] - d[1] > -0.1) {
				//alpha = alpha * 2;
				let weight = (1 + (data[i-1][j+1][1] - d[1]) / 4);
				alpha = alpha * weight;
				ctx.lineWidth = 2 + (weight / 8);
			}
		}
		if (alpha > 0) {
			ctx.globalAlpha = alpha;
			ctx.beginPath();
			ctx.moveTo(xx,yy);
			xx = d[2][0];
			yy = -d[2][2];
			ctx.lineTo(xx, yy);
			ctx.stroke();
		} else {
			xx = d[2][0];
			yy = -d[2][2];
			//ctx.moveTo(d[2][0], -d[2][2]);
		}
		//ctx.stroke();
		n++;
	}
	

	ctx.restore();	
}

function drawCar(ctx, j, z, speed) {
	
	// ctx.fillRect(- 2, - 3, 4, 6);
	// return;

	ctx.save();
	ctx.beginPath();
	ctx.lineJoin = 'miter';
	//ctx.strokeStyle = 'rgb(0, 0, 0)';
	ctx.lineCap = 'butt';
	ctx.miterLimit = 4;
	ctx.lineWidth = 0.500000;
	ctx.strokeStyle = '#000000';
	let glare = 50; //(50 + z/2).clamp(30, 70);
	ctx.fillStyle = getColor(j, 90, glare, 1);
	let len = speed / 40;

	ctx.moveTo(-2, -3);
	ctx.lineTo(-2, 2 + len);
	ctx.lineTo(-1, 4 + len);
	ctx.lineTo(-1, 4 + len);
	ctx.lineTo(1, 4 + len);
	ctx.lineTo(2, 2 + len);
	ctx.lineTo(2, -3);
	ctx.lineTo(-2, -3);

	/*
	ctx.moveTo(2, -1.6);
	ctx.bezierCurveTo(2, -2, 3, -2, 3, 0);
	ctx.bezierCurveTo(3, 2, 2, 2, 2, 1.6);
	ctx.lineTo(-1, 1.6);
	ctx.bezierCurveTo(-1.2, 1.8, -1.6, 2, -2, 1.8);
	ctx.bezierCurveTo(-2.1, 1.6, -2.1, -1.6, -2, -1.8);
	ctx.closePath();
	*/
	ctx.fill();
	ctx.stroke();
	//ctx.stroke();
/*
	ctx.beginPath();
	ctx.fillStyle = '#000000';
	ctx.moveTo(-1.1, -2.5);
	ctx.lineTo(1.1, -2.5);
	ctx.lineTo(1.3, -1.2);
	ctx.lineTo(-1.3, -1.2);
	ctx.closePath();
	ctx.fill();

	ctx.beginPath();
	ctx.fillStyle = '#000000';
	ctx.moveTo(-1.4, 1.6);
	ctx.lineTo(-1.2, 1.8);
	ctx.lineTo(1.2, 1.8);
	ctx.lineTo(1.4, 1.6);
	ctx.lineTo(1.2, 0.5);
	ctx.lineTo(-1.2, 0.5);
	ctx.closePath();
	ctx.fill();*/
	ctx.restore();
}

function handleKeyDown(event) {
	switch (event.keyCode) {
	case 109 :
		// M: Switch mode
		mode = (mode + 1) % 3;
		break;
		case 98:
		backgroundVisible = !backgroundVisible;
		break;
		default:
		switch (mode) {
			case MODE.PLAYBACK:
			handleKeyDownPlayback(event);
			break;
			case MODE.GRAPH:
			handleKeyDownGraph(event);
			break;
			case MODE.ALIGNMENT:
			handleKeyDownAlignment(event);
			break;
		}
	}
}

function handleKeyDownPlayback(event) {
	switch (event.keyCode) {
		case 119:
		case 87:
			playbackScale = 1;
		break;
		case 97:
		case 65:
		if (playbackScale === 0) {
			playbackScale = - 0.125;
		} if (playbackScale > 0 && playbackScale < 0.126) {
			playbackScale = 0;
		} else if (playbackScale < 0) {
			playbackScale = playbackScale * 2;
		} else {
			playbackScale = playbackScale / 2;
		}
		break;
		case 115:
		case 83:
			playbackScale = 0;
		break;
		case 100:
		case 68:
			if (playbackScale === 0 ) { 
				playbackScale = 0.125; 
			} else if(playbackScale < 0 && playbackScale > -0.125) {
				playbackScale = 0;
			} else if (playbackScale < 0) {
				playbackScale = playbackScale / 2;
			} else {
				playbackScale = playbackScale * 2;
			}
		break;
	}
}

function handleKeyDownAlignment(event) {
	switch (event.keyCode) {
		case 119:
		case 87:
			mapAlignment.y -= 8 * mapAlignment.granularity;
		break;
		case 97:
		case 65:
			mapAlignment.x -= 8 * mapAlignment.granularity;
		break;
		case 115:
		case 83:
			mapAlignment.y += 8 * mapAlignment.granularity;
		break;
		case 100:
		case 68:
			mapAlignment.x += 8 * mapAlignment.granularity;
		break;
		case 113:
		mapAlignment.rotation -= 0.01 * mapAlignment.granularity;
		break;
		case 101:
		mapAlignment.rotation += 0.01 * mapAlignment.granularity;
		break;
		case 122:
		mapAlignment.scale += 0.01  * mapAlignment.granularity;
		break;
		case 120:
		mapAlignment.scale -= 0.01 * mapAlignment.granularity;
		break;
		case 99:
		mapAlignment.granularity = 1.1 - mapAlignment.granularity;
	}
}

function handleKeyDownGraph(event) {
	switch (event.keyCode) {
		case 119:
			graphMode = (graphMode -1 + 4) % 4;
		// w
		break;
		case 115:
			graphMode = (graphMode + 1) % 4;
		// s
		break;
		case 97:
		selectedLap = (selectedLap - 1 + eventInformation.mLapsInEvent - startPosition.lap + 1) % (eventInformation.mLapsInEvent - startPosition.lap + 1);
		// a
		break;
		case 100:
		selectedLap = (selectedLap + 1) % (nbrLaps + 1);
		// d
		break;
		case 113:
		  selectedMeter--;
		  if (graphMode === GRAPH_MODE.TIME_OVER_RACE) {
				if (selectedMeter < 0) {
					selectedMeter = nbrMeters-1;
					selectedLap = (selectedLap - 1 + nbrLaps + 1) % (nbrLaps + 1);
				}
		  } else {
		  	selectedMeter = (selectedMeter + nbrMeters) % nbrMeters;	
		  }
		break;
		case 101:
			selectedMeter ++;
			if (graphMode === GRAPH_MODE.TIME_OVER_RACE) {
				if (selectedMeter >= nbrMeters) {
					selectedMeter = 0;
					selectedLap = (selectedLap + 1) % (nbrLaps + 1);
				}
			} else {
				selectedMeter = selectedMeter % nbrMeters;
			}
		break;
	}
}

function createMeters() {
	
	let dOffset = 0;
	for (let j = 0; j < participants.length; j++) {
		if (Math.abs(data[0][j+1][0]) < 0.01) {
			dOffset = eventInformation.mTrackLength - startPosition.lapDistance;
		}
	}

	for (let i = 0; i < nbrMeters; i++) {
		let m = {};
		m.distance = eventInformation.mTrackLength / (nbrMeters-1) * i;
		m.position = [];
		m.positions = [];
		m.pace = 0;
		m.lapTimes = [];
		m.raceTimes = [];
		m.speeds = [];
		m.topSpeeds = [];
		m.averageSpeeds = [];
		m.topSpeed = 0;
		m.averageSpeed = 0;

		for (let l = 0; l < nbrLaps; l++) {
			m.lapTimes.push([]);
			m.raceTimes.push([]);
			m.speeds.push([]);
		}

		meters.push(m);
	}
	let lapStartTime = 0;
	for (let j = 0; j < participants.length; j++) {
		let range = {"from": 0, "to": 1};
		for (let l = 0; l < nbrLaps; l++) {
			for (let i = 0; i < nbrMeters; i++) {
				let m = meters[i];
				let dist = l  * eventInformation.mTrackLength + m.distance + dOffset;
				let row = getRowAtDistance(dist, j, range);
				if (i === 0) {
					lapStartTime = row[0];
				}
				m.raceTimes[l].push(row[0]);
				m.lapTimes[l].push(row[0] - lapStartTime);
				m.speeds[l].push(row[1]);
				if (l > Math.min(1, nbrLaps - 3) && l < 5) {
					m.positions.push(row[2]);
				}
			}
		}
	}
	for (let i = 0; i < nbrMeters; i++) {
		let m = meters[i];
		let sortedPositions = m.positions.filter((currentValue) => {
			return currentValue !== null;
		}).sort((a,b) => {
			return a[0] - b[0] + a[2] - b[2];
		});
		m.position = sortedPositions[Math.floor(sortedPositions.length / 2)];
		let nbrCoreLaps = 0;
		let sum = 0;
		for (let l = Math.min(Math.max(nbrLaps - 2, 0), 2); l < nbrLaps-1; l++) {
			let arr = m.lapTimes[l].filter(v => {
				return (!Number.isNaN(v));	
			});
			if (arr.length !== 0) {
				nbrCoreLaps ++;
				sum += arr.reduce((a,b) => {
					return a+b;
				}) / arr.length;
			}
		}
		m.pace = sum / nbrCoreLaps;
		for (let j = 0; j < participants.length; j++) {
			m.averageSpeeds.push(0);
			m.topSpeeds.push(0);
			let speeds = [];
			let avg = 0;
			for (let l = 0; l < nbrLaps; l++) {
				speeds.push(m.speeds[l][j]);
				avg += m.speeds[l][j] / nbrLaps;
				m.topSpeeds[j] = Math.max(m.speeds[l][j], m.topSpeeds[j]);
				m.topSpeed = Math.max(m.speeds[l][j], m.topSpeed);
			}
			let filteredSpeeds = [];
			for (let l = 0; l < speeds.length; l++) {
				if (speeds[l] > avg * 0.75) {
					filteredSpeeds.push(speeds[l]);
				}
			}
			if (filteredSpeeds.length <= 0) {
				for (let l = 0; l < speeds.length; l++) {
					filteredSpeeds.push(speeds[l]);
				}
			}
			m.averageSpeeds[j] = filteredSpeeds.reduce((total, currentValue) => {
				return total + currentValue;
			}) / filteredSpeeds.length;
			m.averageSpeed += m.averageSpeeds[j] / participants.length;
		}
	}
}

function addTimeDetails(meter, lap) {
	let times = [];
	for (j = 0; j < participants.length; j++) {
		let time = meter.raceTimes[lap][j];
		if (!Number.isNaN(time) && document.getElementById(participants[j]).checked) {
			times.push([time, j]);
		}
	}
	if (times.length <= 0) return;
	let sorted = times.sort((a,b)=> {
		return a[0] - b[0];
	});

	details[participants[sorted[0][1]]] = formatMinute(sorted[0][0]);
	for (i = 1; i < sorted.length; i++) {
		details[participants[sorted[i][1]]] = '+' + formatMinute(sorted[i][0] - sorted[0][0]);
	}
}

function addSpeedDetails(meter, lap) {
	let speeds = [];

	for (j = 0; j < participants.length; j++) {
		let speed = 0;
		if (lap === 0) {
			speed = meter.averageSpeeds[j];
		} else {
			 speed = meter.speeds[lap-1][j];
		}
		if (!Number.isNaN(speed) && document.getElementById(participants[j]).checked) {
			speeds.push([speed, j]);
		}
	}
	if (speeds.length <= 0) return;
	let sorted = speeds.sort((a,b)=> {
		return b[0] - a[0];
	});

	for (i = 0; i < sorted.length; i++) {
		details[participants[sorted[i][1]]] = formatSpeed(sorted[i][0]);
	}
}

function addTopSpeedDetails(meter) {
	let speeds = [];
	for (j = 0; j < participants.length; j++) {
		let speed = meter.topSpeeds[j];
		if (!Number.isNaN(speed) && document.getElementById(participants[j]).checked) {
			speeds.push([speed, j]);
		}
	}
	if (speeds.length <= 0) return;
	let sorted = speeds.sort((a,b)=> {
		return b[0] - a[0];
	});

	for (i = 0; i < sorted.length; i++) {
		details[participants[sorted[i][1]]] = formatSpeed(sorted[i][0]);
	}
}

function addLapTimesDetails(lap) {
	let times = [];
	let meter = meters[nbrMeters-1];
	for (j = 0; j < participants.length; j++) {
		let time = meter.lapTimes[lap][j];
		if (!Number.isNaN(time) && document.getElementById(participants[j]).checked) {
			times.push([time, j]);
		}
	}
	if (times.length <= 0) return;

	let sorted = times.sort((a,b)=> {
		return a[0] - b[0];
	});

	details[participants[sorted[0][1]]] = formatMinute(sorted[0][0]);
	for (i = 1; i < sorted.length; i++) {
		details[participants[sorted[i][1]]] = formatMinute(sorted[i][0]);
	}
}


function getMaxTimeDiff() {
	let maxDiff = 0;
	let minDiff = 0;
	let offset = meters[0].raceTimes[0].reduce((total, current) =>{
		return total + current;
	}) / meters[0].raceTimes[0].length;

	for (let i = 0; i < nbrMeters; i++) {
		for (let l = 0; l < nbrLaps; l++) {
			let pace = meters[i].pace + l * meters[nbrMeters-1].pace;
			for (let j = 0; j < participants.length; j++) {
				if (Number.isNaN(meters[i].raceTimes[l][j])) continue;
				maxDiff = Math.max(meters[i].raceTimes[l][j] - offset - pace, maxDiff);
				minDiff = Math.min(meters[i].raceTimes[l][j] - offset - pace, minDiff);
			}
		}
	}

	return Math.max(Math.abs(minDiff), Math.abs(maxDiff));
}

function getRowAtDistance(dist, j, range) {
	let row = [];
	while (range.to < data.length && data[range.to][j+1][0] < dist) {
		range.to++
	}
	if (range.to >= data.length) {
		row.push(NaN);
		row.push(0);
		row.push(null);
	} else {
		range.from = range.to - 1;
		let w = 1;
		if (data[range.to][j+1][0] > data[range.from][j+1][0]) {
			w = (dist - data[range.from][j+1][0]) / (data[range.to][j+1][0] - data[range.from][j+1][0]);
			row.push(interpolate(data[range.from][0], data[range.to][0], w));
			row.push(interpolate(data[range.from][j+1][1], data[range.to][j+1][1], w));
			row.push(interpolate(data[range.from][j+1][2], data[range.to][j+1][2], w));
		}
	}
	return row;
}

function formatMinute(time_ms) {
	if (time_ms >= 60000) {
		return Math.floor(time_ms/60000).toString() + ':' + ('0' + Math.floor(time_ms / 1000) % 60).slice(-2) + '.' +  ('00' + Math.round(time_ms % 1000)).slice(-3);
	} else {
		return (Math.floor(time_ms / 1000) % 60) + '.' + ('00' + Math.round(time_ms % 1000)).slice(-3);
	}
}

function formatSpeed(speed) {
	return ((Math.round(speed * 3.6 * 10) / 10) + '.0').slice(0, 5) + ' km/h';
}


initiate();
window.requestAnimFrame(loop);