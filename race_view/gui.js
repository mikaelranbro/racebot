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
	document.addEventListener("fullscreenchange", handleFullscreenChange);	/* Standard syntax */
	document.addEventListener("mozfullscreenchange", handleFullscreenChange); /* Firefox */
	document.addEventListener("webkitfullscreenchange", handleFullscreenChange);/* Chrome, Safari and Opera */
	document.addEventListener("msfullscreenchange", handleFullscreenChange);/* IE / Edge */
	document.addEventListener("fullscreenerror", handleFullscreenError);/* Standard syntax */
	document.addEventListener("mozfullscreenerror", handleFullscreenError);/* Firefox */
	document.addEventListener("webkitfullscreenerror", handleFullscreenError);/* Chrome, Safari and Opera */
	document.addEventListener("msfullscreenerror", handleFullscreenError);/* IE / Edge */
	c.addEventListener('mousemove', handleMouseMove);
	c.addEventListener('mousedown', handleMouseDown);
	c.addEventListener('mouseup', handleMouseUp);
	c.addEventListener('mouseout', handleMouseOut);
	c.addEventListener('touchstart', handleTouchStart);
	c.addEventListener('touchmove', handleTouchMove);
	c.addEventListener('touchend', handleTouchEnd);
	c.addEventListener('touchcancel', handleTouchCancel);
}

function handleFullscreenChange(event) {
	if (document.fullscreenElement) {
    // fullscreen is activated
    isFullscreen = true;
  } else {
  	// fullscreen is cancelled
  	isFullscreen = false;
  }
 	setCanvasSize();
}

function handleFullscreenError(event) {
	if (document.fullscreenElement) {
    isFullscreen = true;
  } else {
  	isFullscreen = false;
  }
}

function getMouseCoordinates(event) {
	mouse.x = event.offsetX;
	mouse.y = event.offsetY;
	if (isFullscreen) {
		mouse.x = event.screenX;
		mouse.y = event.screenY;
	}
}

function handleMouseMove(event) {
	getMouseCoordinates(event);
}

function handleMouseDown(event) {
	mouse.button = event.button;
	getMouseCoordinates(event);
	mouse.processed = false;
}

function handleMouseUp(event) {
	mouse.button = NaN;
	getMouseCoordinates(event);
	mouse.processed = false;
}

function handleMouseOut(event) {
	mouse.x = NaN;
	mouse.y = NaN;
	hooverLap = -1;
	hooverMeter = -1;
}

