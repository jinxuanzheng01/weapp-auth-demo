(function (exports) {

    // 授权信息
    let cacheAuthMsg = {};

    const showModalTips = {
        'scope.record': '您暂未开启录音权限的授权，是否开启',
        'scope.writePhotosAlbum': '您暂未开启保存媒体资源至相册的授权，是否开启',
        'scope.userLocation': '您暂未开启地理位置信息的授权，是否开启',
        'scope.address': '您暂未开启收货地址的授权，是否开启'
    };

    // 格式化返回结果
    function to(promise){
        return promise
            .then(result => [null, result])
            .catch(err => [err, null]);
    }


    // 获得系统信息
    function getSetting() {
        return new Promise((resolve, reject) => {
            wx.getSetting({
                success(res) {
                    resolve(res);
                },
                fail(err) {
                    reject(err);
                }
            });
        })
    }

    // 用户授权
    function authorize(opts) {
        return new Promise((resolve, reject) => {
            wx.authorize({
                ...opts,
                success(res) {
                    resolve(res);
                },
                fail(err) {
                    reject(err)
                }
            });
        })
    }


    // 检查用户是否授权
    exports.isCheckAuthApiSetting = async function(type, cb) {

        // 简单的类型校验
        if(!type && typeof type !== 'string') return;

        // 声明
        let err, result;

        // 获取本地配置项
        [err, result] = await to(getSetting());         // 这里可以做一层缓存，检查缓存的状态，如果已授权可以不必再次走下面的流程，直接return出去即可
        if (err) {
            return cb('fail');
        }

        // 当授权成功时，直接执行
        if (result.authSetting[type]) {
            return cb('success');
        }

        // 调用获取权限
        [err, result] = await to(authorize({scope: type, $callee: 'isCheckAuthApiSetting'}));
        if (!err) {
            return cb('success');
        }

        wx.showModal({
            content: showModalTips[type] || '您暂未开启权限，是否开启',
            confirmColor: '#72bd4a',
            success: res => {
                if (res.confirm) {
                    wx.openSetting({
                        success(res){
                            !!res.authSetting[type] ? cb('success') : cb('fail');
                        }
                    });
                }else {
                    cb('fail');
                }
            }
        });
    }
})(module.exports);
