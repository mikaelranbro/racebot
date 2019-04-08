const PureImage = require('pureimage');
const fs = require('fs');
const moment = require('moment');
//const rData = require('./race_data/20190407_Donington_Park_GP.json');
const rData = require('./race_data/20190402_Sakitto_GP.json');
let colors = ['#dd0000', '#00dd00', '#0000dd', '#dddd00', '#dd00dd', '#00dddd', '#ffaa77', '#aaff77', '#77aaff'];

let image = PureImage.make(2048, 1024);
let imageIndex = 0;
let NO_VALUE = -12345678;

function generateData(nbrRows, nbrColumns) {
	let data = [];
	let time = 0;
	let speed = [];
	let acc = [];
	for (let k = 0; k < nbrColumns; k++) {
		speed.push(0);
		acc.push(0);
	}
	for (let i = 0; i < nbrRows; i++) {
		let row = [];
		time = time + 1000 + rand(100) - rand(100);
		row.push(time);
		for (let j = 0; j < nbrColumns; j++) {
			if (dice(3) === 1 && (rand(100) - rand(50)) > acc[j]) {
				acc[j] = round2(8 + rand(5) - speed[j] / 10);
				// console.log('A: ' + speed[j] + ', '  + acc);
			} else if (dice(3) === 1 && (rand(100) - rand(30)) < speed[j]) {
				acc[j] = round2(-10 - rand(3) + speed[j] / 10);
				// console.log('B: ' + speed[j] + ', ' + acc);
			} else if (dice(2) === 1 && (rand(100) < speed[j])) {
				acc[j] = round2((rand(10) - rand(10)) / 10);
				// console.log('C: ' + speed[j] + ', '  + acc);
			} else {

				acc[j] = round2(acc[j] + (rand(5) - rand(5)) / 10);
				if (speed[j] > 90 && acc[j] > 0) {
					acc[j] = 0;
				}
				// console.log('D: ' + speed[j] + ', '  + acc);
			}
			speed[j] = round2(speed[j] + acc[j]);
			if (i > 0) {
				// console.log('previous dist: ' + data[i-1][j+1]);
				row.push(Math.round((data[i - 1][j + 1] + speed[j]) * 10) / 10);
			} else {
				row.push(speed[j]);
			}
		}
		data.push(row);
	}
	return data;
}
//let distance = generateData(5000, 9);
// console.log(distance);

function calculateScale(image, data, topMargin, rightMargin, bottomMargin, leftMargin) {
	image.topMargin = topMargin;
	image.rightMargin = rightMargin;
	image.bottomMargin = bottomMargin;
	image.leftMargin = leftMargin;

	let totalMax = 0;
	let totalMin = 10000;
	for (let i = 0; i < data.length; i++) {
		for (let j = 1; j < data[0].length; j++) {
			if (data[i][j] !== NO_VALUE) {
				totalMax = Math.max(data[i][j], totalMax);
				totalMin = Math.min(data[i][j], totalMin);
			}
		}
		// totalMin = Math.min(totalMin, ...data[i].slice(1));
		//totalMax = Math.max(totalMax, ...data[i].slice(1));
	}
	console.log('Total min: ' + totalMin);
	console.log('Total max: ' + totalMax);
	image.xScale = (image.width - leftMargin - rightMargin) / data[data.length - 1][0];
	image.yScale = (image.height - topMargin - bottomMargin) / (2 * Math.max(totalMax, Math.abs(totalMin)));
	image.yCenter = (image.height - topMargin - bottomMargin) / 2 + topMargin;
}

