// 常用物品模板 + 示例数据（纯本地，用于降低录入门槛 & 新手体验）
const store = require('./store')
const { genId } = require('./id')
const { todayStr, addDays } = require('./date')

// 模板：点击后仅填入空字段（名称/分类/单位/开封后保质天数）
const TEMPLATES = [
  { name: '牛奶', categoryId: 'c_food', unit: '盒', shelfDays: 7 },
  { name: '鸡蛋', categoryId: 'c_food', unit: '个', shelfDays: 30 },
  { name: '蔬菜', categoryId: 'c_food', unit: '份', shelfDays: 5 },
  { name: '大米', categoryId: 'c_food', unit: '袋' },
  { name: '食用油', categoryId: 'c_food', unit: '瓶' },
  { name: '感冒药', categoryId: 'c_med', unit: '盒' },
  { name: '退烧药', categoryId: 'c_med', unit: '盒' },
  { name: '洗发水', categoryId: 'c_beauty', unit: '瓶' },
  { name: '口红', categoryId: 'c_beauty', unit: '支' },
  { name: '面霜', categoryId: 'c_beauty', unit: '瓶' },
  { name: '洗衣液', categoryId: 'c_clean', unit: '瓶' },
  { name: '纸巾', categoryId: 'c_clean', unit: '包' },
  { name: '电池', categoryId: 'c_electronic', unit: '节' },
  { name: '宠物粮', categoryId: 'c_pet', unit: '袋' }
]

// 示例数据：日期基于今天动态生成，覆盖各状态让首页/清单/过期页立刻有内容
function makeDemo() {
  const t = todayStr()
  return [
    {
      id: genId('it'), name: '牛奶', photos: [], categoryId: 'c_food',
      location: { room: '厨房', place: '冰箱门' }, tags: ['常备'], memberId: 'm_me',
      expiry: { enabled: false, date: '', alertDays: 3 },
      quantity: 1, unit: '盒',
      opened: { openedAt: addDays(t, -5), shelfDays: 7 },
      purchase: { date: addDays(t, -5), store: '超市', price: '15.9' },
      lowStockThreshold: 2, borrowed: { enabled: false, to: '' },
      note: '开封后冷藏', createdAt: Date.now()
    },
    {
      id: genId('it'), name: '酸奶', photos: [], categoryId: 'c_food',
      location: { room: '厨房', place: '冰箱上层' }, tags: [], memberId: 'm_me',
      expiry: { enabled: true, date: addDays(t, -2), alertDays: 3 },
      quantity: 4, unit: '杯',
      opened: { openedAt: '', shelfDays: 0 },
      purchase: { date: '', store: '便利店', price: '20' },
      lowStockThreshold: null, borrowed: { enabled: false, to: '' },
      note: '', createdAt: Date.now() + 1
    },
    {
      id: genId('it'), name: '感冒药', photos: [], categoryId: 'c_med',
      location: { room: '客厅', place: '药箱' }, tags: ['家庭药箱'], memberId: 'm_me',
      expiry: { enabled: true, date: addDays(t, 180), alertDays: 14 },
      quantity: 2, unit: '盒',
      opened: { openedAt: '', shelfDays: 0 },
      purchase: { date: '', store: '药房', price: '36' },
      lowStockThreshold: null, borrowed: { enabled: false, to: '' },
      note: '', createdAt: Date.now() + 2
    },
    {
      id: genId('it'), name: '螺丝刀', photos: [], categoryId: 'c_tool',
      location: { room: '客厅', place: '抽屉' }, tags: [], memberId: 'm_me',
      expiry: { enabled: false, date: '', alertDays: 3 },
      quantity: 1, unit: '把',
      opened: { openedAt: '', shelfDays: 0 },
      purchase: { date: '', store: '', price: '' },
      lowStockThreshold: null, borrowed: { enabled: true, to: '老王' },
      note: '', createdAt: Date.now() + 3
    },
    {
      id: genId('it'), name: '洗衣液', photos: [], categoryId: 'c_clean',
      location: { room: '阳台', place: '洗衣机旁' }, tags: [], memberId: 'm_me',
      expiry: { enabled: false, date: '', alertDays: 3 },
      quantity: 0, unit: '瓶',
      opened: { openedAt: '', shelfDays: 0 },
      purchase: { date: '', store: '京东', price: '39.9' },
      lowStockThreshold: 1, borrowed: { enabled: false, to: '' },
      note: '', createdAt: Date.now() + 4
    },
    {
      id: genId('it'), name: '口红', photos: [], categoryId: 'c_beauty',
      location: { room: '卧室', place: '梳妆台' }, tags: [], memberId: 'm_me',
      expiry: { enabled: false, date: '', alertDays: 3 },
      quantity: 3, unit: '支',
      opened: { openedAt: '', shelfDays: 0 },
      purchase: { date: addDays(t, -60), store: '专柜', price: '199' },
      lowStockThreshold: null, borrowed: { enabled: false, to: '' },
      note: '', createdAt: Date.now() + 5
    },
    {
      id: genId('it'), name: '护照', photos: [], categoryId: 'c_doc',
      location: { room: '书房', place: '抽屉' }, tags: ['重要证件'], memberId: 'm_me',
      expiry: { enabled: false, date: '', alertDays: 3 },
      quantity: 1, unit: '本',
      opened: { openedAt: '', shelfDays: 0 },
      purchase: { date: '', store: '', price: '' },
      lowStockThreshold: null, borrowed: { enabled: false, to: '' },
      note: '', createdAt: Date.now() + 6
    }
  ]
}

// 仅当当前空间物品为空时写入示例数据（打 demo 标记便于清空），返回写入件数
function seedDemoItems(spaceId) {
  const sid = spaceId || store.getCurrentSpaceId()
  const exists = store.getItems().some((it) => it.spaceId === sid)
  if (exists) return 0
  const demo = makeDemo().map((it) => Object.assign({}, it, { spaceId: sid, demo: true }))
  demo.sort((a, b) => a.createdAt - b.createdAt)
  store.saveItems(store.getItems().concat(demo))
  return demo.length
}

// 清空示例数据，返回删除件数
function clearDemoItems() {
  const demo = store.getItems().filter((it) => it.demo)
  if (!demo.length) return 0
  store.saveItems(store.getItems().filter((it) => !it.demo))
  return demo.length
}

module.exports = { TEMPLATES, seedDemoItems, clearDemoItems }
