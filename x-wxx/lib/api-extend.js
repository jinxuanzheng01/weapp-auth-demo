const Func = require('./Func');

(function (exports) {
    // 获取权限
    exports.authorize = function (opts, done) {
        // 当调用为"确认授权方法时"直接执行，避免死循环
        if (opts.$callee === 'isCheckAuthApiSetting') {
            console.log('optsopts', opts);
            done(opts);
            return;
        }
        Func.isCheckAuthApiSetting(opts.scope, () => done(opts));
    };

    // 选择地址
    exports.chooseAddress = function (opts, done) {
        Func.isCheckAuthApiSetting('scope.address', () => done(opts));
    };

    // 获取位置信息
    exports.getLocation = function (opts, done) {
        Func.isCheckAuthApiSetting('scope.userLocation', () => done(opts));
    };

    // 保存到相册
    exports.saveImageToPhotosAlbum = function (opts, done) {
        Func.isCheckAuthApiSetting('scope.writePhotosAlbum', () => done(opts));
    }

    // ...more
})(module.exports);
