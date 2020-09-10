function runTest(miniforge){

	const path = require('path');

	miniforge.build(path.join(__dirname, 'test1'), {compress: true});

	const test = require('./test1.build');
	test();

}

module.exports = runTest;
