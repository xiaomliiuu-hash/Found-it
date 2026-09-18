// 生成唯一 id：前缀 + 时间戳(36进制) + 随机串
function genId(prefix) {
  const p = prefix || 'id'
  return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

module.exports = { genId }
