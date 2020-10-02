async function runTest(miniforge){

	const path = require('path');

	await miniforge.build(path.join(__dirname, 'test1'));

	const test = require('./test1.build');
	test();

}

module.exports = runTest;
