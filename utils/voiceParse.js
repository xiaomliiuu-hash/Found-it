// 语音识别结果 → 物品字段的智能解析（纯函数，无 wx 依赖）
// 输入：识别出的整句文本；输出：可填入 item-edit 表单的草稿字段
// 说明：中文无空格，靠关键词 + 正则启发式抽取；解析不出就整句进名称，绝不丢信息。

const { pad, todayStr, daysBetween } = require('./date')

// 中文数字 → 阿拉伯数字（支持 十/百 组合）
const CN = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
function cnToNum(s) {
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  let sum = 0
  let cur = 0
  for (const ch of s) {
    if (ch === '十') { cur = (cur || 1) * 10; sum += cur; cur = 0 }
    else if (ch === '百') { cur = (cur || 1) * 100; sum += cur; cur = 0 }
    else if (CN[ch] !== undefined) { cur = CN[ch] }
  }
  return sum + cur
}

const ROOMS = ['客厅', '卧室', '厨房', '卫生间', '洗手间', '阳台', '书房', '储物间', '储藏间', '车库', '玄关', '餐厅', '儿童房', '办公室']

// 复合收纳名词（本身即完整位置）
const COMPOUND = ['床头柜', '电视柜', '鞋柜', '衣柜', '书柜', '书架', '储物柜', '收纳箱', '收纳盒', '整理箱', '冰箱', '药箱', '置物架', '鞋架', '储物架']
// 裸收纳词（常配「第X个/层」）
const BARE = ['抽屉', '柜子', '箱子', '盒子']
const NUM_RE = '[0-9一二两三四五六七八九十百]+'
const UNIT_LIST = ['盒', '瓶', '包', '个', '袋', '斤', '支', '罐', '件', '条', '块', '箱']

// 1) 到期日
function extractDate(text) {
  // 全日期：2026年12月30日 / 2026-12-30 / 2026/12/30
  let m = text.match(/((?:20|19)\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})日?/)
  if (m) return { date: m[1] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[3])), raw: m[0] }
  // 月日：12月30号 / 12月30日（缺省年份用当前年，已过期则顺延一年）
  m = text.match(/(\d{1,2})月(\d{1,2})[号日]/)
  if (m) {
    const now = todayStr()
    const year = Number(now.split('-')[0])
    let date = year + '-' + pad(Number(m[1])) + '-' + pad(Number(m[2]))
    if (daysBetween(now, date) < 0) date = (year + 1) + '-' + pad(Number(m[1])) + '-' + pad(Number(m[2]))
    return { date, raw: m[0] }
  }
  return null
}

// 2) 数量 + 单位
function extractQuantity(text) {
  const re = new RegExp('(' + NUM_RE + ')\\s*(' + UNIT_LIST.join('|') + ')', 'g')
  let m
  while ((m = re.exec(text)) !== null) {
    if (text[m.index - 1] === '第') continue // 排除「第X个/层」这类序数
    const n = cnToNum(m[1])
    if (n > 0) return { quantity: String(n), unit: m[2], raw: m[0] }
  }
  return null
}

// 3) 房间
function extractRoom(text) {
  for (const r of ROOMS) {
    const i = text.indexOf(r)
    if (i >= 0) return { room: r, raw: r }
  }
  return null
}

// 4) 具体位置
function extractPlace(text) {
  // 复合收纳名词 + 可选「第X个/层」+ 可选裸收纳词（如「电视柜第二个抽屉」）
  let m = text.match(new RegExp('(' + COMPOUND.join('|') + ')(第' + NUM_RE + '[个层])?(' + BARE.join('|') + ')?'))
  if (m) return { place: m[0].trim(), raw: m[0] }
  // 「第X个/层」+ 裸收纳词（如「第二个抽屉」）
  m = text.match(/第[0-9一二两三四五六七八九十]+[个层](抽屉|柜子|箱子|盒子)/)
  if (m) return { place: m[0], raw: m[0] }
  return null
}

// 5) 名称 = 第一个结构词（在/放/保质期/到期…）之前的部分
function extractName(rest) {
  const i = rest.search(/在|放|保质期|有效期|到期|过期|位于|搁/)
  const s = i >= 0 ? rest.slice(0, i) : rest
  return s.replace(/^[\s的]+|[\s的]+$/g, '').trim()
}

function parse(text) {
  const raw = String(text || '').replace(/[。，,、！？!?；;：:…]/g, ' ').replace(/\s+/g, ' ').trim()
  const draft = { name: '', room: '', place: '', quantity: '', unit: '', date: '', expiryEnabled: false, note: '' }
  if (!raw) return draft

  let rest = raw

  const d = extractDate(rest)
  if (d) { draft.date = d.date; draft.expiryEnabled = true; rest = rest.replace(d.raw, ' ') }

  const q = extractQuantity(rest)
  if (q) { draft.quantity = q.quantity; draft.unit = q.unit; rest = rest.replace(q.raw, ' ') }

  const r = extractRoom(rest)
  if (r) { draft.room = r.room; rest = rest.replace(r.raw, ' ') }

  const p = extractPlace(rest)
  if (p) { draft.place = p.place; rest = rest.replace(p.raw, ' ') }

  draft.name = extractName(rest)
  if (draft.name) rest = rest.replace(draft.name, ' ')

  draft.note = rest
    .replace(/保质期|有效期|到期|过期|保质/g, ' ')
    .replace(/^[\s在放搁到至的]+|[\s在放搁到至的]+$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 兜底：什么都没解析出来 → 整句当名称
  if (!draft.name && !draft.room && !draft.place && !draft.quantity && !draft.date && !draft.note) {
    draft.name = raw
  }

  return draft
}

module.exports = { parse, cnToNum }
