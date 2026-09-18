// 主题色：读取设置并应用到导航栏，返回当前主题色供页面做 CSS 变量

const store = require('./store')

const THEMES = [
  { name: '暖橙', color: '#FF7A45' },
  { name: '清新蓝', color: '#5B8DEF' },
  { name: '抹茶绿', color: '#3FB68B' },
  { name: '樱花紫', color: '#9B59B6' }
]

function getThemeColor() {
  const s = store.getSettings()
  return s.themeColor || '#FF7A45'
}

function apply() {
  const c = getThemeColor()
  wx.setNavigationBarColor({
    frontColor: '#ffffff',
    backgroundColor: c,
    fail: () => {}
  })
  return c
}

module.exports = { THEMES, getThemeColor, apply }
