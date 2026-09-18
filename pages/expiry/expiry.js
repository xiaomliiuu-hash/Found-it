const store = require('../../utils/store')
const { todayStr, getExpiryStatus, getRemainingDays } = require('../../utils/date')
const theme = require('../../utils/theme')

Page({
  data: {
    expired: [],
    soon: [],
    expiredCount: 0,
    soonCount: 0,
    themeStyle: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.setData({ themeStyle: theme.getThemeStyle() })
    this.refresh()
  },

  refresh() {
    const today = todayStr()
    const items = store.getItems().filter((it) => it.spaceId === store.getCurrentSpaceId() && !it.archived)
    const categories = store.getCategories()
    const members = store.getMembers()

    const catMap = {}
    const memMap = {}
    categories.forEach((c) => { catMap[c.id] = c })
    members.forEach((m) => { memMap[m.id] = m })

    const expired = []
    const soon = []

    items.forEach((it) => {
      const s = getExpiryStatus(it, today)
      if (s === 'none') return
      const enr = {
        ...it,
        _category: catMap[it.categoryId] || null,
        _member: memMap[it.memberId] || null,
        _days: getRemainingDays(it, today)
      }
      if (s === 'expired') expired.push(enr)
      else soon.push(enr)
    })

    // 已过期：过期越久越靠前；即将过期：越临近越靠前
    expired.sort((a, b) => a._days - b._days)
    soon.sort((a, b) => a._days - b._days)

    this.setData({
      expired,
      soon,
      expiredCount: expired.length,
      soonCount: soon.length
    })
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/item-detail/item-detail?id=' + e.detail.id })
  },

  onArchiveAll() {
    const n = this.data.expired.length
    if (!n) return
    wx.showModal({
      title: '一键归档',
      content: '将 ' + n + ' 件已过期物品归档，归档后不再首页提醒（可在首页「已归档」查看）。',
      confirmColor: '#54684F',
      success: (res) => {
        if (res.confirm) {
          this.data.expired.forEach((it) => store.archiveItem(it.id, true))
          wx.showToast({ title: '已归档 ' + n + ' 件', icon: 'success' })
          this.refresh()
        }
      }
    })
  }
})
