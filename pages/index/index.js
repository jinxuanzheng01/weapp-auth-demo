//index.js
//获取应用实例
const app = getApp();

Page({
    data: {},

    onLoad() {},

    bindGetLocation(e) {
        let that = this;
        wx.getLocation({
            success(res) {
                console.log('success', res);
            },
            fail(err) {
                console.log('fail', err);
            }
        });
    },
    bindGetAddress(e) {
        let that = this;
        wx.chooseAddress({
            success(res) {
                console.log('success', res);
            },
            fail(err) {
                console.log('wx.chooseAddress 错误')

            }
        });
    }
});
