// 本地存储统一封装：结构化数据走 storage，图片走 file.js 持久化
// 注意：storage 上限 10MB / 单 key 1MB，结构化文本远够用

const DEFAULT_CATEGORIES = [
  { id: 'c_food', name: '食品', icon: '🍎', color: '#C98B8B' },
  { id: 'c_med', name: '药品', icon: '💊', color: '#8FB2AE' },
  { id: 'c_beauty', name: '美妆', icon: '💄', color: '#C995A8' },
  { id: 'c_cloth', name: '衣物', icon: '👕', color: '#8BA0C4' },
  { id: 'c_tool', name: '工具', icon: '🔧', color: '#C9A35E' },
  { id: 'c_electronic', name: '电子', icon: '📱', color: '#A98FB8' },
  { id: 'c_clean', name: '清洁', icon: '🧹', color: '#82A9B5' },
  { id: 'c_baby', name: '母婴', icon: '🍼', color: '#C9977B' },
  { id: 'c_pet', name: '宠物', icon: '🐾', color: '#A98F76' },
  { id: 'c_appliance', name: '家电', icon: '🔌', color: '#C4B57E' },
  { id: 'c_sport', name: '运动', icon: '⚽', color: '#93B58E' },
  { id: 'c_book', name: '图书', icon: '📚', color: '#A3B88C' },
  { id: 'c_doc', name: '文件', icon: '📄', color: '#AFAFA6' },
  { id: 'c_other', name: '其他', icon: '📦', color: '#9B9B96' }
]

const DEFAULT_MEMBERS = [
  { id: 'm_me', name: '我', color: '#54684F' }
]

// 空间（顶层容器，物品按空间隔离）
const DEFAULT_SPACES = [
  { id: 'sp_home', name: '我的家', icon: '🏠' }
]

// 默认房间（"办公室"已升级为空间，不再是房间）
const DEFAULT_ROOMS = ['客厅', '卧室', '厨房', '卫生间', '阳台', '书房', '储物间', '车库', '其他']

const DEFAULT_SETTINGS = {
  defaultAlertDays: 3,
  notifyEnabled: true,
  themeColor: '#54684F',
  onboarded: false,
  currentSpaceId: 'sp_home',
  seedVersion: 4
}

// 个人资料（「本人」身份，独立于「成员」体系）
const DEFAULT_PROFILE = {
  name: '我',
  avatar: { kind: 'default', id: 'penguin' }
}

const KEYS = {
  items: 'fdl_items',
  members: 'fdl_members',
  categories: 'fdl_categories',
  rooms: 'fdl_rooms',
  spaces: 'fdl_spaces',
  trash: 'fdl_trash',
  searchHistory: 'fdl_search_history',
  settings: 'fdl_settings',
  voiceDraft: 'fdl_voice_draft',
  profile: 'fdl_profile'
}

const MAX_HISTORY = 10

