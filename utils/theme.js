// 主题色：读取设置并应用到导航栏，返回当前主题供页面做 CSS 变量

const store = require('./store')

const THEMES = [
  { name: '橄榄绿', color: '#54684F', tint: '#D9E2D6', glow: 'rgba(84, 104, 79, 0.12)', grad: 'linear-gradient(135deg, #A7BBA5, #54684F)' },
  { name: '清新蓝', color: '#7E96B5', tint: '#E7ECF4', glow: 'rgba(126, 150, 181, 0.12)', grad: 'linear-gradient(135deg, #B4C4D8, #7E96B5)' },
  { name: '焦糖', color: '#A9896B', tint: '#EFE7DA', glow: 'rgba(169, 137, 107, 0.12)', grad: 'linear-gradient(135deg, #D2C0A6, #A9896B)' },
  { name: '樱花紫', color: '#9A87B3', tint: '#EBE6F0', glow: 'rgba(154, 135, 179, 0.12)', grad: 'linear-gradient(135deg, #C4B7D6, #9A87B3)' }
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
