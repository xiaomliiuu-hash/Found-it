// CSV 生成与导出：Excel/WPS 可直接打开，中文用 UTF-8 BOM 保证不乱码

const store = require('./store')
const { formatDate } = require('./date')

const COLUMNS = [
  ['name', '名称'],
  ['space', '空间'],
  ['category', '分类'],
  ['room', '房间'],
  ['place', '具体位置'],
  ['member', '归属人'],
  ['quantity', '数量'],
  ['unit', '单位'],
  ['expiryDate', '到期日'],
  ['openedAt', '开封日期'],
  ['shelfDays', '开封后保质天数'],
  ['purchaseDate', '购买日期'],
  ['store', '购买渠道'],
  ['price', '价格'],
  ['lowStock', '低库存阈值'],
  ['borrowed', '借出中'],
  ['tags', '标签'],
  ['note', '备注'],
  ['archived', '归档']
]

function escapeCell(v) {
  const s = (v === null || v === undefined) ? '' : String(v)
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function buildCsv() {
  const items = store.getItems()
  const categories = store.getCategories()
  const members = store.getMembers()
  const spaces = store.getSpaces()
  const catMap = {}
  const memMap = {}
  const spaceMap = {}
  categories.forEach((c) => { catMap[c.id] = c })
  members.forEach((m) => { memMap[m.id] = m })
  spaces.forEach((s) => { spaceMap[s.id] = s })

  const header = COLUMNS.map((c) => escapeCell(c[1])).join(',')
  const rows = items.map((it) => {
    const cat = catMap[it.categoryId]
    const mem = memMap[it.memberId]
    const space = spaceMap[it.spaceId]
    const cells = [
      it.name,
      space ? space.name : '',
      cat ? cat.name : '',
      it.location && it.location.room ? it.location.room : '',
      it.location && it.location.place ? it.location.place : '',
      mem ? mem.name : '',
      (typeof it.quantity === 'number') ? it.quantity : '',
      it.unit || '',
      it.expiry && it.expiry.enabled ? it.expiry.date : '',
      it.opened && it.opened.openedAt ? it.opened.openedAt : '',
      it.opened && it.opened.shelfDays ? it.opened.shelfDays : '',
      it.purchase && it.purchase.date ? it.purchase.date : '',
      it.purchase && it.purchase.store ? it.purchase.store : '',
      it.purchase && it.purchase.price ? it.purchase.price : '',
      (typeof it.lowStockThreshold === 'number') ? it.lowStockThreshold : '',
      it.borrowed && it.borrowed.enabled ? (it.borrowed.to ? '借给' + it.borrowed.to : '是') : '',
      (it.tags || []).join('、'),
      it.note || '',
      it.archived ? '是' : ''
    ]
    return cells.map(escapeCell).join(',')
  })

  return '﻿' + [header].concat(rows).join('\r\n')
}

// 导出 CSV 文件到用户数据目录，返回文件路径
function exportCsvFile() {
  return new Promise((resolve, reject) => {
    const csv = buildCsv()
    const name = '小寻物仓_备份_' + formatDate(new Date()).replace(/-/g, '') + '.csv'
    const filePath = wx.env.USER_DATA_PATH + '/' + name
    wx.getFileSystemManager().writeFile({
      filePath,
      data: csv,
      encoding: 'utf8',
      success: () => resolve(filePath),
      fail: reject
    })
  })
}

module.exports = { buildCsv, exportCsvFile }
