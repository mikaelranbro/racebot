module.exports.runTests = function runTests(bot) {

};

module.exports.runOffline = function runOffline(bot) {
	// bot.voice.speak('Go', 3, 4);
	// bot.voice.speak('3', 3, 1);
	// bot.voice.speak('2', 3, 2);
	// bot.voice.speak('1', 3, 3);
	// bot.voice.speak('before');
	// bot.race.prepare();
	bot.race.start();
	//testStartFinish(bot);
	// bot.voice.play('sfx/start_2_1.wav');
	// testSpeech(bot);
	// testStartAbort(bot);
};

async function testSpeech(bot) {
	var voice = bot.voice;
	voice.speak('This is a priority message', voice.Priority.CRITICAL);
	bot.voice.play('sfx/start_2_1.wav', voice.Priority.CRITICAL);
	await sleep(500);
	voice.speak('I am a sad hippo.', voice.Priority.NONSENSE);
	await sleep(200);
	voice.speak('I hope you will eventually hear this.', voice.Priority.EVENTUAL);
	await sleep(200);
	bot.voice.play('sfx/honk.wav', voice.Priority.EVENTUAL);
}

async function testSounds(bot) {
	var voice = bot.voice;
	bot.voice.play('sfx/start_2_1.wav', voice.Priority.CRITICAL);
	await sleep(500);
	bot.voice.play('sfx/honk.wav', voice.Priority.EVENTUAL);
}

async function testStartAbort(bot) {
	console.log('0: ' + bot.race.getState());
	bot.race.start();
	await sleep(200);
	console.log('1: ' + bot.race.getState());
	bot.race.abort();
	await sleep(200);
	console.log('2: ' + bot.race.getState());
	bot.race.abort();
	await sleep(200);
	console.log('3: ' + bot.race.getState());
	bot.race.start();
	await sleep(200);
	console.log('4: ' + bot.race.getState());
	bot.race.start();
	await sleep(200);
	console.log('5: ' + bot.race.getState());
	bot.race.abort();
	await sleep(200);
	console.log('6: ' + bot.race.getState());
	await sleep(5000);
	console.log('7: ' + bot.race.getState());
}

async function testStartFinish(bot) {
	console.log('***** Starting *****');
	bot.race.start();
	await sleep(35000);
	console.log('***** Aborting *****');
	bot.race.abort();
}

function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}