function read(key, fallback) {
  try {
    const v = wx.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  wx.setStorageSync(key, value)
}

// ---------- 种子数据 ----------
function seed() {
  const settings = getSettings()
  const ver = settings.seedVersion || 0

  if (getCategories().length === 0) {
    saveCategories(DEFAULT_CATEGORIES)
  } else if (ver < 2) {
    // 一次性补增 v2 新增分类，避免覆盖用户已删除的分类
    const list = getCategories()
    const ids = list.map((c) => c.id)
    const added = DEFAULT_CATEGORIES.filter((c) => ids.indexOf(c.id) === -1)
    if (added.length) saveCategories(list.concat(added))
  }

  if (getMembers().length === 0) saveMembers(DEFAULT_MEMBERS)
  if (getSpaces().length === 0) saveSpaces(DEFAULT_SPACES)

  // 房间：v4 起按空间分桶（旧数据是全局字符串数组）
  const roomsRaw = read(KEYS.rooms, {})
  if (Array.isArray(roomsRaw)) {
    write(KEYS.rooms, { sp_home: roomsRaw.filter((r) => r !== '办公室') })
  } else if (!roomsRaw || Object.keys(roomsRaw).length === 0) {
    write(KEYS.rooms, { sp_home: DEFAULT_ROOMS })
  }

  // v4 迁移：物品补齐 spaceId / archived
  if (ver < 4) {
    const items = getItems()
    if (items.length) {
      saveItems(items.map((it) => Object.assign({}, it, {
        spaceId: it.spaceId || 'sp_home',
        archived: !!it.archived
      })))
    }
  }

  // v3：老用户已有物品则跳过新手引导，新用户默认未引导
  if (ver < 3) {
    settings.onboarded = getItems().length > 0
  }

  saveSettings(Object.assign({}, DEFAULT_SETTINGS, settings, { seedVersion: 4 }))

  // 个人资料首次初始化
  if (!read(KEYS.profile, null)) write(KEYS.profile, DEFAULT_PROFILE)
}

// ---------- 物品 ----------
function getItems() {
  return read(KEYS.items, [])
}
function saveItems(items) {
  write(KEYS.items, items)
}
function getItemById(id) {
  return getItems().find((x) => x.id === id) || null
}
function addItem(item) {
  const items = getItems()
  items.push(item)
  saveItems(items)
  return item
}
function updateItem(id, patch) {
  const items = getItems()
  const i = items.findIndex((x) => x.id === id)
  if (i >= 0) {
    items[i] = Object.assign({}, items[i], patch, { updatedAt: Date.now() })
    saveItems(items)
    return items[i]
  }
  return null
}
// 软删除：移入回收站（照片保留，直到彻底删除）
function deleteItem(id) {
  const items = getItems()
  const i = items.findIndex((x) => x.id === id)
  if (i < 0) return
  const [item] = items.splice(i, 1)
  saveItems(items)
  moveToTrash(item)
}
// 当前空间下的活跃物品（非归档）
function activeItems(spaceId) {
  const sid = spaceId || getCurrentSpaceId()
  return getItems().filter((it) => !it.archived && it.spaceId === sid)
}

// 低库存判断：有数量概念且 <= 阈值
function isLowStock(item) {
  if (!item) return false
  return typeof item.quantity === 'number' &&
    item.lowStockThreshold !== null && item.lowStockThreshold !== undefined &&
    item.quantity <= item.lowStockThreshold
}

// 用完判断：库存为 0
function isUsedUp(item) {
  if (!item) return false
  return typeof item.quantity === 'number' && item.quantity === 0
}

// 归档 / 取消归档
function archiveItem(id, archived) {
  return updateItem(id, { archived: !!archived })
}

// 分类迁移：把 fromId 分类下的物品改为 toId（toId 空串表示未分类）
function reassignCategory(fromId, toId) {
  const items = getItems()
  let n = 0
  const next = items.map((it) => {
    if (it.categoryId === fromId) {
      n++
      return Object.assign({}, it, { categoryId: toId })
    }
    return it
  })
  if (n) saveItems(next)
  return n
}

// ---------- 回收站 ----------
function getTrash() {
  return read(KEYS.trash, [])
}
function moveToTrash(item) {
  const trash = getTrash()
  trash.unshift({ item, deletedAt: Date.now() })
  write(KEYS.trash, trash)
}
function restoreFromTrash(id) {
  const trash = getTrash()
  const i = trash.findIndex((t) => t.item && t.item.id === id)
  if (i < 0) return false
  const [entry] = trash.splice(i, 1)
  write(KEYS.trash, trash)
  const items = getItems()
  items.unshift(entry.item)
  saveItems(items)
  return true
}
function deleteFromTrash(id) {
  const trash = getTrash()
  const i = trash.findIndex((t) => t.item && t.item.id === id)
  if (i < 0) return null
  const [entry] = trash.splice(i, 1)
  write(KEYS.trash, trash)
  return entry.item
}
function emptyTrash() {
  const trash = getTrash()
  write(KEYS.trash, [])
  return trash.map((t) => t.item)
}

// ---------- 空间 ----------
function getSpaces() {
  return read(KEYS.spaces, [])
}
function saveSpaces(spaces) {
  write(KEYS.spaces, spaces)
}
function getSpaceById(id) {
  return getSpaces().find((x) => x.id === id) || null
}
function addSpace(space) {
  const list = getSpaces()
  list.push(space)
  saveSpaces(list)
  return space
}
function updateSpace(id, patch) {
  const list = getSpaces()
  const i = list.findIndex((x) => x.id === id)
  if (i >= 0) {
    list[i] = Object.assign({}, list[i], patch)
    saveSpaces(list)
    return list[i]
  }
  return null
}
// 删除空间：其物品移入回收站；返回被移动的物品数
function deleteSpace(id) {
  const items = getItems()
  const spaceItems = items.filter((it) => it.spaceId === id)
  const rest = items.filter((it) => it.spaceId !== id)
  saveItems(rest)
  if (spaceItems.length) {
    const trash = getTrash()
    const now = Date.now()
    spaceItems.forEach((it) => trash.unshift({ item: it, deletedAt: now }))
    write(KEYS.trash, trash)
  }
  saveSpaces(getSpaces().filter((s) => s.id !== id))
  const s = getSettings()
  if (s.currentSpaceId === id) {
    const first = getSpaces()[0]
    s.currentSpaceId = first ? first.id : 'sp_home'
    saveSettings(s)
  }
  return spaceItems.length
}
function getCurrentSpaceId() {
  const s = getSettings()
  return s.currentSpaceId || 'sp_home'
}
function setCurrentSpaceId(id) {
  const s = getSettings()
  s.currentSpaceId = id
  saveSettings(s)
}

// ---------- 成员 ----------
function getMembers() {
  return read(KEYS.members, [])
}
function saveMembers(members) {
  write(KEYS.members, members)
}
function addMember(member) {
  const list = getMembers()
  list.push(member)
  saveMembers(list)
  return member
}
function updateMember(id, patch) {
  const list = getMembers()
  const i = list.findIndex((x) => x.id === id)
  if (i >= 0) {
    list[i] = Object.assign({}, list[i], patch)
    saveMembers(list)
  }
}
function deleteMember(id) {
  saveMembers(getMembers().filter((x) => x.id !== id))
}

// ---------- 分类 ----------
function getCategories() {
  return read(KEYS.categories, [])
}
function saveCategories(categories) {
  write(KEYS.categories, categories)
}
function getCategoryById(id) {
  return getCategories().find((x) => x.id === id) || null
}
function addCategory(category) {
  const list = getCategories()
  list.push(category)
  saveCategories(list)
  return category
}
function updateCategory(id, patch) {
  const list = getCategories()
  const i = list.findIndex((x) => x.id === id)
  if (i >= 0) {
    list[i] = Object.assign({}, list[i], patch)
    saveCategories(list)
    return list[i]
  }
  return null
}
function deleteCategory(id) {
  saveCategories(getCategories().filter((x) => x.id !== id))
}

// ---------- 房间/位置（按空间分桶）----------
function getRooms(spaceId) {
  const sid = spaceId || getCurrentSpaceId()
  const v = read(KEYS.rooms, {})
  if (Array.isArray(v)) return v // 兼容：极端情况下未迁移
  return v[sid] || []
}
function saveRooms(spaceId, rooms) {
  const v = read(KEYS.rooms, {})
  const map = Array.isArray(v) ? {} : v
  map[spaceId] = rooms
  write(KEYS.rooms, map)
}
function addRoom(spaceId, room) {
  const list = getRooms(spaceId)
  if (list.indexOf(room) === -1) {
    list.push(room)
    saveRooms(spaceId, list)
  }
  return list
}
function deleteRoom(spaceId, room) {
  saveRooms(spaceId, getRooms(spaceId).filter((r) => r !== room))
}

// ---------- 搜索历史 ----------
function getSearchHistory() {
  return read(KEYS.searchHistory, [])
}
function addSearchHistory(term) {
  const t = String(term || '').trim()
  if (!t) return
  let list = getSearchHistory().filter((x) => x !== t)
  list.unshift(t)
  if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY)
  write(KEYS.searchHistory, list)
}
function clearSearchHistory() {
  write(KEYS.searchHistory, [])
}

