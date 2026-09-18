// 主题色：读取设置并应用到导航栏，返回当前主题供页面做 CSS 变量

const store = require('./store')

const THEMES = [
  { name: '橄榄绿', color: '#54684F', tint: '#D9E2D6', glow: 'rgba(84, 104, 79, 0.12)', grad: 'linear-gradient(135deg, #A7BBA5, #54684F)' },
  { name: '清新蓝', color: '#5B8DEF', tint: '#EAF1FF', glow: 'rgba(91, 141, 239, 0.12)', grad: 'linear-gradient(135deg, #A8C4FF, #5B8DEF)' },
  { name: '焦糖', color: '#B8834A', tint: '#F3E7D5', glow: 'rgba(184, 131, 74, 0.12)', grad: 'linear-gradient(135deg, #E0C29A, #B8834A)' },
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
