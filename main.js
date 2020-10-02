// In God We Trust

const fs = require('fs');
const path = require('path');
const {minify} = require('terser');
const LZUTF8 = require('lzutf8');
const zlib = require('zlib');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const requireFromString = require('require-from-string');

let rootDirname = undefined;

const minifyOptions = {
	ecma: 2020,
	keep_classnames: true,
	parse: {shebang: true},
	compress: {
		ecma: 2020,
		keep_infinity: true,
		passes: 5,
		top_retain: ['module', 'global', 'return', 'process'],
		typeofs: false,
	},
	mangle: {
		keep_classnames: true,
		reserved: ['module', 'global', 'return', 'process'],
	},
};

async function minifyFile(file, options = {}){
	let opts = {...minifyOptions};
	Object.assign(opts, options);
	let result = await minify(file, opts);
	if(result && !result.error && result.code){
		return result.code;
	}
	return file;
}

function zlibCompress(str){
	if(!str){return undefined;}
	try{
		let input = Buffer.from(str);
		let compressed = zlib.deflateSync(input);
		compressed = compressed.toString('base64');
		if(!compressed || compressed.trim() === ''){return null;}
		return compressed;
	}catch(e){return null;}
}

function zlibDecompress(str){
	if(!str){return undefined;}
	try{
		compressed = Buffer.from(str, 'base64');
		let output = zlib.inflateSync(compressed);
		output = output.toString();
		if(!output || output.trim() === ''){return null;}
		return output;
	}catch(e){return null;}
}

function lzutf8Compress(str, buffer){
	if(!str){return undefined;}
	if(typeof str === 'object' || Array.isArray(str)){try{str = JSON.stringify(str);}catch(e){return null;}}
	try{str = LZUTF8.compress(str, {outputEncoding: 'StorageBinaryString'});}catch(e){return null;}
	try{str = LZUTF8.compress(str, {outputEncoding: 'Base64'});}catch(e){return null;}
	if(buffer){try{str = LZUTF8.compress(str, {outputEncoding: 'Buffer'});}catch(e){return null;}}
	if(!str || str.trim() === ''){return null;}
	return str;
}

function lzutf8Decompress(str){
	if(!str){return undefined;}
	if(typeof str === 'object'){try{str = LZUTF8.decompress(str, {inputEncoding: 'Buffer'});}catch(e){return null;}}
	try{str = LZUTF8.decompress(str, {inputEncoding: 'Base64'});}catch(e){return null;}
	try{str = LZUTF8.decompress(str, {inputEncoding: 'StorageBinaryString'});}catch(e){return null;}
	try{str = JSON.parse(str);}catch(e){}
	if(!str || str.trim() === ''){return null;}
	return str;
}

function strEncrypt(str, keys){
	let key = crypto.createHmac('sha256', keys.secret).update(keys.key).digest('hex');
	let result = CryptoJS.AES.encrypt(str, key).toString();
	key = crypto.createHmac('sha256', keys.secret).update(key).digest('hex');
	result = CryptoJS.Rabbit.encrypt(result, key).toString();
	return result;
}

function strDecrypt(str, keys){
	let key = crypto.createHmac('sha256', keys.secret).update(keys.key).digest('hex');
	let key2 = crypto.createHmac('sha256', keys.secret).update(key).digest('hex');
	let result = CryptoJS.Rabbit.decrypt(str, key2).toString(CryptoJS.enc.Utf8);
	result = CryptoJS.AES.decrypt(result, key).toString(CryptoJS.enc.Utf8);
	return result;
}

function genKeyPair(){
	let keys = crypto.generateKeyPairSync('rsa', {
		modulusLength: 4096,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: 'aes-256-cbc',
			passphrase: 'top secret'
		}
	});
	return [keys.publicKey, keys.privateKey].join('\n');
}

function getKeyPair(key){
	let publicKey = key.substring(key.indexOf('-----BEGIN PUBLIC KEY-----')+26, key.lastIndexOf('-----END PUBLIC KEY-----'));
	let privateKey = key.substring(key.indexOf('-----BEGIN ENCRYPTED PRIVATE KEY-----')+37, key.lastIndexOf('-----END ENCRYPTED PRIVATE KEY-----'));
	return {public: publicKey, private: privateKey};
}


