// 语音识别封装：微信官方「同声传译」插件 WechatSI（录音 + 实时转文字）
// 纯前端调用，不落自有后端；识别出的临时录音用完即删，不保留音频。

let manager = null

// 懒加载识别管理器：首次调用时才 requirePlugin，避免插件未添加时阻塞页面加载
function getManager() {
  if (manager) return manager
  const plugin = requirePlugin('WechatSI')
  manager = plugin.getRecordRecognitionManager()
  return manager
}

// 录音授权：未授权则申请，被拒则引导去设置页开启
function ensureRecordAuth() {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        const s = res.authSetting['scope.record']
        if (s) return resolve(true)
        if (s === false) {
          wx.showModal({
            title: '需要麦克风权限',
            content: '语音录入需要用到麦克风，请在设置中开启。',
            confirmText: '去开启',
            confirmColor: '#54684F',
            success: (m) => {
              if (m.confirm) {
                wx.openSetting({ success: (o) => resolve(!!o.authSetting['scope.record']) })
              } else {
                resolve(false)
              }
            }
          })
          return
        }
        wx.authorize({
          scope: 'scope.record',
          success: () => resolve(true),
          fail: () => {
            wx.showModal({
              title: '需要麦克风权限',
              content: '语音录入需要用到麦克风，请在设置中开启。',
              confirmText: '去开启',
              confirmColor: '#54684F',
              success: (m) => {
                if (m.confirm) {
                  wx.openSetting({ success: (o) => resolve(!!o.authSetting['scope.record']) })
                } else {
                  resolve(false)
                }
              }
            })
          }
        })
      },
      fail: () => resolve(false)
    })
  })
}

// 开始识别：opts = { onStart, onRecognize, onStop, onError }
// onStop(res) 里 res.result 为最终识别文本，res.tempFilePath 为临时录音
function startRecognize(opts) {
  const m = getManager()
  m.onStart = opts.onStart || function () {}
  m.onRecognize = opts.onRecognize || function () {}
  m.onStop = function (res) {
    // 用完即删临时录音，不保留音频
    try {
      if (res && res.tempFilePath) {
        wx.getFileSystemManager().unlink({ filePath: res.tempFilePath, fail: () => {} })
      }
    } catch (e) {}
    ;(opts.onStop || function () {})(res)
  }
  m.onError = opts.onError || function () {}
  m.start({ duration: 60000, lang: 'zh_CN' })
}

function stopRecognize() {
  if (!manager) return
  try { manager.stop() } catch (e) {}
}

module.exports = { ensureRecordAuth, startRecognize, stopRecognize }