function drawRulers(image, step) {
	let y0 = image.yCenter;
	let y = y0;
	let ctx = image.getContext('2d');
	ctx.fillStyle = '#555555';
	ctx.globalAlpha = 0.2;
	while (y < image.height - image.bottomMargin) {
		let height = Math.min(step * image.yScale, image.height - image.bottomMargin - y);
		ctx.fillRect(image.leftMargin, y, image.width - image.rightMargin - image.leftMargin, height);
		y += 2 * step * image.yScale;
	}
	y = y0;
	while (y > image.topMargin) {
		let yy = Math.max(y - step * image.yScale, image.topMargin);
		ctx.fillRect(image.leftMargin, yy, image.width - image.rightMargin - image.leftMargin, y - yy);
		y -= 2 * step * image.yScale;
	}
	ctx.globalAlpha = 1;
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(image.leftMargin, image.topMargin);
	ctx.lineTo(image.leftMargin, image.height - image.bottomMargin);
	ctx.moveTo(image.width - image.rightMargin, image.topMargin);
	ctx.lineTo(image.width - image.rightMargin, image.height - image.bottomMargin);
	ctx.moveTo(image.leftMargin - 32, y0);
	ctx.lineTo(image.width - image.rightMargin + 32, y0);
	y = y0 - step * image.yScale;
	while (y > image.topMargin) {
		ctx.moveTo(image.leftMargin, y);
		ctx.lineTo(image.leftMargin - 16, y);
		ctx.moveTo(image.width - image.rightMargin, y);
		ctx.lineTo(image.width - image.rightMargin + 16, y);
		y = y - step * image.yScale;
	}
	y = y0 + step * image.yScale;
	while (y < image.height - image.bottomMargin) {
		ctx.moveTo(image.leftMargin, y);
		ctx.lineTo(image.leftMargin - 16, y);
		ctx.moveTo(image.width - image.rightMargin, y);
		ctx.lineTo(image.width - image.rightMargin + 16, y);
		y = y + step * image.yScale;
	}
	ctx.strokeStyle = '#c0c0c0';
	ctx.stroke();

}

function drawGraph(image, data) {
	let ctx = image.getContext('2d');
	let nbrC = data[0].length - 1;
	let nbrR = data.length;

	for (let j = 0; j < nbrC; j++) {
		// console.log('c' + (j + 1) + ': ');
		ctx.beginPath();
		ctx.strokeStyle = colors[j];
		ctx.lineWidth = 5;
		ctx.moveTo(image.leftMargin, image.yCenter)
		for (let i = 0; i < data.length; i++) {
			// console.log(data[i][j + 1]);
			if (data[i][j + 1] !== NO_VALUE) {
				ctx.lineTo(image.leftMargin + data[i][0] * image.xScale, image.yCenter + data[i][j + 1] * image.yScale);
			} else {
				// console.log('ignore c' + (j + 1));
			}
		}
		ctx.stroke();
	}

}


function drawLaps(image, input, font) {
	let ctx = image.getContext('2d');
	let bestLapOffset = image.leftMargin + 316;
	ctx.globalAlpha = 1;
	//ctx.fillStyle = '#888888';
	// ctx.fillRect(image.leftMargin, image.height - image.bottomMargin + 12, 480, 64 + input.participants.length * 32)
	ctx.font = '24pt "opensans"';
	ctx.fillStyle = '#c0c0c0';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'top';
	ctx.fillText("BEST LAP", bestLapOffset, image.height - image.bottomMargin + 48);
	for (let i = 0; i < input.participants.length; i++) {
		let name = input.participants[i];
		let result = input.results[name];
		let lapString = 'N/A';
		if (result.fastestLap > 0) {
			let lapTime = moment.duration(result.fastestLap * 1000);
			lapString = lapTime.minutes() + ':' + lapTime.seconds() + '.' + Math.round(lapTime.milliseconds());
		}
		ctx.fillStyle = colors[i];
		let y = (i + 1) * 32;
		if (result.position > 0) {
			y = result.position * 32;
		}
		ctx.fillText(result.position + '  ' + name, image.leftMargin + 16, image.height - image.bottomMargin + 48 + y);
		ctx.fillText(lapString, bestLapOffset, image.height - image.bottomMargin + 48 + y);
		//ctx.fill();
	}
	/*
	Object.keys(input.).forEach((name) => {

	});*/
}

