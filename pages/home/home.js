const store = require('../../utils/store')
const { todayStr, getExpiryStatus, getRemainingDays } = require('../../utils/date')
const theme = require('../../utils/theme')
const { computeStats, formatMoney } = require('../../utils/stats')
const { seedDemoItems } = require('../../utils/templates')
const { genId } = require('../../utils/id')
const voice = require('../../utils/voice')
const voiceParse = require('../../utils/voiceParse')

const SPACE_ICONS = ['🏠', '🏢', '🚗', '🏡', '🏬', '🎒']

// 子序列模糊匹配：needle 字符按顺序出现在 hay 中即命中
function isSubsequence(needle, hay) {
  let i = 0
  for (let j = 0; j < hay.length && i < needle.length; j++) {
    if (hay[j] === needle[i]) i++
  }
  return i === needle.length
}

// 多关键词 AND：空格分词，每个词需子串或子序列命中
function matchTokens(hay, key) {
  const tokens = key.split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  return tokens.every((t) => hay.indexOf(t) >= 0 || isSubsequence(t, hay))
}

Page({
  data: {
    items: [],
    archivedItems: [],
    viewItems: [],
    roomGroups: [],
    members: [],
    categories: [],
    spaces: [],
    currentSpaceId: '',
    currentSpaceName: '',
    searchKey: '',
    searchFocus: false,
    searchHistory: [],
    filterCategoryId: '',
    filterMemberId: '',
    filterQuick: '',
    viewMode: 'list',
    // 统计
    totalCount: 0,
    soonCount: 0,
    expiredCount: 0,
    valueText: '',
    categoryDist: [],
    // 到期提醒
    soonestName: '',
    soonestDaysText: '',
    notifyEnabled: true,
    themeStyle: '',
    showOnboarding: false,
    // 语音录入
    voiceOpen: false,
    recording: false,
    voiceText: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.refresh()
  },

  refresh() {
    const spaces = store.getSpaces()
    const currentSpaceId = store.getCurrentSpaceId()
    const items = store.getItems().filter((it) => it.spaceId === currentSpaceId && !it.archived)
    const archivedItems = store.getItems().filter((it) => it.spaceId === currentSpaceId && it.archived)
    const members = store.getMembers()
    const categories = store.getCategories()
    const settings = store.getSettings()
    const today = todayStr()
    const currentSpace = spaces.find((s) => s.id === currentSpaceId)

    const stats = computeStats(items, categories)

    const soonItems = items
      .filter((it) => getExpiryStatus(it, today) === 'soon')
      .sort((a, b) => getRemainingDays(a, today) - getRemainingDays(b, today))
    let soonestName = ''
    let soonestDaysText = ''
    if (soonItems.length) {
      soonestName = soonItems[0].name
      const d = getRemainingDays(soonItems[0], today)
      soonestDaysText = d === 0 ? '今天到期' : (d + ' 天后过期')
    }

    this.setData({
      items,
      archivedItems,
      members,
      categories,
      spaces,
      currentSpaceId,
      currentSpaceName: currentSpace ? currentSpace.name : '我的家',
      searchHistory: store.getSearchHistory(),
      totalCount: stats.totalCount,
      soonCount: stats.soonCount,
      expiredCount: stats.expiredCount,
      valueText: stats.valueCount > 0 ? formatMoney(stats.value) : '',
      categoryDist: stats.categoryDist,
      soonestName,
      soonestDaysText,
      notifyEnabled: settings.notifyEnabled !== false,
      themeStyle: theme.getThemeStyle(),
      showOnboarding: settings.onboarded !== true
    })
    this.applyFilter()
  },

  applyFilter() {
    const { items, archivedItems, searchKey, filterCategoryId, filterMemberId, filterQuick, categories, members } = this.data
    const source = filterQuick === 'archived' ? archivedItems : items
    const key = searchKey.trim().toLowerCase()
    const today = todayStr()
    const catMap = {}
    const memMap = {}
    categories.forEach((c) => { catMap[c.id] = c })
    members.forEach((m) => { memMap[m.id] = m })

    const viewItems = source
      .filter((it) => {
        if (filterCategoryId && it.categoryId !== filterCategoryId) return false
        if (filterMemberId && it.memberId !== filterMemberId) return false
        if (filterQuick === 'soon' && getExpiryStatus(it, today) !== 'soon') return false
        if (filterQuick === 'lowstock' && !store.isLowStock(it)) return false
        if (filterQuick === 'borrowed' && !(it.borrowed && it.borrowed.enabled)) return false
        if (key) {
          const cat = catMap[it.categoryId]
          const mem = memMap[it.memberId]
          const hay = [
            it.name,
            it.location && it.location.room,
            it.location && it.location.place,
            (it.tags || []).join(' '),
            cat ? cat.name : '',
            mem ? mem.name : '',
            it.unit,
            it.note,
            it.purchase && it.purchase.store,
            it.borrowed && it.borrowed.to,
            it.expiry && it.expiry.date,
            it.opened && it.opened.openedAt
          ].join(' ').toLowerCase()
          if (!matchTokens(hay, key)) return false
        }
        return true
      })
      .map((it) => ({
        ...it,
        _category: catMap[it.categoryId] || null,
        _member: memMap[it.memberId] || null
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    // 按房间分组（无房间归「未设置位置」垫底，其余按件数降序）
    const groupMap = {}
    const order = []
    viewItems.forEach((it) => {
      const room = (it.location && it.location.room) || '未设置位置'
      if (!groupMap[room]) {
        groupMap[room] = { room, items: [] }
        order.push(room)
      }
      groupMap[room].items.push(it)
    })
    const others = order
      .filter((r) => r !== '未设置位置')
      .map((r) => groupMap[r])
      .sort((a, b) => b.items.length - a.items.length)
    const noRoom = groupMap['未设置位置']
    const roomGroups = noRoom ? others.concat([noRoom]) : others

    this.setData({ viewItems, roomGroups })
  },

  // ---- 搜索 ----
  onSearchInput(e) {
    this.setData({ searchKey: e.detail.value })
    this.applyFilter()
  },
  onSearchFocus() {
    this.setData({ searchFocus: true })
  },
  onSearchBlur() {
    setTimeout(() => this.setData({ searchFocus: false }), 200)
  },
  onSearchConfirm() {
    const key = this.data.searchKey.trim()
    if (key) {
      store.addSearchHistory(key)
      this.setData({ searchHistory: store.getSearchHistory() })
    }
  },
  onHistoryTap(e) {
    const term = e.currentTarget.dataset.term
    this.setData({ searchKey: term, searchFocus: false })
    this.applyFilter()
  },
  clearHistory() {
    store.clearSearchHistory()
    this.setData({ searchHistory: [] })
  },

  // ---- 空间 ----
  onSpaceTap(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.currentSpaceId) return
    store.setCurrentSpaceId(id)
    this.refresh()
  },
  onAddSpace() {
    wx.showModal({
      title: '新增空间',
      editable: true,
      placeholderText: '空间名，如：办公室',
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const name = res.content.trim()
          const icon = SPACE_ICONS[store.getSpaces().length % SPACE_ICONS.length]
          const sp = store.addSpace({ id: genId('sp'), name, icon })
          store.setCurrentSpaceId(sp.id)
          this.refresh()
        }
      }
    })
  },

  // ---- 筛选 ----
  onFilterCategory(e) {
    this.setData({ filterCategoryId: e.currentTarget.dataset.id || '' })
    this.applyFilter()
  },
  onFilterMember(e) {
    this.setData({ filterMemberId: e.currentTarget.dataset.id || '' })
    this.applyFilter()
  },
  onFilterQuick(e) {
    const v = e.currentTarget.dataset.value || ''
    this.setData({ filterQuick: this.data.filterQuick === v ? '' : v })
    this.applyFilter()
  },
  onViewMode(e) {
    this.setData({ viewMode: e.currentTarget.dataset.mode })
  },
  onCategoryBar(e) {
    const id = e.currentTarget.dataset.id || ''
    this.setData({ filterCategoryId: this.data.filterCategoryId === id ? '' : id, filterQuick: '' })
    this.applyFilter()
  },

  onStartOnboarding() {
    const s = store.getSettings()
    s.onboarded = true
    store.saveSettings(s)
    this.setData({ showOnboarding: false })
  },

  onSeedDemo() {
    const n = seedDemoItems()
    if (n > 0) {
      const s = store.getSettings()
      s.onboarded = true
      store.saveSettings(s)
      this.setData({ showOnboarding: false })
      wx.showToast({ title: '已生成示例，可在「我的→数据」清空', icon: 'none' })
      this.refresh()
    }
  },

  noop() {},

  goAdd() {
    wx.navigateTo({ url: '/pages/item-edit/item-edit' })
  },

  // ---- 语音录入 ----
  openVoice() {
    voice.ensureRecordAuth().then((ok) => {
      if (ok) this.setData({ voiceOpen: true, recording: false, voiceText: '' })
    })
  },
  onVoiceStart() {
    try {
      voice.startRecognize({
        onRecognize: (res) => {
          if (res && res.result) this.setData({ voiceText: res.result })
        },
        onStop: (res) => this.onVoiceResult(res),
        onError: () => {
          this.setData({ recording: false })
          wx.showToast({ title: '识别失败，请重试', icon: 'none' })
        }
      })
      this.setData({ recording: true })
    } catch (e) {
      this.setData({ recording: false, voiceOpen: false })
      wx.showModal({
        title: '语音插件未添加',
        content: '请在微信公众平台「设置 → 第三方插件」添加「微信同声传译」后重试。',
        showCancel: false
      })
    }
  },
  onVoiceEnd() {
    if (!this.data.recording) return
    this.setData({ recording: false })
    voice.stopRecognize()
  },
  onVoiceResult(res) {
    const text = (res && res.result) ? String(res.result).trim() : ''
    if (!text) {
      this.setData({ recording: false })
      wx.showToast({ title: '没听清，请再说一次', icon: 'none' })
      return
    }
    const draft = voiceParse.parse(text)
    store.setVoiceDraft(draft)
    this.setData({ voiceOpen: false, recording: false, voiceText: '' })
    wx.navigateTo({ url: '/pages/item-edit/item-edit' })
  },
  onVoiceCancel() {
    this.setData({ voiceOpen: false, recording: false, voiceText: '' })
  },

  goDetail(e) {
    const key = this.data.searchKey.trim()
    if (key) store.addSearchHistory(key)
    wx.navigateTo({ url: '/pages/item-detail/item-detail?id=' + e.detail.id })
  },

  goExpiry() {
    wx.switchTab({ url: '/pages/expiry/expiry' })
  }
})
