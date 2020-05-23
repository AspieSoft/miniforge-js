const test3 = require('./test3');

function test(){
	console.log('test 2 ran');
	test3();
}

console.log('test 2 loaded');

module.exports = test;
