let mouse = {
	"x": NaN,
	"y": NaN,
	"button": NaN,
	"processed": true
}

let controlShadowColor = 'rgba(102, 100, 90, 0.5)';
let controlLightColor = 'rgba(242, 240, 230, 1)';
let controlDarkColor = 'rgba(202, 200, 190, 1)';
let controlOutlineColor = 'rgba(100, 100, 100, 1)';
let controlHighlightColor = 'rgba(252, 250, 240, 1)';

function register() {
	let c = document.getElementById("canvas");
	c.addEventListener('mousemove', handleMouseMove);
	c.addEventListener('mousedown', handleMouseDown);
	c.addEventListener('mouseup', handleMouseUp);
	c.addEventListener('mouseout', handleMouseOut);
}

function handleMouseMove(event) {
	mouse.x = event.offsetX;
	mouse.y = event.offsetY;
}

function handleMouseDown(event) {
	mouse.button = event.button;
	mouse.x = event.offsetX;
	mouse.y = event.offsetY;
	mouse.processed = false;
	/*
	if (hooverLap !== -1) {
		selectedLap = hooverLap;
	}
	if (hooverMeter !== -1) {
		selectedMeter = hooverMeter;
	}*/
}

function handleMouseUp(event) {
	mouse.button = NaN;
	mouse.x = event.offsetX;
	mouse.y = event.offsetY;
	mouse.processed = false;
}

function handleMouseOut(event) {
	mouse.x = NaN;
	mouse.y = NaN;
	hooverLap = -1;
	hooverMeter = -1;
}
register();

let menuHeight = 48;
function drawButtons(ctx) {
	let nbrModes = modeString.length;
	let height = menuHeight;
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	ctx.lineWidth = 2;
	ctx.font = '14px Courier New';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	let x0 = Math.min(this.innerWidth - 32, ctx.width-16) - nbrModes * 128;
	ctx.beginPath();
	let top = 8;
	let gradient = ctx.createLinearGradient(x0 - 256, 0, x0, 0);
	gradient.addColorStop(0, 'rgba(100, 100, 100,0)');
	gradient.addColorStop(1, 'rgba(100,100, 100,1)');
	ctx.strokeStyle = gradient;
	ctx.moveTo(x0 - 256, height);
	ctx.moveTo(Math.min(200, x0 - 256), 4);
	ctx.lineTo(x0, height);
	for (i = 0; i < nbrModes; i++) {
		if (inBounds({"x": x0+i*128, "y": 4, "width": 128, "height": height - 4}, mouse)) {
			top = 8;
			if (mouse.button === 0) {
				mode = i;
			}
		} else {
			top = 12;
		}
		ctx.bezierCurveTo(x0 + i* 128, top + 20, x0 + i * 128, top, x0 + i * 128 + 64, top);
		ctx.bezierCurveTo(x0 + i* 128 + 124, top, x0 + i * 128 + 124, top, x0 + i * 128 + 124, height);
		if (mode !== i) {
			ctx.lineTo(x0 + i * 128, height);
		}
		ctx.lineTo(x0 + i * 128 + 128, height);
		ctx.fillText(modeString[i], x0 + i * 128 + 64, height / 2 + top);
	}
	ctx.shadowBlur = 8;
	ctx.shadowColor = controlShadowColor;
	ctx.shadowOffsetY = - 4;
	ctx.stroke();
	ctx.beginPath();
	let gradient2 = ctx.createLinearGradient(x0 + nbrModes * 128, 0, ctx.width, 0);
	gradient2.addColorStop(0, controlOutlineColor);
	gradient2.addColorStop(1, 'rgba(100,100, 100,0)');
	ctx.strokeStyle = gradient2;
	ctx.moveTo(x0 + nbrModes * 128, height);
	ctx.lineTo(ctx.width, height);
	ctx.stroke();
	ctx.restore();
	drawSubButtons(ctx);
}

function drawSubButtons(ctx) {
	switch (mode) {
		case MODE.GRAPH:
			drawGraphButtons(ctx);
		break;
		case MODE.PLAYBACK:
		drawPlaybackButtons(ctx);
		break;
	}
}

