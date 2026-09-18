const store = require('../../utils/store')
const theme = require('../../utils/theme')
const { removePhoto } = require('../../utils/file')

Page({
  data: {
    list: [],
    themeStyle: ''
  },

  onShow() {
    this.setData({ themeStyle: theme.getThemeStyle() })
    this.refresh()
  },

  refresh() {
    const catMap = {}
    store.getCategories().forEach((c) => { catMap[c.id] = c })
    const list = store.getTrash().map((t) => {
      const it = t.item
      const cat = catMap[it.categoryId]
      return {
        id: it.id,
        name: it.name,
        photo: (it.photos && it.photos[0]) || '',
        categoryIcon: cat ? cat.icon : '📦',
        room: (it.location && it.location.room) || '',
        deletedAtText: this.fmtTime(t.deletedAt)
      }
    })
    this.setData({ list })
  },

  fmtTime(ts) {
    const d = new Date(ts)
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
  },

  onRestore(e) {
    const id = e.currentTarget.dataset.id
    if (store.restoreFromTrash(id)) {
      wx.showToast({ title: '已恢复', icon: 'success' })
      this.refresh()
    }
  },

  onDeleteForever(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '彻底删除',
      content: '删除后无法恢复，照片也会一并删除。',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          const it = store.deleteFromTrash(id)
          if (it) (it.photos || []).forEach((p) => removePhoto(p))
          this.refresh()
        }
      }
    })
  },

  onEmpty() {
    if (!this.data.list.length) return
    wx.showModal({
      title: '清空回收站',
      content: '将彻底删除回收站内全部物品及照片，无法恢复。',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          const items = store.emptyTrash()
          items.forEach((it) => (it.photos || []).forEach((p) => removePhoto(p)))
          this.refresh()
        }
      }
    })
  }
})