function processData(image, data) {
	let ctx = image.getContext('2d');
	let leftMargin = 64;
	let rightMargin = 128
	let topMargin = 32;
	let bottomMargin = 256;
	let nbrC = data[0].length - 1;
	let nbrR = data.length;
	let xScale = (image.width - leftMargin - rightMargin) / data[data.length - 1][0];

	let nData = normalize2(data);
	// let maxY = Math.max(...(nData[nbrR-1].slice(1)));
	let maxY = Math.max(...(nData[nbrR - 1].slice(1))) + Math.abs(Math.min(...(nData[nbrR - 1].slice(1))));
	let yScale = (image.height - topMargin - bottomMargin) * 0.75 / maxY;
	let y0 = (image.height - topMargin - bottomMargin) / 2 + topMargin;

	drawRulers(image, xScale, yScale, topMargin, rightMargin, bottomMargin, leftMargin);


	console.log('xScale: ' + xScale + ', yScale: ' + yScale);
	for (let j = 0; j < nbrC; j++) {
		console.log('Drawing line...');
		ctx.beginPath();
		ctx.strokeStyle = colors[j];
		ctx.lineWidth = 5;
		ctx.moveTo(leftMargin, y0)
		for (let i = 0; i < data.length; i = i + 1) {
			process.stdout.write('.');
			// console.log(leftMargin + nData[i][0] * xScale + ',' + y0 + nData[i][j + 1] * yScale);
			ctx.lineTo(leftMargin + nData[i][0] * xScale, y0 + nData[i][j + 1] * yScale);
		}
		ctx.stroke();
	}
	/*
	let fnt = PureImage.registerFont('arial.ttf', 'arial');
	fnt.load(() => {
		ctx.font = '32pt "arial"';
		ctx.fillStyle = '#c0c0c0';
  	ctx.textAlign = 'right';
  	ctx.textBaseline = 'middle';
		ctx.fillText('0m ', leftMargin - 16, y0)
		ctx.fillText('1000m ', leftMargin - 16, y0 - 1000 * yScale);
		ctx.fill();
		*/
	PureImage.encodePNGToStream(image, fs.createWriteStream('out.png')).then(() => {
		console.log('Wrote to out.png');
	}).catch((e) => {
		console.log('Failed to write to out.png');
	})
	//});
}

function interpolateOnDistance2(data, step = 100) {
	let point = 0;
	let i = [];
	let nbrColumns = data[0].length - 1;
	out = [];
	for (let c = 0; c < nbrColumns; c++) {
		i[c] = 0;
	}
	let finished = 0;
	for (let p = step; p < (rData.eventInformation.mTrackLength * rData.eventInformation.mLapsInEvent); p += step) {
		let row = [];
		row.push(p);
		for (let j = 1; j < nbrColumns + 1; j++) {
			finished = 0;
			let h = i[j - 1];
			while (h < data.length && data[h][j] < p) {
				//console.log(data[h][j] + ' < ' + p);
				h++;
			}

			if (h < data.length) {
				if (h <= 0) {
					console.log('Should not happen.');
					row.push(data[h][0]);
				} else {

					let w = (p - data[h - 1][j]) / (data[h][j] - data[h - 1][j]);
					let time = round2(w * data[h][0] + (1 - w) * data[h - 1][0]);
					if (j == 2) {
						// console.log('c' + j + ': ' + data[h][j] + ' > ' + p + ' --- w = ' + w + ', time = ' + time);
					}
					row.push(time);
				}
			} else {
				finished++;
				console.log('p: ' + p + ', ' + finished + '/' + nbrColumns + ' cars finished.');
				//console.log('* ' + j + ' -1 *');
				row.push(NO_VALUE);
			}
		}
		if (finished >= nbrColumns) {
			console.log('All cars finished');
			return out;
		}
		out.push(row);
	}
	return out;
};

function normalizeDistanceOnLeader(data) {
	// console.log(data);
	let out = [];
	let nbrC = data[0].length - 1;
	for (let i = 0; i < data.length; i++) {
		let maxD = Math.max(...data[i].slice(1));
		let row = [];
		row.push(data[i][0])
		for (let j = 0; j < nbrC; j++) {
			row.push(maxD - data[i][j + 1]);
		}
		out.push(row);
	}
	// console.log(out);
	return out;
}