function drawGraphButtons(ctx) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.font = '20px "Courier New"';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	for (i = 0; i < nbrGraphModes; i++) {
		if (i === graphMode) {
			ctx.font = 'bold 20px "Courier New"';	
		} else {
			ctx.font = '20px "Courier New"';
		}
		let x0 = Math.min(ctx.width - ctx.rightMargin, this.innerWidth - 32 - ctx.rightMargin);
		if (inBounds({"x": x0, "y": i * 24 + menuHeight + 32, "width": ctx.rightMargin, "height": 24}, mouse)){
			if (mouse.button === 0) {
				graphMode = i;
			} 
			if (graphMode !== i) {
				x0 -= 4;
			}
		}
		ctx.fillText(graphModeString[i], x0, i * 24 + menuHeight + 32);
	}
	ctx.restore();
}

function drawPlaybackButtons(ctx) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.font = '20px "Courier New"';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	let text = '';
	let x0 = Math.min(ctx.width - ctx.rightMargin, this.innerWidth - 32 - ctx.rightMargin);
	if (inBounds({"x": x0, "y": menuHeight + 32, "width": ctx.rightMargin, "height": 24}, mouse)){
		if (mouse.button === 0 && !mouse.processed) {
			backgroundVisible = !backgroundVisible;
			mouse.processed = true;
		}
		if (graphMode !== i) {
			x0 -= 4;
		}
	}
	if (backgroundVisible) {
		ctx.font = 'bold 20px "Courier New"';
	} else {
		ctx.font = '20px "Courier New"';
	}
	ctx.fillText('Background', x0, menuHeight + 32);

	/* if (mouse.y > ctx.height - ctx.bottomMargin / 2 - buttonHeight &&
	mouse.y < ctx.height) {
		ctx.globalAlpha = 1;
	} else {
		ctx.globalAlpha = 0.25;
	}*/

	drawRewindButton(ctx, ctx.leftMargin / 2 - buttonWidth / 2);
	drawSlowerButton(ctx, ctx.leftMargin / 2 - buttonWidth / 2 + buttonWidth + 8);
	drawPauseButton(ctx, ctx.leftMargin / 2 - buttonWidth / 2 + (buttonWidth + 8) * 2);
	drawPlayButton(ctx, ctx.leftMargin / 2 - buttonWidth / 2 + (buttonWidth + 8) * 3);
	drawFasterButton(ctx, ctx.leftMargin / 2 - buttonWidth / 2 + (buttonWidth + 8) * 4);
	drawTimeLine(ctx, ctx.leftMargin / 2 - buttonWidth / 2 + (buttonWidth + 8) * 5 + 16);
	ctx.restore();
}

