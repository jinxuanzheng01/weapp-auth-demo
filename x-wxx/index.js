const apiExtend = require('./lib/api-extend');

module.exports = (function (wxx) {
    wxx = {...wxx};
    for (let key in wxx) {
        !!apiExtend[key] && (()=> {

            // 缓存原有函数
            let originFunc = wxx[key];

            // 装饰扩展的函数
            wxx[key] = (...args) => apiExtend[key](...args, originFunc);
        })();
    }
    return wxx;
})(wx);