function handleTouchStart(event) {
	if (event.touches.length === 1) {
		mouse.x = event.touches[0].clientX;
		mouse.y = event.touches[0].clientY;
		mouse.processed = false;
		mouse.button = 0;
	}
}
function handleTouchMove(event) {
	if (event.touches.length === 1) {
		mouse.x = event.touches[0].clientX;
		mouse.y = event.touches[0].clientY;
		//mouse.processed = false;
		mouse.button = 0;
	}
}
function handleTouchEnd(event) {
	mouse.button = NaN;
	mouse.processed = false;
}
function handleTouchCancel(event) {
	mouse.button = NaN;
	mouse.processed = false;
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
	drawParticipantButtons(ctx);
	drawFullscreenButton(ctx, ctx.width - ctx.rightMargin / 3);
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

function drawFullscreenButton(ctx, x0) {
	ctx.save();
	let y0 = setupButton(ctx, x0, toggleFullscreen);
	ctx.fillRect(x0, y0 + buttonHeight / 4, buttonHeight / 2 * 1.6 , buttonHeight / 2);
	ctx.strokeRect(x0, y0 + buttonHeight / 4, buttonHeight / 2 * 1.6 , buttonHeight / 2);
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

	if (mouse.y > y0 - buttonHeight / 4 && y0 < y0 + buttonHeight / 4 * 3 && mouse.x >= x0 && mouse.x <= x0 + width) {
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
	for (let i = 0; i < overtakes.length; i++) {
		//getColor(j, s = 100, l = 40, a = 1)
		if (!participantEnabled(overtakes[i].overtaker) || !participantEnabled(overtakes[i].overtaken)) {
			continue;
		}
		let xo = overtakes[i].time / maxTime * width + x0;
		let yo = y0 + buttonHeight / 4;
		if (Math.abs(xo - x) < ow) {
			yo = yo - (ow - Math.abs(xo - x)) / ow * h;
		}
		ctx.fillStyle = getColor(overtakes[i].overtaker, 100, 40, 1);
		ctx.fillRect(xo - 1, yo - 4, 3, 3);
		ctx.fillStyle = getColor(overtakes[i].overtaken, 100, 40, 1);
		ctx.fillRect(xo - 1, yo + 1, 3, 3);
	}
	if (mouse.y > y0 - buttonHeight / 4 && y0 < y0 + buttonHeight / 4 * 3 && mouse.x >= x0 && mouse.x <= x0 + width &&
		mouse.button !== 0) {
		ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.fillRect(mouse.x - 4, y0, 8, buttonHeight / 2);
	}
	ctx.stroke();
	for (let i = 0; i < crashes.length; i++) {
		let xo = crashes[i].time / maxTime * width + x0;
		let yo = y0 + buttonHeight / 2 - 2;
		if (Math.abs(xo - x) < ow) {
			yo = yo - (ow - Math.abs(xo - x)) / ow * h;
		}
		s = Math.min(4, 1.5 + 0.1 * crashes[i].gravity);
		ctx.beginPath();

		ctx.moveTo(xo, yo);
		ctx.lineTo(xo - 4 * s, yo);
		ctx.lineTo(xo - 2 * s, yo - 1 * s);
		ctx.lineTo(xo - 2.7 * s, yo - 2.7 * s);
		ctx.lineTo(xo - 1 * s, yo - 2 * s);
		ctx.lineTo(xo, yo - 4 * s);
		ctx.lineTo(xo + 1 * s, yo - 2 *s);
		ctx.lineTo(xo + 2.7 * s, yo - 2.7 * s);
		ctx.lineTo(xo + 2 * s, yo - 1 * s);
		ctx.lineTo(xo + 4 * s, yo);
		ctx.closePath();
		ctx.fillStyle = getColor(crashes[i].involved[0], 60, 25, 0.4);
		ctx.fill();
		/*
		if (crashes[i].involved.length > 1) {
			ctx.strokeStyle = getColor(crashes[i].involved[1], 60, 25, 0.4);
			ctx.stroke();
		}
		*/
	}

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

function drawParticipantButtons(ctx) {
	ctx.save();
	let row = getInterpolatedData(raceTime);
	let y0 = ctx.height - ctx.bottomMargin - participants.length * 24;
	let x0 = ctx.width - 160;
	for (let j = 0; j < participants.length; j++) {
		ctx.save();
		
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';
		ctx.font = 'bold 12px "Arial"';
		if (inBounds({"x": x0, "y": y0 + j * 24 - 8, "width": 160, "height": 16}, mouse)){
			ctx.translate(-4, 0);
			if (mouse.button === 0 && !mouse.processed) {
				mouse.processed = true;
				toggleParticipantEnabled(j);
			}
		}
		ctx.translate(ctx.width - 32, y0 +  j * 24);
		if (inBounds({"x": x0 - 200, "y": y0 - 64, "width": 360, "height": ctx.height - y0 + 64}, mouse)){
			ctx.fillStyle = getColor(j);
		} else {
			ctx.fillStyle = getColor(j, 100, 40, 0.4);
		}
		
		if (participantEnabled(j)) {
			ctx.fillText(participants[j], -16, 0);
			let speed = row[j][ROW.SPEED];
			let acc = 0;
			if (mode === MODE.PLAYBACK) {
				if (i1 > i0) {
					let tickTime = data[i1][0] - data[i0][0];
					if (tickTime > 0) {
						acc = (data[i1][j+1][1] - data[i0][j+1][1]) / tickTime;
					}
				}
				ctx.translate(speed / 8, 0);
			}
			drawSideCar(ctx, getColor(j), acc);
		} else {
			ctx.fillStyle = 'grey';
			if (inBounds({"x": x0 - 200, "y": y0 - 64, "width": 360, "height": ctx.height - y0 + 64}, mouse)){
				ctx.fillText(participants[j], -16, 0);
			}
			drawSideCar(ctx, 'grey');
		}
		ctx.restore();
	}
	ctx.restore();
}

/*
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
*/

function drawSideCar(ctx, color = 'grey', acc = 0) {
	ctx.save();
	ctx.save();
	ctx.rotate(Math.PI * Math.min(Math.max(-2 * acc, -0.02), 0.02));
	ctx.beginPath();
	ctx.moveTo(6.5, 3);
	ctx.bezierCurveTo(5, -2.5, 13.5, -2.5, 12, 3);
	ctx.lineTo(14, 2.9);
	ctx.bezierCurveTo(14.2, -1.5, 12.2, -2.8, 7.5, -3);
	ctx.lineTo(-7, -3);
	ctx.bezierCurveTo(-5.8, -4.2, 0.8, -5, 5.5, -3);
	ctx.lineTo(7.5, -3);
	ctx.bezierCurveTo(3.3, -6.5, -4.3, -6.9, -9.7, -4.2);
	ctx.lineTo(-13, -6.7); // spoler top
	ctx.lineTo(-13, -4.5);
	ctx.lineTo(-12, -4.5);
	ctx.lineTo(-12.3, -1.9);
	ctx.lineTo(-12.8, -1.5);
	ctx.lineTo(-12.7, 2.8);
	ctx.lineTo(-10, 3);
	ctx.bezierCurveTo(-11.3, -2.5, -3.8, -2.5, -4.7, 3);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
	ctx.strokeStyle = 'black';
// ctx.stroke();
	ctx.restore();
	ctx.beginPath();
	ctx.moveTo(-7.4, 1.8);
	ctx.arc(-7.4, 1.8, 1.7, 0, Math.PI * 2);
	ctx.moveTo(9.2, 1.8);
	ctx.arc(9.2, 1.8, 1.7, 0, Math.PI * 2);
	ctx.fillStyle = 'black';
	ctx.fill();
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


function toggleFullscreen() {
	let canvas = document.getElementById("canvas");
	if (!isFullscreen) {
  	if (canvas.requestFullscreen) {
    	canvas.requestFullscreen();
  	} else if (canvas.mozRequestFullScreen) { /* Firefox */
    	canvas.mozRequestFullScreen();
  	} else if (canvas.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
    	canvas.webkitRequestFullscreen();
  	} else if (canvas.msRequestFullscreen) { /* IE/Edge */
    	canvas.msRequestFullscreen();
  	}
  	isFullscreen = true;
	} else {
  	if (document.exitFullscreen) {
    	document.exitFullscreen();
  	} else if (document.mozCancelFullScreen) { /* Firefox */
    	document.mozCancelFullScreen();
  	} else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
    	document.webkitExitFullscreen();
  	} else if (document.msExitFullscreen) { /* IE/Edge */
  	  document.msExitFullscreen();
	  }
	  isFullscreen = false;
	}
	mouse.processed = true;
	mouse.button = NaN;
}
