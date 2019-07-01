const fs = require('fs');
const readline = require('readline');

module.exports.createRaceView = async function createRaceView(dataPath, outPath) {
	const templateStream = fs.createReadStream('race_view/race_view_template.html');
	const outStream = fs.createWriteStream(outPath);

	const rl = readline.createInterface({
		input: templateStream,
		crlfDelay: Infinity
	});

	rl.on('line', (line) => {
		if (line.includes('<!--insert data-->')) {
			insertScript(dataPath, outStream);
		} else if (line.includes('<!--insert gui-->')) {
			insertScript('race_view/gui.js', outStream);
		} else if (line.includes('<!--insert script-->')) {
			insertScript('race_view/race_view.js', outStream);
		} else {
			outStream.write(line + '\n');
		}
	});
	rl.on('close', () => {
		outStream.close();
		console.log('Done creating ' + outPath);
	})
}

function insertScript(path, outStream) {
	outStream.write('\t<script type="text/JavaScript">\n');
	const data  = fs.readFileSync(path);
	outStream.write(data);
	outStream.write('\n\t</script>\n');
}

module.exports.test = function() {
	this.createRaceView('race_data/20190416_Watkins_Glen_GP.js', 'html/20190416_Watkins_Glen_GP_test.html');
};

module.exports.createAll = function() {
	this.createRaceView('race_data/20190409_Donington_Park_GP.js', 'html/20190409_Donington_Park_GP.html');
	this.createRaceView('race_data/20190416_Watkins_Glen_GP.js', 'html/20190416_Watkins_Glen_GP.html');
	this.createRaceView('race_data/20190423_Algarve_.js', 'html/20190423_Algarve_.html');
	this.createRaceView('race_data/20190507_Brands_Hatch_GP.js', 'html/20190507_Brands_Hatch_GP.html');
	this.createRaceView('race_data/20190514_Red_Bull_Ring_GP.js', 'html/20190514_Red_Bull_Ring_GP.html');
	this.createRaceView('race_data/20190521_Dubai_Autodrome_GP.js', 'html/20190521_Dubai_Autodrome_GP.html');
}
