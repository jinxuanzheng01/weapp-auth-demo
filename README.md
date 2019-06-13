# weapp-auth-demo
微信小程序授权统一管理方案（包含对wx对象的扩展）

# 用户授权篇

> getUserInfo较为特殊，不包含在本文范围内，主要针对需要授权的功能性api，例如：[wx.startRecord](https://developers.weixin.qq.com/miniprogram/dev/api/media/recorder/wx.startRecord.html)，[wx.saveImageToPhotosAlbum](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.saveImageToPhotosAlbum.html)， [wx.getLocation](https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.getLocation.html)


仓库地址：[https://github.com/jinxuanzheng01/weapp-auth-demo](https://github.com/jinxuanzheng01/weapp-auth-demo)

<a name="6IpAR"></a>
## 背景
小程序内如果要调用部分接口需要用户进行授权，例如获取地理位置信息，收获地址，录音等等，但是小程序对于这些需要授权接口的并不是特别友好，最明显的有两点：

- 如果用户**已拒绝授权，则不会出现弹窗**，而是**直接进入接口 fail 回调**，其授权关系会记录在后台，**直到用户主动删除小程序**

一般情况而言，每次授权时都应该激活弹窗进行提示，是否进行授权，例如：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/268444/1560329450029-35f7a7d6-51c5-4a2d-91e3-759ecfafa07e.png#align=left&display=inline&height=274&name=image.png&originHeight=274&originWidth=372&size=87481&status=done&width=372)

而小程序内只有第一次进行授权时才会主动激活弹窗（微信提供的），其他情况下都会直接走fail回调，微信文档也在句末添加了一句**请开发者兼容用户拒绝授权的场景**<br />**<br />这种未做兼容的情况下如果用户想要使用录音功能，第一次点击拒绝授权，那么之后无论如何也**无法再次开启录音权限**，很明显不符合我们的预期。

<a name="reacx"></a>
## 授权处理方法

<a name="JEylR"></a>
#### 官方demo
下面这段代码是微信官方提供的授权代码, 可以看到也并没有兼容拒绝过授权的场景查询是否授权（即无法再次调起授权）

```javascript
// 可以通过 wx.getSetting 先查询一下用户是否授权了 "scope.record" 这个 scope
wx.getSetting({
  success(res) {
    if (!res.authSetting['scope.record']) {
      wx.authorize({
        scope: 'scope.record',
        success () {
          // 用户已经同意小程序使用录音功能，后续调用 wx.startRecord 接口不会弹窗询问
          wx.startRecord()
        }
      })
    }
  }
})
```

<a name="10qcq"></a>
#### 一般处理方式
那么正常情况下我们该怎么做呢？以地理位置信息授权为例：

```javascript
wx.getLocation({
   success(res) { 
      console.log('success', res);
   },
   fail(err) {
      // 检查是否是因为未授权引起的错误
      wx.getSetting({
         success (res) {               
            // 当未授权时直接调用modal窗进行提示
            !res.authSetting['scope.userLocation'] && wx.showModal({
               content: '您暂未开启权限，是否开启',
               confirmColor: '#72bd4a',
               success: res => {              
                  // 用户确认授权后，进入设置列表
                  if (res.confirm) {
                     wx.openSetting({
                        success(res){
                           // 查看设置结果
                           console.log(!!res.authSetting['scope.userLocation'] ? '设置成功' : '设置失败');
                        },
                     });
                  }
               }
            });
         }
      });
   }
});
```

上面代码，有些同学可能会对在fail回调里直接使用wx.getSetting有些疑问，这里主要是因为

- 微信返回的错误信息**没有一个统一code**
- **errMsg又在不同平台有不同的表现**
- 从埋点数据得出结论，调用这些api接口**出错率基本集中在未授权的状态下**

这里为了方便就直接调用权限检查了 ，也可以稍微封装一下，方便扩展和复用，变成：
```javascript
  bindGetLocation(e) {
        let that = this;
        wx.getLocation({
            success(res) {
                console.log('success', res);
            },
            fail(err) {
                that.__authorization('scope.userLocation');
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
                that.__authorization('scope.address');
            }
        });
    },
    __authorization(scope) {
		  	/** 为了节省行数，不细写了，可以参考上面的fail回调，大致替换了下变量res.authSetting[scope] **/ 
    }
```

看上去好像没有什么问题，fail里只引入了一行代码，

这里如果只针对较少页面的话我认为已经够用了，毕竟‘如非必要，勿增实体’，但是对于小打卡这个小程序来说可能涉及到的页面，需要调用的场景偏多，我并不希望每次都人工去调用这些方法，毕竟人总会犯错

<a name="Jxrl3"></a>
## 扩展wx[funcName]方法
为了节省认知成本和减少出错概率，我希望他是这个api默认携带的功能，也就是说因未授权出现错误时自动调起是否开启授权的弹窗

为了实现这个功能，我们可能需要**对wx的原生api**进行一层包装了（关于页面的包装可以看：[如何基于微信原生构建应用级小程序底层架构](https://developers.weixin.qq.com/community/develop/article/doc/000ca60a70080897fa68a92fe51813)）

<a name="M07dc"></a>
#### 为wx.getLocation添加自己的方法
这里需要注意的一点是直接使用常见的装饰模式是会出现如下报错的，因为wx这个对象在设置属性时没有设置set方法，这里需要单独处理一下

```javascript
// 直接装饰，会报错 Cannot set property getLocation of #<Object> which has only a getter 
let $getLocation = wx.getLocation;
wx.getLocation = function (obj) {
    $getLocation(obj);	
};

// 需要做一些小处理
wx = {...wx};										// 	对wx对象重新赋值
let $getLocation = wx.getLocation;
wx.getLocation = function (obj) {					
    console.log('调用了wx.getLocation');
    $getLocation(obj);	
};

// 再次调用时会在控制台打印出 '调用了wx.getLocation' 字样
wx.getLocation()
```

<a name="DQALV"></a>
#### 劫持fail方法
第一步我们已经控制了wx.getLocation这个api，接下来就是对于fail方法的劫持，因为我们需要在fail里加入我们自己的授权逻辑

```javascript
// 方法劫持
wx.getLocation = function (obj) {
    let originFail = obj.fail;

    obj.fail = async function (errMsg) {
        // 0 => 已授权 1 => 拒绝授权 2 => 授权成功
        let authState = await authorization('scope.userLocation');
        
        // 已授权报错说明并不是权限问题引起，所以继续抛出错误
        // 拒绝授权，走已有逻辑，继续排除错误
        authState !== 2 && originFail(errMsg);
    };
    $getLocation(obj);
};

// 定义检查授权方法
function authorization(scope) {
    return new Promise((resolve, reject) => {
        wx.getSetting({
            success (res) {
                !res.authSetting[scope]
                    ? wx.showModal({
                        content: '您暂未开启权限，是否开启',
                        confirmColor: '#72bd4a',
                        success: res => {
                            if (res.confirm) {
                                wx.openSetting({
                                    success(res){
                                        !!res.authSetting[scope] ? resolve(2) : resolve(1)
                                    },
                                });
                            }else {
                                resolve(1);
                            }
                        }
                    })
                    : resolve(0);
            }
        })
    });
}

// 业务代码中的调用
  bindGetLocation(e) {
        let that = this;
        wx.getLocation({
            type: 'wgs84',
            success(res) {
                console.log('success', res);
            },
            fail(err) {
                console.warn('fail', err);
            }
        });
  }

```

可以看到现在已实现的功能已经达到了我们最开始的预期，即因授权报错作为了wx.getLocation默认携带的功能，我们在业务代码里再也不需要处理任何再次授权的逻辑

也意味着wx.getLocation这个api不论在任何页面，组件，出现频次如何，我们都不需要关心它的授权逻辑（效果本来想贴gif图的，后面发现有图点大，具体效果去gif仓库跑一下demo吧）

<a name="KgTiv"></a>
#### 让我们再优化一波
上面所述大致是整个的一个思路，但是应用到实际项目中还需要考虑到整体的扩展性和维护成本，那么就让我们来优化一波

**代码包结构：**<br />本质上只要在app.js这个启动文件内，引用./x-wxx/index文件对原有的wx对象进行覆盖即可

![image.png](https://cdn.nlark.com/yuque/0/2019/png/268444/1560420520054-264a61eb-9d7b-42e1-b447-2a768218d306.png#align=left&display=inline&height=98&name=image.png&originHeight=98&originWidth=271&size=6159&status=done&width=271)

**简单的代码逻辑： **

```javascript
// 大致流程：

//app.js
wx = require('./x-wxx/index');						// 入口处引入文件

// x-wxx/index 
const apiExtend = require('./lib/api-extend')；
module.exports = (function (wxx) {				    // 对原有方法进行扩展
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

// lib/api-extend
const Func = require('./Func');
(function (exports) {								// 需要扩展的api（类似于config）
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
```

<a name="dm0Vc"></a>
#### 更多的玩法
可以看到我们无论后续扩展任何的微信api，都只需要在lib/api-extend.js 配置即可，这里不仅仅局限于授权，也可以做一些日志，传参的调整，例如：

```javascript
 // 读取本地缓存(同步)
exports.getStorageSync = (key, done) => {
        let storage = null;
        try {
            storage = done(key);
        } catch (e) {
            wx.$logger.error('getStorageSync', {msg: e.type});
        }
        return storage;
};
```

这样是不是很方便呢，至于Func.isCheckAuthApiSetting这个方法具体实现，为了节省文章行数请自行去git仓库里查看吧

<a name="QiiFb"></a>
#### 关于音频授权
音频授权略为特殊，以wx.getRecorderManager为例，它并不能直接调起录音授权，所以并不能直接用上述的这种方法，不过我们可以曲线救国，达到类似的效果，还记得我们对于wx.authorize的包装么，本质上我们是可以直接使用它来进行授权的，比如将它用在我们已经封装好的录音管理器的start方法进行校验

```javascript
wx.authorize({
   scope: 'scope.record'
});
```

实际上，为方便统一管理，Func.isCheckAuthApiSetting方法其实都是使用wx.authorize来实现授权的

```javascript
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
}
```

<a name="sttj5"></a>
#### 关于用户授权
用户授权极为特殊，因为微信将wx.getUserInfo升级了一版，没有办法直接唤起了，详见[《公告》](https://developers.weixin.qq.com/community/develop/doc/0000a26e1aca6012e896a517556c01)，<br />所以需要单独处理，关于这里会拆出单独的一篇文章来写一些有趣的玩法
<a name="Qzjw8"></a>
## 
<a name="C2cFM"></a>
## 总结
还是那么一句话吧，小程序不管和web开发有多少不同，本质上都是在js环境上进行开发的，<br />希望小程序的社区环境更加活跃，带来更多有趣的东西
