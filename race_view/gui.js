let mouse = {
	"x": NaN,
	"y": NaN,
	"button": NaN
}

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
	ctx.shadowColor = 'rgba(80, 100, 20, 0.5)';
	ctx.shadowOffsetY = - 4;
	ctx.stroke();
	ctx.beginPath();
	let gradient2 = ctx.createLinearGradient(x0 + nbrModes * 128, 0, ctx.width, 0);
	gradient2.addColorStop(0, 'rgba(100, 100, 100,1)');
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

let handledClick = false;
function drawPlaybackButtons(ctx) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.font = '20px "Courier New"';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	let text = '';
	let x0 = Math.min(ctx.width - ctx.rightMargin, this.innerWidth - 32 - ctx.rightMargin);
	if (inBounds({"x": x0, "y": menuHeight + 32, "width": ctx.rightMargin, "height": 24}, mouse)){
		if (mouse.button === 0 && !handledClick) {
			backgroundVisible = !backgroundVisible;
			handledClick = true;
		} else if (mouse.button !== 0) {
			handledClick = false;
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
	ctx.restore();
}

function inBounds(bounds, point) {
	if (point.x >= bounds.x && point.x < bounds.x + bounds.width &&
		  point.y >= bounds.y && point.y < bounds.y + bounds.height) {
		return true;
	}
	return false;
}