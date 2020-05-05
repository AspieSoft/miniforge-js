#!/usr/bin/env node

const [,,...args] = process.argv;

const miniforge = require('./src/index.min');

function normalizeJson(str){return str.replace(/"?([\w_\- ]+)"?\s*?:\s*?"?(.*?)"?\s*?([,}\]])/gsi, (str, index, item, end) => '"'+index.replace(/"/gsi, '').trim()+'":"'+item.replace(/"/gsi, '').trim()+'"'+end).replace(/,\s*?([}\]])/gsi, '$1');}

if(args[0] === '-h'){

	console.log('\x1b[34m----------');

	console.log('\x1b[32mminiforge-js -h', '\x1b[34mShow this list', '\x1b[0m');
	console.log('\x1b[32mminiforge-js build file/path.js \x1b[35m(optional)\x1b[32m{Build options In JSON Format}', '\x1b[34mBuid a minified file', '\x1b[0m');

	console.log('\x1b[32mminiforge-js build file/path.js \x1b[33m--flags', '\x1b[34mInstead of a json object, you can set flags in any order', '\x1b[0m');
	console.log('\x1b[33m--opts={JSON Object}', '\x1b[34mSame as Adding Options To End', '\x1b[0m');
	console.log('\x1b[33m--output=path/to/output/file.js', '\x1b[34mSets the output file', '\x1b[0m');
	console.log('\x1b[33m--root=path/to/root/dir', '\x1b[34mSets the root directory', '\x1b[0m');
	console.log('\x1b[33m--minify={JSON Object}', '\x1b[34mMinify options for terser module', '\x1b[0m');
	console.log('\x1b[33m--min', '\x1b[34mSets outputNameMin option to true', '\x1b[0m');
	console.log('\x1b[33m--build', '\x1b[34mSets outputNameMin option to false', '\x1b[0m');
	console.log('\x1b[33m--compress', '\x1b[34mSets compress option to true', '\x1b[0m');
	console.log('\x1b[33m--compress=false', '\x1b[34mSets compress option to false', '\x1b[0m');
	console.log('\x1b[33m--encrypt', '\x1b[34mSets encrypt option to true', '\x1b[0m');
	console.log('\x1b[33m--encrypt=false', '\x1b[34mSets encrypt option to false', '\x1b[0m');
	console.log('\x1b[33m--standAlone', '\x1b[34mSets standAlone option to true', '\x1b[0m');
	console.log('\x1b[33m--standAlone=false', '\x1b[34mSets standAlone option to false', '\x1b[0m');

	console.log('\x1b[32mminiforge-js root dir/path', '\x1b[34mSet miniforge.rootDir()', '\x1b[0m');
	console.log('\x1b[32mminiforge-js run file/path.js \x1b[35m(optional)\x1b[32mtrue|false', '\x1b[34mRun a file with miniforge(file/path.js, true||false);', '\x1b[0m');

	console.log('\x1b[34m----------\x1b[0m');

}else if(args[0] === 'root'){
	if(args[1]){
		miniforge.rootDir(args[1]);
	}else{console.error('\x1b[31mError: path not specified\x1b[0m');}
}else if(args[0] === 'build'){
	if(args[1]){
		let opts = {};
		if(args[2] && args[2].startsWith('{') && args[2].endsWith('}')){
			try{opts = JSON.parse(normalizeJson(args[2]))}catch(e){opts = {};}
		}else if(args[2]){
			for(let i = 2; i < args.length; i++){
				if(args[i].startsWith('--opts=') || args[i].startsWith('--options=')){
					try{
						opts = JSON.parse(normalizeJson(args[i].replace(/(--options=|--opts=)/, '')));
					}catch(e){opts = {};}
				}else if(args[i].startsWith('--output=')){
					opts.output = args[i].replace(/(--output=)/, '');
				}else if(args[i].startsWith('--root=')){
					opts.root = args[i].replace(/(--root=)/, '');
				}else if(args[i].startsWith('--minify=')){
					opts.minify = JSON.parse(normalizeJson(args[i].replace(/(--minify=)/, '')));
				}else if(args[i] === '--min'){
					opts.outputNameMin = true;
				}else if(args[i] === '--build'){
					opts.outputNameMin = false;
				}else if(args[i] === '--compress' || args[i] === '--compress=true'){
					opts.compress = true;
				}else if(args[i] === '--compress=false'){
					opts.compress = false;
				}else if(args[i] === '--encrypt' || args[i] === '--encrypt=true'){
					opts.encrypt = true;
				}else if(args[i] === '--encrypt=false'){
					opts.encrypt = false;
				}else if(args[i] === '--standAlone' || args[i] === '--standAlone=true'){
					opts.encrypt = true;
				}else if(args[i] === '--standAlone=false'){
					opts.encrypt = false;
				}
			}
		}if(!opts.root){opts.root = process.cwd();}
		miniforge.build(args[1], opts);
	}else{console.error('\x1b[31mError: path not specified\x1b[0m');}
}else if(args[0] === 'run'){
	if(args[1]){
		let optional = false;
		if(args[2] && args[1] === 'true'){optional = true;}
		miniforge.runFile(args[1], optional);
	}else{console.error('\x1b[31mError: path not specified\x1b[0m');}
}else{console.error('\x1b[31mError: command not specified\x1b[0m');}
