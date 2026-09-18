const store = require('./utils/store')
const theme = require('./utils/theme')

App({
  onLaunch() {
    // 首次启动/版本升级写入种子数据
    store.seed()
    theme.apply()
  },
  onShow() {
    theme.apply()
  }
})