function normalize2(data) {
	// console.log(data);
	console.log('Normalizing...');
	let out = [];
	let nbrC = data[0].length - 1;
	for (let i = 0; i < data.length; i++) {
		let av = data[i].slice(1).reduce((a, b) => a + b, 0) / nbrC;


		// let maxD = Math.max(...data[i].slice(1));
		// console.log('Average of ' + data[i].slice(1) + ' => ' + av);
		let row = [];
		row.push(data[i][0])
		for (let j = 0; j < nbrC; j++) {
			row.push(Math.round(av - data[i][j + 1]));
		}
		out.push(row);
	}
	// console.log(out);
	return out;
}

let average = [];

function normalize3(data) {
	// console.log(data);
	let out = [];
	let nbrC = data[0].length - 1;
	for (i = 0; i < nbrC; i++) {
		average[i] = 0;
	}
	for (let i = 0; i < data.length; i++) {
		let n = 0;
		let sum = 0;
		for (let j = 1; j < nbrC + 1; j++) {
			if (data[i][j] !== NO_VALUE) {
				n++;
				sum += data[i][j];
			} else {
				/*
				if (i > 0) {
					sum += average[j - 1];
					n++;
					console.log('padding with ' + average[j - 1]);
				} else {
					console.log('No values for c' + j);
				}
				*/
			}
		}
		if (n > 0) {
			av = sum / n;
		} else {
			av = 0;
		}
		//let av = data[i].slice(1).reduce((a,b) => a+b, 0) / nbrC;
		// console.log('Average of ' + data[i].slice(1) + ' => ' + av);
		let row = [];
		row.push(data[i][0])
		for (let j = 1; j < nbrC + 1; j++) {
			if (data[i][j] !== NO_VALUE) {
				row.push(Math.round(data[i][j] - av));
				average[j - 1] = (average[j - 1] * 9 + data[i][j] - av) / 10;
			} else {
				console.log('No value for driver ' + j + ' at ' + data[i][0]);
				row.push(NO_VALUE);
			}
		}
		out.push(row);
		// process.stdout.write('.');
	}
	// console.log(out);
	return out;
}


function saveImage(image, input) {
	imageIndex++;
	let filename = '20190407_' + input.eventInformation.mTrackLocation + '_' + input.eventInformation.mTrackVariation + '_' + imageIndex + '.png';
	PureImage.encodePNGToStream(image, fs.createWriteStream(filename)).then(() => {
		console.log('Wrote to ' + filename);
	}).catch((e) => {
		console.log('Failed to write to ' + filename);
	})

}


function rand(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

function dice(max) {
	return 1 + Math.floor(Math.random() * Math.floor(max));
}

function round2(value) {
	return Math.round(value * 100) / 100;
}

let timings = interpolateOnDistance2(rData.distance, 100);
//console.log(timings);
let image1 = PureImage.make(2048, 1024);
//processData(image1, rData.distance);
let image2 = PureImage.make(2048, 1024);

let nTimings = normalize3(timings);
process.stdout.write('Calculating scale... ');
calculateScale(image2, nTimings, 32, 64, 64 + rData.participants.length * 32, 64);
process.stdout.write('Done calculating scale.\n');
process.stdout.write('Drawing rulers... ');
drawRulers(image2, 20000);
process.stdout.write('Done drawing rulers.\n')
process.stdout.write('Drawing graph... ');
drawGraph(image2, nTimings);
process.stdout.write('Done drawing graph.\n');
calculateScale(image1, timings, 32, 64, 64 + rData.participants.length * 32, 64);
drawGraph(image1, nTimings);
saveImage(image1, rData);

let fnt = PureImage.registerFont('./fonts/OpenSansBold.ttf', 'opensans');
fnt.load(() => {
	drawLaps(image2, rData);
	saveImage(image2, rData);

});