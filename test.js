
let testResults = {"Sadjev":{"lapDistance":5,"position":1,"fastestLap":90.7246,"lastLap":92.9316,"speed":62.0687,"lapsCompleted":30,"raceState":3,"distance":124879,"timestamp":2734497,"worldPos":[179.521,-0.791404,-347.539],"orientation":[-0.000466028,1.31067,0.0254881]},"Borbo":{"lapDistance":24,"position":2,"fastestLap":90.6401,"lastLap":91.6338,"speed":60.3062,"lapsCompleted":30,"raceState":3,"distance":124898,"timestamp":2753491,"worldPos":[162.128,-0.68195,-353.856],"orientation":[0.00505343,1.30324,0.0267977]},"Håkan":{"lapDistance":7,"position":7,"fastestLap":92.5601,"lastLap":94.8057,"speed":60.838,"lapsCompleted":30,"raceState":3,"distance":124881,"timestamp":2816241,"worldPos":[178.294,-0.802255,-348.74],"orientation":[0.00183187,1.31734,0.0247139]},"Mikael":{"lapDistance":13,"position":3,"fastestLap":91.0952,"lastLap":92.541,"speed":60.1704,"lapsCompleted":30,"raceState":3,"distance":124887,"timestamp":2764642,"worldPos":[172.009,-0.757825,-350.228],"orientation":[0.00349787,1.30763,0.0232294]},"Rymdkatten":{"lapDistance":7,"position":2,"fastestLap":91.1567,"lastLap":92.7412,"speed":62.3451,"lapsCompleted":30,"raceState":3,"distance":124881,"timestamp":2743940,"worldPos":[177.764,-0.791452,-348.727],"orientation":[-0.00175492,1.31138,0.024932]},"The Real Deal":{"lapDistance":22,"position":6,"fastestLap":91.5693,"lastLap":92.0596,"speed":58.0802,"lapsCompleted":30,"raceState":3,"distance":124896,"timestamp":2799938,"worldPos":[163.534,-0.669015,-353.728],"orientation":[0.00178815,1.30264,0.0266148]},"veloxieer":{"lapDistance":16,"position":5,"fastestLap":91.957,"lastLap":94.124,"speed":60.7997,"lapsCompleted":30,"raceState":3,"distance":124890,"timestamp":2797832,"worldPos":[169.489,-0.716778,-351.959],"orientation":[0.00454542,1.30019,0.0254169]},"robert_lindh":{"lapDistance":2,"position":8,"fastestLap":97.0806,"lastLap":97.8467,"speed":60.0871,"lapsCompleted":28,"raceState":3,"distance":116264,"timestamp":2776713,"worldPos":[182.832,-0.807698,-347.389],"orientation":[0.00231073,1.30615,0.0247587]}};
let testLastResults = {"Sadjev":{"lapDistance":4280,"position":1,"fastestLap":90.7246,"lastLap":90.7246,"speed":61.123,"lapsCompleted":29,"raceState":2,"distance":124848,"timestamp":2733996,"worldPos":[209.665,-0.852167,-339.722],"orientation":[-0.00333645,1.31616,0.0236864]},"Borbo":{"lapDistance":4299,"position":3,"fastestLap":90.6401,"lastLap":93.2627,"speed":60.7361,"lapsCompleted":29,"raceState":2,"distance":124867,"timestamp":2752987,"worldPos":[191.287,-0.825402,-346.049],"orientation":[0.000434031,1.30981,0.0244225]},"Håkan":{"lapDistance":4282,"position":7,"fastestLap":92.5601,"lastLap":95.0166,"speed":59.9824,"lapsCompleted":29,"raceState":2,"distance":124850,"timestamp":2815737,"worldPos":[207.793,-0.868556,-341.052],"orientation":[0.000147171,1.31378,0.023364]},"Mikael":{"lapDistance":4289,"position":4,"fastestLap":91.0952,"lastLap":92.4932,"speed":60.2169,"lapsCompleted":29,"raceState":2,"distance":124857,"timestamp":2764138,"worldPos":[201.006,-0.858792,-342.061],"orientation":[0.00220328,1.29213,0.0242638]},"Rymdkatten":{"lapDistance":4282,"position":2,"fastestLap":91.1567,"lastLap":92,"speed":61.5279,"lapsCompleted":29,"raceState":2,"distance":124850,"timestamp":2743435,"worldPos":[208.025,-0.864463,-340.666],"orientation":[-0.00426988,1.30728,0.0232133]},"The Real Deal":{"lapDistance":4298,"position":6,"fastestLap":91.5693,"lastLap":91.6201,"speed":60.3261,"lapsCompleted":29,"raceState":2,"distance":124866,"timestamp":2799437,"worldPos":[192.254,-0.810288,-345.817],"orientation":[0.000836214,1.29972,0.0240589]},"veloxieer":{"lapDistance":4291,"position":5,"fastestLap":91.957,"lastLap":93.4229,"speed":60.1948,"lapsCompleted":29,"raceState":2,"distance":124859,"timestamp":2797328,"worldPos":[198.954,-0.82829,-343.772],"orientation":[0.000572825,1.29801,0.0231814]},"robert_lindh":{"lapDistance":4278,"position":8,"fastestLap":97.0806,"lastLap":104.235,"speed":58.9203,"lapsCompleted":27,"raceState":2,"distance":116234,"timestamp":2776208,"worldPos":[211.916,-0.864729,-339.621],"orientation":[-0.00179438,1.31032,0.0235624]}};
let testEventInformation = {"mLapsInEvent":30,"mTrackLocation":"Red_Bull_Ring","mTrackVariation":"GP","mTrackLength":4306,"mTranslatedTrackLocation":"Red Bull Ring","mTranslatedTrackVariation":"Grand Prix"};
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
module.exports.runTests = function runTests(bot) {
	console.log('TEST!');
	// console.log(bot.season.getNextEvent());
	//console.log(bot.season.getDriver('Mikael'));
	// console.log(bot.season.getDriver('Nisse'));
	testStartAbort(bot);

	// bot.season.updateStandings(testResults, testEventInformation);
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
	console.log('***** Finishing *****');
	bot.race.finish();
}

async function testStart(bot) {
	console.log('***** Starting *****');
	bot.race.start();
	console.log('***** Done ******');
}

function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}