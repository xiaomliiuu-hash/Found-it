const store = require('../../utils/store')
const theme = require('../../utils/theme')

Page({
  data: {
    list: [],
    themeStyle: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.setData({ themeStyle: theme.getThemeStyle() })
    this.refresh()
  },

  refresh() {
    const categories = store.getCategories()
    const catMap = {}
    categories.forEach((c) => { catMap[c.id] = c })

    const list = store.getItems()
      .filter((it) => it.spaceId === store.getCurrentSpaceId() && !it.archived)
      .filter((it) => store.isLowStock(it))
      .map((it) => ({
        ...it,
        _category: catMap[it.categoryId] || null,
        _diff: it.quantity - it.lowStockThreshold,
        checked: false
      }))
      .sort((a, b) => a._diff - b._diff)

    this.setData({ list })
  },

  toggleCheck(e) {
    const id = e.currentTarget.dataset.id
    const idx = this.data.list.findIndex((x) => x.id === id)
    if (idx >= 0) {
      this.setData({ ['list[' + idx + '].checked']: !this.data.list[idx].checked })
    }
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/item-detail/item-detail?id=' + e.currentTarget.dataset.id })
  }
})
