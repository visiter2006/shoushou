var app = getApp();

/**
 * 公共微信https请求封装
 * @param url
 * @param type
 * @param data
 * @param callBack
 */
function https(url, type, data, callBack, header) {
    if (!data.isShowLoad) {
        wx.showLoading({
            title: '加载中',
        })
    }
    wx.request({
        url: url,
        method: type,
        data: data,
        header: header ? header : ( {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + wx.getStorageSync('token')
        }),
        success: function (res) {
            console.log(res);
            if (res.data.code != 1001) {
                if (res.data.message) {
                    showToast(res.data.message)
                }

            }
            callBack(res.data);
        },
        fail: function (error) {
            console.log(error)
            showToast("请求失败:" + JSON.stringify(error))

        },
        complete: function () {
            wx.hideLoading();
            wx.stopPullDownRefresh();
        }
    })
}

/**
 * 接口API授权 type 1.是公共授权  2.登录授权  immediately立刻执行授权
 */
function authorization(type, callback,immediately) {
    if (type == 1) { //1.是公共授权
        //获取公共接口授权token  公共接口授权token两个小时失效  超过两个小时重新请求
        if (!wx.getStorageSync("userid") && (immediately||(!wx.getStorageSync("token") || wx.getStorageSync("token") == "undefined" || ((new Date().getTime() - new Date(wx.getStorageSync("expires_in")).getTime()) / 1000) > 7199))) {
            this.https(app.globalData.api + "/token", "POST", {grant_type: 'client_credentials'},
                function (data) {
                    if (data.access_token) {
                        wx.setStorageSync('token', data.access_token);//公共接口授权token
                        wx.setStorageSync('expires_in', new Date());//公共接口授权token 有效时间
                    }
                    callback.call(this)

                }, {
                    'Authorization': 'Basic MTcwNjE0MDAwMTozNzliYjljNi1kNTYwLTQzMjUtYTQxMi0zMmIyMjRlMjg3NDc=',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            )
        }
    } else if (type == 2) {  //2.登录授权
        //获取登录接口授权token  登录接口授权token两个小时失效  超过两个小时重新请求
        if (wx.getStorageSync("userid") && (immediately||((new Date().getTime() - new Date(wx.getStorageSync("expires_in")).getTime()) / 1000) > 7199)) {
            this.https(app.globalData.api + "/token", "POST", {
                    grant_type: 'password',
                    username: wx.getStorageSync("userid"),
                    password: wx.getStorageSync("usersecret")
                },
                function (data) {
                    if (data.access_token) {
                        wx.setStorageSync('token', data.access_token);//登录接口授权token
                        wx.setStorageSync('expires_in', new Date());//登录接口授权token 有效时间
                    }
                    callback.call(this)

                }, {
                    'Authorization': 'Basic MTcwNjE0MDAwMTozNzliYjljNi1kNTYwLTQzMjUtYTQxMi0zMmIyMjRlMjg3NDc=',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            )
        }
    }

}

/**
 * 是否登录
 */
function isLogin() {
    return wx.getStorageSync("userid") ? true : false;
}

/**
 * 是否登录提示
 */
function isLoginModal(isShow) {
    if (!wx.getStorageSync("userid")) {
        if (isShow) {
            wx.showModal({
                title: '收收提示',
                content: "登录收收,体验更完善功能",
                showCancel: true,
                confirmColor: "#00ACFF",
                confirmText: "登录",
                success: function (res) {
                    if (res.confirm) {
                        wx.navigateTo({
                            url: '/pages/account/login'
                        })
                        console.log('用户点击确定');
                    } else if (res.cancel) {
                        //返回上一页
                        wx.navigateBack({
                            delta: 1
                        })
                    }
                }
            })
        } else {
            wx.navigateTo({
                url: '/pages/account/login'
            })
        }
    }
}


/**
 * Toast提示框
 */
function showToast(title, icon, duration) {
    wx.showToast({
        title: title || "",
        icon: icon || 'success',
        duration: duration || 2000
    })
}

/**
 * ​Modal显示模态弹窗
 */
function showModal(title, content, confirmText, cancelText, callback, showCancel) {
    var that = this;
    wx.showModal({
        title: title,
        content: content,
        confirmText: confirmText,
        cancelText: cancelText,
        showCancel: showCancel || true,
        confirmColor: "#00ACFF",
        cancelColor: "#33cd5f",
        success: function (res) {
            callback.call(that, res)
            /*          if (res.confirm) {
                          console.log('用户点击确定')
                      } else if (res.cancel) {
                          console.log('用户点击取消')
                      }*/
        }
    })
}

/**
 * 调用验证表单方法
 */
function wxValidate(e, that, callback) {
    const params = e.detail.value
    /*    console.log(params);*/
    if (!that.WxValidate.checkForm(e)) {
        const error = that.WxValidate.errorList
        showToast(error[0].msg);
        /*      console.log(error)*/

        return false
    } else {
        callback.call(this)
    }
}

/**
 * 改变验证码按钮状态
 */
function verifyCodeBtn(e, that) {
    if (e.currentTarget.id == 'user' && (/^1(3|4|5|7|8)\d{9}$/.test(e.detail.value))) {
        that.setData({
            vcdisabled: false
        })
    } else if (e.currentTarget.id == 'user' && !(/^1(3|4|5|7|8)\d{9}$/.test(e.detail.value))) {
        that.setData({
            vcdisabled: true
        })
    }
}

/**
 * 获取验证码公共方法
 */
function getVerifyCode(account, that, callback) {
    var second = 120,
        timePromise = undefined;
    timePromise = setInterval(function () {
        if (second <= 0) {
            clearInterval(timePromise);
            that.setData({
                paracont: "重发验证码",
                vcdisabled: false

            })
        } else {
            that.setData({
                paracont: second + "秒后重试",
                vcdisabled: true

            })
            second--;
        }
    }, 1000, 122);

    this.https(app.globalData.api + "/api/util/send_sms_validcode/" + account, "GET", {},
        function (data) {
            if (data.code == 1001) {
                callback.call(this, data)
            }
        }
    )
}

/**
 * 点击tab切换
 */
function swichNav(e, that) {
    if (that.data.currentTab === e.target.dataset.current) {
        return false;
    } else {
        that.setData({
            currentTab: e.target.dataset.current
        })
    }
}

/**
 * 微信授权登录
 */
function wxLogin() {
    var that = this;
    //调用接口获取登录凭证（code）进而换取用户登录态信息，包括用户的唯一标识（openid）
    if (!wx.getStorageSync("openid")) { //初次授权登录 获取openid
        wx.login({
            success: function (res) {
                if (res.code) {
                    //根据微信Code获取对应的openId
                    that.https(app.globalData.api + "/api/wc/GetOpenid", "GET", {
                            code: res.code,
                            UserLogID: wx.getStorageSync("userid") || ""
                        },
                        function (data) {
                            if (data.code == 1001) {
                                wx.setStorageSync("openid", data.data.OpenId);//微信openid
                                wx.setStorageSync("userid", data.data.UserLogID);
                                wx.setStorageSync("usersecret", data.data.usersecret);
                                //根据会员ID获取会员账号基本信息
                                that.getUserInfo(function () {

                                });
                            }

                        })

                } else {
                    console.log('获取微信用户登录状态失败！' + res.errMsg);
                }
            }
        });
    }
}

/**
 * 根据会员ID获取会员账号基本信息
 */
function getUserInfo(callback) {
    var that = this;
    this.https(app.globalData.api + "/api/user/get/" + wx.getStorageSync("userid"), "GET", {},
        function (data) {
            if (data.code == 1001) {
                wx.setStorageSync("user", data.data);
                var services = data.data.services;
                //用户会员类型  0 无 1信息提供者  2回收者
                wx.setStorageSync("usertype", (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
                if (services == null || services.length == 0) {//旧会员 完善信息
                    that.showModal('收收提示', '尊敬的用户,您好！旧会员需完善资料后才能进行更多的操作！', '完善资料', '暂不完善', function (res) {
                        if (res.confirm) {
                            console.log('用户点击确定')
                        }
                    })

                }
                callback.call(this, data)
            }
        }
    )
}

module.exports = {
    https: https,
    authorization: authorization,
    isLogin: isLogin,
    isLoginModal: isLoginModal,
    showToast: showToast,
    showModal: showModal,
    wxValidate: wxValidate,
    verifyCodeBtn: verifyCodeBtn,
    getVerifyCode: getVerifyCode,
    swichNav: swichNav,
    wxLogin: wxLogin,
    getUserInfo: getUserInfo
}