// ---------- 设置 ----------
function getSettings() {
  return read(KEYS.settings, DEFAULT_SETTINGS)
}
function saveSettings(settings) {
  write(KEYS.settings, settings)
}

// ---------- 个人资料 ----------
function getProfile() {
  const p = read(KEYS.profile, null)
  if (!p || typeof p !== 'object') return { name: DEFAULT_PROFILE.name, avatar: DEFAULT_PROFILE.avatar }
  return {
    name: typeof p.name === 'string' ? p.name : DEFAULT_PROFILE.name,
    avatar: (p.avatar && p.avatar.kind) ? p.avatar : DEFAULT_PROFILE.avatar
  }
}
function saveProfile(profile) {
  write(KEYS.profile, profile)
}

// ---------- 语音录入草稿（一次性传递，消费即清）----------
function getVoiceDraft() {
  return read(KEYS.voiceDraft, null)
}
function setVoiceDraft(draft) {
  write(KEYS.voiceDraft, draft)
}
function clearVoiceDraft() {
  try { wx.removeStorageSync(KEYS.voiceDraft) } catch (e) {}
}

module.exports = {
  seed,
  getItems,
  saveItems,
  getItemById,
  addItem,
  updateItem,
  deleteItem,
  activeItems,
  isLowStock,
  isUsedUp,
  archiveItem,
  reassignCategory,
  getTrash,
  moveToTrash,
  restoreFromTrash,
  deleteFromTrash,
  emptyTrash,
  getSpaces,
  saveSpaces,
  getSpaceById,
  addSpace,
  updateSpace,
  deleteSpace,
  getCurrentSpaceId,
  setCurrentSpaceId,
  getMembers,
  saveMembers,
  addMember,
  updateMember,
  deleteMember,
  getCategories,
  saveCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  getRooms,
  saveRooms,
  addRoom,
  deleteRoom,
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  getSettings,
  saveSettings,
  getProfile,
  saveProfile,
  getVoiceDraft,
  setVoiceDraft,
  clearVoiceDraft
}
