// 汇总统计（纯函数，无副作用）：件数 / 临期 / 过期 / 已记录价值 / 分类占比
const { todayStr, getExpiryStatus } = require('./date')

// 汇总已填价格的有效金额，返回 { value, count }
function sumValue(items) {
  let value = 0
  let count = 0
  items.forEach((it) => {
    const p = it && it.purchase && it.purchase.price
    if (p === null || p === undefined || p === '') return
    const n = parseFloat(String(p).replace(/[¥,，\s]/g, ''))
    if (isFinite(n) && n >= 0) {
      value += n
      count++
    }
  })
  return { value, count }
}

// 金额格式化：¥ + 千分位（最多 2 位小数）
function formatMoney(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100
  const parts = String(v).split('.')
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const dec = parts[1]
  return '¥' + int + (dec ? '.' + dec : '')
}

// 首页仪表盘统计
function computeStats(items, categories) {
  const today = todayStr()
  let expiredCount = 0
  let soonCount = 0
  items.forEach((it) => {
    const s = getExpiryStatus(it, today)
    if (s === 'expired') expiredCount++
    else if (s === 'soon') soonCount++
  })

  const { value, count: valueCount } = sumValue(items)

  const catMap = {}
  categories.forEach((c) => { catMap[c.id] = c })
  const counter = {}
  items.forEach((it) => {
    const id = it.categoryId || ''
    counter[id] = (counter[id] || 0) + 1
  })
  const total = items.length
  const categoryDist = Object.keys(counter).map((id) => {
    const c = catMap[id] || { name: '未分类', icon: '📦', color: '#9B9B96' }
    return {
      id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      count: counter[id],
      percent: total ? Math.round(counter[id] / total * 100) : 0
    }
  }).sort((a, b) => b.count - a.count)

  return {
    totalCount: total,
    expiredCount,
    soonCount,
    value,
    valueCount,
    categoryDist
  }
}

module.exports = { sumValue, formatMoney, computeStats }