let buttonHeight = 32;
let buttonWidth = 32;
function drawRewindButton(ctx, x0) {
	ctx.save();
	let y0 = setupButton(ctx, x0, () => {raceTime = 0;});
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x0, y0 + buttonHeight);
	ctx.moveTo(x0, y0 + buttonHeight / 2);
	ctx.lineTo(x0 + buttonWidth / 2, y0);
	ctx.lineTo(x0 + buttonWidth / 2, y0 + buttonHeight);
	ctx.lineTo(x0, y0 + buttonHeight / 2);
	ctx.moveTo(x0 + buttonWidth / 2, y0 + buttonHeight / 2);
	ctx.lineTo(x0 + buttonWidth, y0);
	ctx.lineTo(x0 + buttonWidth, y0 + buttonHeight);
	ctx.lineTo(x0 + buttonWidth / 2, y0 + buttonHeight / 2);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function drawSlowerButton(ctx, x0) {
	ctx.save();
	let y0 = setupButton(ctx, x0, slowerPlayback);
	ctx.beginPath();
	ctx.moveTo(x0, y0 + buttonHeight / 2);
	ctx.lineTo(x0 + buttonWidth / 2, y0);
	ctx.lineTo(x0 + buttonWidth / 2, y0 + buttonHeight);
	ctx.lineTo(x0, y0 + buttonHeight / 2);
	ctx.moveTo(x0 + buttonWidth / 2, y0 + buttonHeight / 2);
	ctx.lineTo(x0 + buttonWidth, y0);
	ctx.lineTo(x0 + buttonWidth, y0 + buttonHeight);
	ctx.lineTo(x0 + buttonWidth / 2, y0 + buttonHeight / 2);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function drawPauseButton(ctx, x0) {
	ctx.save();
	let y0 = setupButton(ctx, x0, () => {playbackScale = 0;});
	ctx.beginPath();
	ctx.moveTo(x0 + buttonWidth / 8, y0);
	ctx.lineTo(x0 + buttonWidth / 8 * 3, y0);
	ctx.lineTo(x0 + buttonWidth / 8 * 3, y0 + buttonHeight);
	ctx.lineTo(x0 + buttonWidth / 8, y0 + buttonHeight);
	ctx.lineTo(x0 + buttonWidth / 8, y0);
	ctx.moveTo(x0 + buttonWidth / 8 * 5, y0);
	ctx.lineTo(x0 + buttonWidth / 8 * 7, y0);
	ctx.lineTo(x0 + buttonWidth / 8 * 7, y0 + buttonHeight);
	ctx.lineTo(x0 + buttonWidth / 8 * 5, y0 + buttonHeight);
	ctx.lineTo(x0 + buttonWidth / 8 * 5, y0);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function drawPlayButton(ctx, x0) {
	ctx.save();
	let y0 = setupButton(ctx, x0, () => {playbackScale = 1;});
	ctx.beginPath();
	ctx.moveTo(x0 + buttonWidth / 8, y0);
	ctx.lineTo(x0 + buttonWidth / 8 * 7, y0 + buttonHeight / 2);
	ctx.lineTo(x0 + buttonWidth / 8, y0 + buttonHeight);
	ctx.lineTo(x0 + buttonWidth / 8, y0);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function drawFasterButton(ctx, x0) {
	ctx.save();
	let y0 = setupButton(ctx, x0, fasterPlayback);
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x0 + buttonWidth / 2, y0 + buttonHeight / 2);
	ctx.lineTo(x0, y0 + buttonHeight);
	ctx.lineTo(x0, y0);
	ctx.moveTo(x0 + buttonWidth / 2, y0);
	ctx.lineTo(x0 + buttonWidth, y0 + buttonHeight / 2);
	ctx.lineTo(x0 + buttonWidth / 2, y0 + buttonHeight);
	ctx.lineTo(x0 + buttonWidth / 2, y0);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}


function drawTimeLine(ctx, x0) {
	let width = ctx.width - ctx.rightMargin / 2 - x0;
	let maxTime = data[data.length - 1][0];
	let y0 = ctx.height - ctx.bottomMargin / 2 - buttonHeight / 4;
	let lapWidth = width / nbrLaps;
	ctx.save();
	ctx.beginPath();

	let x = x0 + raceTime / maxTime * width;
	ctx.moveTo(x, y0 + buttonHeight / 4 * 3);
	ctx.lineTo(x - 4, y0 + buttonHeight / 2 + 2);
	ctx.lineTo(x - 4, y0 - buttonHeight / 4);
	ctx.lineTo(x + 4, y0 - buttonHeight / 4);
	ctx.lineTo(x + 4, y0 + buttonHeight / 2 + 2);
	ctx.closePath();
	ctx.shadowOffsetY = 2;
	ctx.shadowBlur = 4;
	ctx.shadowColor = controlShadowColor;
	ctx.fillStyle = controlLightColor;
	//ctx.fillStyle = 'rgba(225,225,225,1)';
	ctx.fill();
	ctx.lineJoin = 'round';
	ctx.lineWidth = 1.5;
	ctx.strokeStyle = controlOutlineColor;
	ctx.stroke();
	//ctx.shadowOffsetY = 0;
	//ctx.shadowBlur = 0;
	let g = ctx.createLinearGradient(x0, 0, x0 + width, 0);
	for (let l = 0; l < nbrLaps; l++) {
		if (l % 2 === 0) {
			g.addColorStop(l/nbrLaps, controlDarkColor);
			g.addColorStop((l+1)/nbrLaps, controlDarkColor);
		} else {
			g.addColorStop(l/nbrLaps, controlLightColor);
			g.addColorStop((l+1)/nbrLaps, controlLightColor);
		}
	}
	let y1 = y0 + buttonHeight / 2;
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	let ow = 20;
	let iw = 8;
	let h = 3;

	if (mouse.y > y0 - buttonHeight / 4 && y0 < y0 + buttonHeight / 4 * 3 && mouse.x >= x0 && mouse.y <= x0 + width) {
		if (mouse.button === 0) {
			raceTime = (mouse.x - x0) / width * maxTime;
		}
	}

	if (x > x0 + ow) {
		ctx.lineTo(x - ow, y0);
	}
	if (x > x0 + iw) {
		ctx.bezierCurveTo(Math.max(x - ow + iw, x0), y0, x - iw, y0 - h, x, y0 - h);
	} else {
		ctx.moveTo(x0, y0 - h);
		//ctx.moveTo(x0, y0 - h + (h * (x - x0) / iw));
	}
	if (x < x0 + width - iw) {
		ctx.bezierCurveTo(x + iw, y0 - h, Math.min(x + ow - iw, x0 + width), y0, Math.min(x + ow, x0 + width), y0);
		ctx.lineTo(x0 + width, y0);
		ctx.lineTo(x0 + width, y1);
		ctx.lineTo(Math.min(x + ow, x0 + width), y1);
		ctx.bezierCurveTo(Math.min(x + ow - iw, x0 + width), y1, x + iw, y1 - h, x, y1 - h);
	} else {
		ctx.lineTo(x0 + width, y0 - h);
		ctx.lineTo(x0 + width, y1 - h);
		ctx.lineTo(x, y1 - h);
	}

	if (x > x0 + iw) {
		ctx.bezierCurveTo(x - iw, y1 - h, Math.max(x  - ow + iw, x0), y1, Math.max(x - ow, x0), y1);
		ctx.lineTo(x0, y1);
	} else {
		ctx.lineTo(x0, y1 - h);
		// ctx.lineTo(x0, y1 - h + (h * (x - x0) / iw));
	}

	ctx.closePath();

	ctx.fillStyle = g;
	ctx.fill();
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;
	for (i = 0; i < overtakes.length; i++) {
		//getColor(j, s = 100, l = 40, a = 1)
		if (!participantEnabled(overtakes[i].overtaker) || !participantEnabled(overtakes[i].overtaken)) {
			continue;
		}
		let xo = overtakes[i].time / maxTime * width + x0;
		let yo = y0 + buttonHeight / 4;
		if (Math.abs(xo - x) < ow) {
			yo = yo - (ow - Math.abs(xo - x)) / ow * h;
		}
		ctx.fillStyle = getColor(overtakes[i].overtaker, 100, 50, 1);
		ctx.fillRect(xo - 1, yo - 4, 3, 3);
		ctx.fillStyle = getColor(overtakes[i].overtaken, 100, 50, 1);
		ctx.fillRect(xo - 1, yo + 1, 3, 3);
	}
	if (mouse.y > y0 - buttonHeight / 4 && y0 < y0 + buttonHeight / 4 * 3 && mouse.x >= x0 && mouse.x <= x0 + width &&
		mouse.button !== 0) {
		ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.fillRect(mouse.x - 4, y0, 8, buttonHeight / 2);
	}
	ctx.stroke();
	//ctx.fillRect(x0, y0, width, buttonHeight / 2);

	ctx.beginPath();
	ctx.moveTo(x, y0 + buttonHeight / 4);
	ctx.lineTo(x - 4, y0 - buttonHeight / 8);
	ctx.lineTo(x - 4, y0 - buttonHeight / 4);
	ctx.lineTo(x + 4, y0 - buttonHeight / 4);
	ctx.lineTo(x + 4, y0 - buttonHeight / 8);
	ctx.closePath();
	ctx.shadowOffsetY = 2;
	ctx.shadowBlur = 4;
	ctx.shadowColor = controlShadowColor;
	ctx.fillStyle = controlLightColor;
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function setupButton(ctx, x0, callback) {
	let y0 = ctx.height - ctx.bottomMargin / 2 - buttonHeight / 2;
	let hit = inBounds({"x": x0, "y": y0, "width": buttonWidth, "height": buttonHeight}, mouse);
	let offset = 0;
	if (hit && mouse.button !== 0) {
		offset = - 2;
	}
	// let offset = getOffset({"x": x0, "y": y0, "width": buttonWidth, "height": buttonHeight});
	y0 = y0 + offset;
	ctx.shadowOffsetY = 4 - offset;
	ctx.shadowBlur = 4 + Math.abs(offset);
	ctx.shadowColor = controlShadowColor;
	ctx.lineWidth = 1.5;
	ctx.lineJoin = 'round';
	ctx.strokeStyle = controlOutlineColor;
	if (hit && mouse.button === 0) {
		//ctx.fillStyle = 'rgba(255, 255, 255, 0)';
		ctx.fillStyle = controlDarkColor;
		if (!mouse.processed) {
			if (typeof callback !== 'undefined') {
				callback();
			}
			mouse.processed = true;
		}
	} else if (hit) {
		ctx.fillStyle = controlHighlightColor;
	} else {
		ctx.fillStyle = controlLightColor;
	}
	return y0;
}

function getOffset(bounds) {
	if (mouse.button !== 0 && inBounds(bounds, mouse)) {
		return -4;
	} else {
		return 0;
	}
}

function inBounds(bounds, point) {
	if (point.x >= bounds.x && point.x < bounds.x + bounds.width &&
		  point.y >= bounds.y && point.y < bounds.y + bounds.height) {
		return true;
	}
	return false;
}
