const test2 = require('./test2');

function test(){
	console.log('test 1 ran');
	test2();
}

console.log('test 1 loaded');

module.exports = test;
