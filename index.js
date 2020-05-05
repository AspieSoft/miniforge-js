// In God We Trust

const miniforge = require('./src/index.min');

module.exports = (function(){
	let exports = miniforge;
	exports.build = miniforge.build;
	exports.runFile = miniforge.runFile;
	exports.rootDir = miniforge.rootDir;
	return exports;
})();
