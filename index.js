// In God We Trust

const fs = require('fs');
const path = require('path');
const {minify} = require('terser');
const LZUTF8 = require('lzutf8');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');

const requireFromString = require('require-from-string');

let rootDirname = undefined;

const minifyOptions = {ecma: 2020, parse: {ecma: 2020}, compress: {ecma: 2020, keep_infinity: true, module: true, passes: 5, top_retain: ['module', 'global', 'return', 'process'], typeofs: false}, mangle: {keep_classnames: true, module: true, reserved: ['module', 'global', 'return', 'process']}, module: true, keep_classnames: true};
function minifyFile(file, options = {}){
    let opts = {...minifyOptions};
    Object.assign(opts, options);
    let result = minify(file, opts);
    if(result && !result.error && result.code){
        return result.code;
    }return file;
}

function strCompress(str, buffer){
    if(!str){return undefined;}
    if(typeof str === 'object' || Array.isArray(str)){try{str = JSON.stringify(str);}catch(e){return null;}}
    try{str = LZUTF8.compress(str, {outputEncoding: 'StorageBinaryString'});}catch(e){return null;}
    try{str = LZUTF8.compress(str, {outputEncoding: 'Base64'});}catch(e){return null;}
    if(buffer){try{str = LZUTF8.compress(str, {outputEncoding: 'Buffer'});}catch(e){return null;}}
    return str;
}

function strDecompress(str){
    if(!str){return undefined;}
    if(typeof str === 'object'){try{str = LZUTF8.decompress(str, {inputEncoding: 'Buffer'});}catch(e){return null;}}
    try{str = LZUTF8.decompress(str, {inputEncoding: 'Base64'});}catch(e){return null;}
    try{str = LZUTF8.decompress(str, {inputEncoding: 'StorageBinaryString'});}catch(e){return null;}
    try{str = JSON.parse(str);}catch(e){}
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


const defaultBuildOptions = {compress: true, standAlone: true};
function build(file, options = {}){
    if(!rootDirname){console.error('rootDir not defined'); return;}
    file = file.toString();
    if(!file.startsWith(rootDirname)){file = path.join(rootDirname, file);}
    else{file = path.resolve(file);}
    if(!file.startsWith(rootDirname)){console.error(file, 'is outside the rootDir'); return;}
    if(!file.endsWith('.js')){file += '.js';}
    if(!fs.existsSync(file)){console.error(file, 'does not exist'); return;}
    let fileData = fs.readFileSync(file).toString();

    let opts = {...defaultBuildOptions};
    Object.assign(opts, options);

    fileData = getRequiredFiles(fileData, opts);
    fileData = fileData.replace(/\/\*@min\*\/`(.*?)`/gs, function(str, code){return '`'+minifyFile(code, opts.minify)+'`';});
    fileData = minifyFile(fileData, opts.minify);

    if(opts.compress){
        let compressedFile = strCompress(fileData);
        if(compressedFile && opts.standAlone){fileData = compressedFile;}
        else if(compressedFile){fileData = '//@compressed:'+compressedFile;}
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
        if(opts.compress){
            fileDecompress.push(`
            const LZUTF8 = requireModule('lzutf8', 'decompress');
            if(!LZUTF8){module.exports = undefined; return;}
            `, `
            function strDecompress(str){
                if(!str){return undefined;}
                if(typeof str === 'object'){try{str = LZUTF8.decompress(str, {inputEncoding: 'Buffer'});}catch(e){return null;}}
                try{str = LZUTF8.decompress(str, {inputEncoding: 'Base64'});}catch(e){return null;}
                try{str = LZUTF8.decompress(str, {inputEncoding: 'StorageBinaryString'});}catch(e){return null;}
                try{str = JSON.parse(str);}catch(e){}
                return str;
            }
            `, `
            fileData = strDecompress(fileData);
            if(!fileData){console.error(file, 'failed to decompress');return undefined;}
            `);
        }
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
        fileData = minifyFile(fileData, opts.minify);
    }

    let fileOutput = file.replace(/\.js$/, '.build.js');
    if(encryptKeys){
        let keyFile = fileOutput.replace(/\.js$/, '.keys');
        fs.writeFileSync(keyFile, encryptKeys);
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

    if(fileData.startsWith('//@compressed:')){
        fileData = strDecompress(fileData.replace('//@compressed:', ''));
        if(!fileData){if(!optional){throw new Error(file+' failed to decompress');}return undefined;}
    }

    return requireFromString(fileData, file);
}


function getRequiredFiles(file, options = {}, dirname){
    file = file.replace(/require\([\s\n]*?('\.{1,2}[/\\](?:[\w_\-$./\\?!%*:|<>@#^&()\[\]`~\s"]|\\')+'|"\.{1,2}[/\\](?:[\w_\-$./\\?!%*:|<>@#^&()\[\]`~\s']|\\")+")[\s\n]*?\);/gs, function(str, file){
        if(!file){return str;}
        file = file.toString().substring(1, file.length-1);

        let fallbackResult = str;
        if(dirname){
            let relDirname = dirname.replace(rootDirname, '');
            if(relDirname.startsWith('/') || relDirname.startsWith('\\')){relDirname = relDirname.replace(/^[/\\]/, '');}
            if(relDirname.endsWith('/') || relDirname.endsWith('\\')){relDirname = relDirname.replace(/[/\\]$/, '');}
            fallbackResult = fallbackResult.replace(/(\.{1,2}[/\\])/, '$1'+relDirname+'/');
        }

        if(!file.startsWith(rootDirname)){file = path.join(dirname || rootDirname, file);}
        else{file = path.resolve(file);}
        if(!file.startsWith(rootDirname)){return fallbackResult;}
        if(!file.endsWith('.js')){file += '.js';}
        if(!fs.existsSync(file)){return fallbackResult;}
        let fileData = undefined;
        try{
            fileData = fs.readFileSync(file).toString();
        }catch(e){return fallbackResult;}
        if(!fileData || fileData === ''){return fallbackResult;}

        let exportsToken = crypto.randomBytes(8).toString('hex').replace(/[^\w_]/g, '');
        fileData = getRequiredFiles(fileData, options, path.join(file, '..'));
        fileData = fileData.replace(/module[\s\n]*?\.[\s\n]*?exports[\s\n]*?([\w_$.\s\n]*)=/gs, '$_'+exportsToken+'_module_exports$1=');
        fileData = fileData.replace(/\/\*@min\*\/`(.*?)`/gs, function(str, code){return minifyFile(code, options.minify);});
        fileData = minifyFile(fileData, options.minify);
        return `(function(){let $_${exportsToken}_module_exports=undefined;${fileData}return $_${exportsToken}_module_exports;})();`;
    });
    return file;
}


module.exports = (function(){
    let exports = runFile;
    exports.build = build;
    exports.runFile = runFile;
    exports.rootDir = function(rootDir){if(rootDir){rootDirname = path.resolve(rootDir.toString()) || undefined;}};
    return exports;
})();
