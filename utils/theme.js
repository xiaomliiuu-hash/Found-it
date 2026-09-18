// 主题色：读取设置并应用到导航栏，返回当前主题供页面做 CSS 变量

const store = require('./store')

const THEMES = [
  { name: '暖橙', color: '#FF7A45', tint: '#FFF3EE', glow: 'rgba(255, 122, 69, 0.12)', grad: 'linear-gradient(135deg, #FFB199, #FF7A45)' },
  { name: '清新蓝', color: '#5B8DEF', tint: '#EAF1FF', glow: 'rgba(91, 141, 239, 0.12)', grad: 'linear-gradient(135deg, #A8C4FF, #5B8DEF)' },
  { name: '抹茶绿', color: '#3FB68B', tint: '#EAF7EF', glow: 'rgba(63, 182, 139, 0.12)', grad: 'linear-gradient(135deg, #9BE3C4, #3FB68B)' },
  { name: '樱花紫', color: '#9B59B6', tint: '#F5ECFA', glow: 'rgba(155, 89, 182, 0.12)', grad: 'linear-gradient(135deg, #D3B6E8, #9B59B6)' }
]

const DEFAULT_THEME = THEMES[0]

function getTheme() {
  const s = store.getSettings()
  const c = s.themeColor
  return THEMES.find((t) => t.color === c) || DEFAULT_THEME
}

function getThemeColor() {
  return getTheme().color
}

// 生成页面根节点内联样式串（CSS 变量定义）
function getThemeStyle() {
  const t = getTheme()
  return `--primary:${t.color}; --primary-tint:${t.tint}; --primary-glow:${t.glow}; --primary-grad:${t.grad};`
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

module.exports = { THEMES, getTheme, getThemeColor, getThemeStyle, apply }