function replaceAsync(str, re, callback){
	// http://es5.github.io/#x15.5.4.11
	str = String(str);
	var parts = [],
			i = 0;
	if (Object.prototype.toString.call(re) == "[object RegExp]") {
			if (re.global)
					re.lastIndex = i;
			var m;
			while (m = re.exec(str)) {
					var args = m.concat([m.index, m.input]);
					parts.push(str.slice(i, m.index), callback.apply(null, args));
					i = re.lastIndex;
					if (!re.global)
							break; // for non-global regexes only take the first match
					if (m[0].length == 0)
							re.lastIndex++;
			}
	} else {
			re = String(re);
			i = str.indexOf(re);
			parts.push(str.slice(0, i), callback.apply(null, [re, i, str]));
			i += re.length;
	}
	parts.push(str.slice(i));
	return Promise.all(parts).then(function(strings) {
			return strings.join("");
	});
}


const defaultBuildOptions = {
	compress: true,
	standAlone: true,
	avoidDependencies: true,
};

async function build(file, options = {}){
	if(!options.root || typeof options.root !== 'string'){options.root = undefined;}
	if(options.root){
		options.root = path.resolve(options.root.toString()) || undefined;
	}else if(rootDirname && typeof rootDirname === 'string'){
		options.root = path.resolve(rootDirname.toString());
	}else if(file && typeof file === 'string'){
		let filePath = file.toString();
		if(!filePath.startsWith(module.parent.filename) && !filePath.startsWith(__dirname) && !filePath.startsWith('C:/') && !filePath.includes(':/')){
			filePath = path.join(module.parent.filename.toString(), '..', filePath);
		}options.root = path.join(filePath, '..');
	}
	if(!options.root){console.error('rootDir not defined'); return;}
	file = file.toString();
	if(!file.startsWith(options.root)){file = path.join(options.root, file);}
	else{file = path.resolve(file);}
	if(!file.startsWith(options.root)){console.error(file, 'is outside the rootDir'); return;}
	if(!file.endsWith('.js')){file += '.js';}
	if(!fs.existsSync(file)){console.error(file, 'does not exist'); return;}
	let fileData = fs.readFileSync(file).toString();

	let opts = {...defaultBuildOptions};
	Object.assign(opts, options);

	let firstStr = '';
	fileData = fileData.replace(/^((?:#!|\/\/).*)\r?\n?/gm, function(str, comment){
		firstStr += comment+'\r\n';
		return '';
	});
	fileData = fileData.replace(/^(\/\*(?:.|\r?\n)*?\*\/)\r?\n?/gm, function(str, comment){
		firstStr += comment+'\r\n';
		return '';
	});

	fileData = (await getRequiredFiles(fileData, opts, path.join(file, '..'), true)).result;
	fileData = await replaceAsync(fileData, /\/\*@min\*\/`(.*?)`/gs, async function(str, code){
		return '`'+(await minifyFile(code, opts.minify))+'`';
	});
	fileData = await minifyFile(fileData, opts.minify);

	if(opts.compress === 'lzutf8'){ // lzutf8 compress
		let compressedFile = lzutf8Compress(fileData);
		if(compressedFile && opts.standAlone){
			fileData = compressedFile;
		}else if(compressedFile){
			fileData = '//@compressed:'+compressedFile;
		}else{
			opts.compress = false;
		}
	}else if(opts.compress){ // zlib compress
		let compressedFile = zlibCompress(fileData);
		if(!compressedFile){ // fallback to lzutf8 compress
			opts.compress = 'lzutf8';
			compressedFile = lzutf8Compress(fileData);
		}
		if(compressedFile && opts.standAlone){
			fileData = compressedFile;
		}else if(compressedFile){
			if(opts.compress === 'lzutf8'){
				fileData = '//@compressed:'+compressedFile;
			}else{
				fileData = '//@zlib:'+compressedFile;
			}
		}else{
			opts.compress = false;
		}
	}

	let encryptKeys = false;
	if(opts.encrypt){
		encryptKeys = genKeyPair();
		let keys = getKeyPair(encryptKeys);
		let encryptedFile = strEncrypt(fileData, {key: keys.public, secret: keys.private});
		if(encryptedFile && opts.standAlone){fileData = encryptedFile;}
		else if(encryptedFile){fileData = '//@encrypted:'+encryptedFile;}
		else{encryptKeys = false;}
	}

	if(opts.standAlone && (opts.encrypt || opts.compress)){
		const fileDecrypt = [];
		const fileDecompress = [];

		if(opts.encrypt){
			console.log('Added External Dependency: crypto-js');
			fileDecrypt.push(`
				const crypto = requireModule('crypto', 'decrypt');
				const CryptoJS = requireModule('crypto-js', 'decrypt');
				if(!crypto || !CryptoJS){module.exports = undefined; return;}
				`, `
				function strDecrypt(str, keys){
					let key = crypto.createHmac('sha256', keys.secret).update(keys.key).digest('hex');
					let key2 = crypto.createHmac('sha256', keys.secret).update(key).digest('hex');
					let result = CryptoJS.Rabbit.decrypt(str, key2).toString(CryptoJS.enc.Utf8);
					result = CryptoJS.AES.decrypt(result, key).toString(CryptoJS.enc.Utf8);
					return result;
				}
				function getKeyPair(key){
					let publicKey = key.substring(key.indexOf('-----BEGIN PUBLIC KEY-----')+26, key.lastIndexOf('-----END PUBLIC KEY-----'));
					let privateKey = key.substring(key.indexOf('-----BEGIN ENCRYPTED PRIVATE KEY-----')+37, key.lastIndexOf('-----END ENCRYPTED PRIVATE KEY-----'));
					return {public: publicKey, private: privateKey};
				}
				`, `
				let keyFile = file.replace(/\\.js$/, '.keys');
				if(!fs.existsSync(keyFile)){console.error(keyFile, 'does not exist');return undefined;}
				let keys = fs.readFileSync(keyFile).toString();
				keys = getKeyPair(keys);
				fileData = strDecrypt(fileData, {key: keys.public, secret: keys.private});
				if(!fileData){console.error(file, 'failed to decrypt');return undefined;}
			`);
		}

		if(opts.compress === 'lzutf8'){
			console.log('Added External Dependency: lzutf8');
			fileDecompress.push(`
				const LZUTF8 = requireModule('lzutf8', 'decompress');
				if(!LZUTF8){module.exports = undefined; return;}
				`, `
				function lzutf8Decompress(str){
					if(!str){return undefined;}
					if(typeof str === 'object'){try{str = LZUTF8.decompress(str, {inputEncoding: 'Buffer'});}catch(e){return null;}}
					try{str = LZUTF8.decompress(str, {inputEncoding: 'Base64'});}catch(e){return null;}
					try{str = LZUTF8.decompress(str, {inputEncoding: 'StorageBinaryString'});}catch(e){return null;}
					try{str = JSON.parse(str);}catch(e){}
					if(!str || str.trim() === ''){return null;}
					return str;
				}
				`, `
				fileData = lzutf8Decompress(fileData);
				if(!fileData){console.error(file, 'failed to decompress');return undefined;}
			`);
		}else if(opts.compress){
			fileDecompress.push(`
				const zlib = requireModule('zlib', 'decompress');
				if(!zlib){module.exports = undefined; return;}
				`, `
				function zlibDecompress(str){
					if(!str){return undefined;}
					try{
						compressed = Buffer.from(str, 'base64');
						let output = zlib.inflateSync(compressed);
						output = output.toString();
						if(!output || output.trim() === ''){return null;}
						return output;
					}catch(e){return null;}
				}
				`, `
				fileData = zlibDecompress(fileData);
				if(!fileData){console.error(file, 'failed to decompress');return undefined;}
			`);
		}

		if(opts.avoidDependencies){
			fileData = `
			/*! Compressed with: @aspiesoft/miniforge-js v1.0.0 | (c) aspiesoftweb@gmail.com */
				;(function(){
					const fs = requireOr(['fs-extra', 'fs']);
					${fileDecrypt[0]}
					${fileDecompress[0]}

					function requireOr(files){let result = undefined;for(let i = 0; i < files.length; i++){try{result = require(files[i]);break;}catch(e){}}return result;}
					function requireModule(file, action){try{return require(file);}catch(e){console.error(__dirname, 'requires the', file, 'module to be installed so it can', action, 'itself');}}
					let fileData = '${fileData.replace(/(?!\\)'/g, '\\\'')}';
					let file = __filename;
					${fileDecrypt[1]}
					${fileDecompress[1]}
					${fileDecrypt[2]}
					${fileDecompress[2]}

					/*! Runs with: require-from-string v2.0.2 | (c) Vsevolod Strukchinsky <floatdrop@gmail.com> (github.com/floatdrop) */
					const requireFromString = (function(){
						const Module = require('module');
						const path = require('path');
						return function(code, filename, opts){
							if(typeof filename === 'object'){
								opts = filename;
								filename = undefined;
							}
							opts = opts || {};
							filename = filename || '';
							opts.appendPaths = opts.appendPaths || [];
							opts.prependPaths = opts.prependPaths || [];
							if (typeof code !== 'string') {
								throw new Error('code must be a string, not ' + typeof code);
							}
							var paths = Module._nodeModulePaths(path.dirname(filename));
							var parent = module.parent;
							var m = new Module(filename, parent);
							m.filename = filename;
							m.paths = [].concat(opts.prependPaths).concat(paths).concat(opts.appendPaths);
							m._compile(code, filename);
							var exports = m.exports;
							parent && parent.children && parent.children.splice(parent.children.indexOf(m), 1);
							return exports;
						};
					})();
					module.exports = requireFromString(fileData, file);
				})();
			`;
		}else{
			console.log('Added External Dependency: require-from-string');
			fileData = `
				;(function(){
					const fs = requireOr(['fs-extra', 'fs']);
					${fileDecrypt[0]}
					${fileDecompress[0]}
					const requireFromString = requireModule('require-from-string', 'run');
					if(!requireFromString){module.exports = undefined; return;}
					function requireOr(files){let result = undefined;for(let i = 0; i < files.length; i++){try{result = require(files[i]);break;}catch(e){}}return result;}
					function requireModule(file, action){try{return require(file);}catch(e){console.error(__dirname, 'requires the', file, 'module to be installed so it can', action, 'itself');}}
					let fileData = '${fileData.replace(/(?!\\)'/g, '\\\'')}';
					let file = __filename;
					${fileDecrypt[1]}
					${fileDecompress[1]}
					${fileDecrypt[2]}
					${fileDecompress[2]}
					module.exports = requireFromString(fileData, file);
				})();
			`;
		}

		fileData = await minifyFile(fileData, opts.minify);
	}

	let fileOutput;

	if(opts.output){
		fileOutput = opts.output.toString();
		if(!fileOutput.startsWith(options.root)){fileOutput = path.join(options.root, fileOutput);}
		else{fileOutput = path.resolve(fileOutput);}
		if(!fileOutput.startsWith(options.root)){console.error(fileOutput, 'is outside the rootDir'); return;}
		if(!fileOutput.endsWith('.js')){fileOutput += '.js';}
	}else{
		let outType = 'build';
		if(opts.outputNameMin){outType = 'min';}
		fileOutput = file.replace(/\.js$/, '.'+outType+'.js');
	}

	if(encryptKeys){
		let keyFile = fileOutput.replace(/\.js$/, '.keys');
		fs.writeFileSync(keyFile, encryptKeys);
	}
	
	if(firstStr !== ''){
		fileData = firstStr+fileData;
	}

	if(fileData.includes('\n')){
		fileData = fileData.trim()+'\r\n';
	}

	fs.writeFileSync(fileOutput, fileData);
}


function runFile(file, optional){
	if(!rootDirname){if(!optional){throw new Error('rootDir not defined');}return undefined;}
	file = file.toString();
	if(!file.startsWith(rootDirname)){file = path.join(rootDirname, file);}
	else{file = path.resolve(file);}
	if(!file.startsWith(rootDirname)){if(!optional){throw new Error(file+' is outside the rootDir');}return undefined;}
	if(!file.endsWith('.js')){file += '.js';}
	if(!fs.existsSync(file)){if(!optional){throw new Error(file+' does not exist');}return undefined;}
	let fileData = fs.readFileSync(file).toString();

	if(fileData.startsWith('//@encrypted:')){
		let keyFile = file.replace(/\.js$/, '.keys');
		if(!fs.existsSync(keyFile)){if(!optional){throw new Error(keyFile+' does not exist');}return undefined;}
		let keys = fs.readFileSync(keyFile).toString();
		keys = getKeyPair(keys);
		fileData = strDecrypt(fileData.replace('//@encrypted:', ''), {key: keys.public, secret: keys.private});
		if(!fileData){if(!optional){throw new Error(file+' failed to decrypt');}return undefined;}
	}

	if(fileData.startsWith('//@zlib:')){
		fileData = zlibDecompress(fileData.replace('//@zlib:', ''));
		if(!fileData){if(!optional){throw new Error(file+' failed to decompress');}return undefined;}
	}else if(fileData.startsWith('//@compressed:')){
		fileData = lzutf8Decompress(fileData.replace('//@compressed:', ''));
		if(!fileData){if(!optional){throw new Error(file+' failed to decompress');}return undefined;}
	}

	return requireFromString(fileData, file);
}


async function getRequiredFiles(file, options = {}, dirname, isRoot = false, functionFiles = {}){
	if(!options.root || typeof options.root !== 'string'){options.root = rootDirname;}
	if(typeof functionFiles !== 'object'){functionFiles = {};}

	file = await replaceAsync(file, /(?:([\w_$.\[\]]+)[\s\n]*?=[\s\n]*?|)require\([\s\n]*?('\.{1,2}[/\\](?:[\w_\-$./\\?!%*:|<>@#^&()\[\]`~\s"]|\\')+'|"\.{1,2}[/\\](?:[\w_\-$./\\?!%*:|<>@#^&()\[\]`~\s']|\\")+")[\s\n]*?\);/gs, async function(str, varName, file){
		if(!file){return str;}
		file = file.toString().substring(1, file.length-1);

		let fallbackResult = str;
		if(dirname){
			let relDirname = dirname.replace(options.root, '');
			if(relDirname.startsWith('/') || relDirname.startsWith('\\')){relDirname = relDirname.replace(/^[/\\]/, '');}
			if(relDirname.endsWith('/') || relDirname.endsWith('\\')){relDirname = relDirname.replace(/[/\\]$/, '');}
			fallbackResult = fallbackResult.replace(/(\.{1,2}[/\\])/, '$1'+relDirname+'/');
		}

		if(!file.startsWith(options.root)){file = path.join(dirname || options.root, file);}
		else{file = path.resolve(file);}

		if(!file.startsWith(options.root)){return fallbackResult;}
		if(!file.endsWith('.js')){file += '.js';}
		if(!fs.existsSync(file)){return fallbackResult;}

		if(functionFiles[file]){
			if(varName && !functionFiles[file].varName){
				const newVarNameToken = crypto.randomBytes(8).toString('hex').replace(/[^\w_]/g, '');
				functionFiles[file].varName = `$_${newVarNameToken}_required_module`;
			}
			if(varName){return varName+'='+functionFiles[file].varName;}
			return '';
		}

		let fileData = undefined;
		try{
			fileData = fs.readFileSync(file).toString();
		}catch(e){return fallbackResult;}
		if(!fileData || fileData === ''){return fallbackResult;}

		fileData = await getRequiredFiles(fileData, options, path.join(file, '..'), false, functionFiles);

		Object.apply(functionFiles, fileData.functionFiles);
		fileData = fileData.result;

		const exportsToken = crypto.randomBytes(8).toString('hex').replace(/[^\w_]/g, '');

		fileData = fileData.replace(/module[\s\n]*?\.[\s\n]*?exports[\s\n]*?([\w_$.\s\n]*)=/gs, '$_'+exportsToken+'_module_exports$1=');
		fileData = await fileData.replace(/\/\*@min\*\/`(.*?)`/gs, async function(str, code){return await minifyFile(code, options.minify);});
		fileData = await minifyFile(fileData, options.minify);

		let result = `(function(){let $_${exportsToken}_module_exports=undefined;${fileData}return $_${exportsToken}_module_exports;})();`;
		let newVarName = undefined;
		if(varName){
			const newVarNameToken = crypto.randomBytes(8).toString('hex').replace(/[^\w_]/g, '');
			newVarName = `$_${newVarNameToken}_required_module`;
		}

		functionFiles[file] = {varName: newVarName, result};

		if(varName){return varName+'='+newVarName;}
		return '';
	});

	if(isRoot){
		const functionFileNames = Object.keys(functionFiles);
		let resultFunctions = [];
		for(let i = 0; i < functionFileNames.length; i++){
			let func = functionFiles[functionFileNames[i]];
			if(func.varName){resultFunctions.push('const '+func.varName+'='+func.result);}
			else{resultFunctions.push(';'+func.result);}
		}
		file = resultFunctions.join('\n')+file;
	}

	return {result: file, functionFiles};
}


module.exports = (function(){
	let exports = runFile;
	exports.build = build;
	exports.runFile = runFile;
	exports.rootDir = function(rootDir){if(rootDir){rootDirname = path.resolve(rootDir.toString()) || undefined;}};
	return exports;
})();
