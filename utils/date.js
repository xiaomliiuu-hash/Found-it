// 日期与过期状态计算（纯函数，无副作用）

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

// Date -> 'YYYY-MM-DD'
function formatDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

// 今天的 'YYYY-MM-DD'
function todayStr() {
  return formatDate(new Date())
}

// 'YYYY-MM-DD' -> 本地零点 Date
function parseDate(str) {
  const parts = String(str).split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2])
}

// b - a 的天数（a、b 均为 'YYYY-MM-DD'）
function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000)
}

// dateStr + n 天
function addDays(dateStr, n) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

// 生效到期日 = min(基础到期日, 开封日期 + 开封后保质天数)
// 返回 { date, source: 'base'|'opened' } 或 null
function getEffectiveExpiry(item) {
  if (!item) return null
  const base = (item.expiry && item.expiry.enabled && item.expiry.date) ? item.expiry.date : null
  let opened = null
  if (item.opened && item.opened.openedAt && item.opened.shelfDays > 0) {
    opened = addDays(item.opened.openedAt, item.opened.shelfDays)
  }
  if (!base && !opened) return null
  if (!base) return { date: opened, source: 'opened' }
  if (!opened) return { date: base, source: 'base' }
  return (opened <= base) ? { date: opened, source: 'opened' } : { date: base, source: 'base' }
}

// 过期状态：'expired'(已过期) | 'soon'(即将过期) | 'none'(正常)
function getExpiryStatus(item, today) {
  const eff = getEffectiveExpiry(item)
  if (!eff) return 'none'
  const days = daysBetween(today, eff.date)
  if (days < 0) return 'expired'
  if (days <= (item.expiry ? (item.expiry.alertDays || 0) : 0)) return 'soon'
  return 'none'
}

// 剩余天数（负数表示已过期 N 天），无保质期返回 null
function getRemainingDays(item, today) {
  const eff = getEffectiveExpiry(item)
  if (!eff) return null
  return daysBetween(today, eff.date)
}

// 人类可读的剩余文案
function formatRemaining(days) {
  if (days === null || days === undefined) return ''
  if (days < 0) return '已过期 ' + (-days) + ' 天'
  if (days === 0) return '今天到期'
  return '剩 ' + days + ' 天'
}

module.exports = {
  pad,
  formatDate,
  todayStr,
  parseDate,
  daysBetween,
  addDays,
  getEffectiveExpiry,
  getExpiryStatus,
  getRemainingDays,
  formatRemaining
}
