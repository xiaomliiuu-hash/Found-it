const store = require('../../utils/store')
const theme = require('../../utils/theme')
const { genId } = require('../../utils/id')

const EMOJIS = ['📦', '🍎', '🥦', '🍞', '🥛', '🍶', '💊', '💄', '🧴', '👕', '👟', '🧥', '🔧', '🔨', '🔌', '💡', '📱', '💻', '📚', '📄', '🧹', '🧺', '🍼', '🐾', '⚽', '🏀', '🎨', '💍', '🎁', '🧸', '🔑', '✂️', '🧵', '🌿', '🍵', '🥫', '🧊', '🧃', '🛠️', '🖊️']
const COLORS = ['#FF6B6B', '#FF7A45', '#F5A623', '#FFD23F', '#5B8DEF', '#4ECDC4', '#3FB68B', '#2D9C4E', '#9B59B6', '#E91E8C', '#00B4D8', '#8D6E63', '#7F8C8D', '#BDC3C7']

Page({
  data: {
    id: '',
    isEdit: false,
    name: '',
    icon: '📦',
    color: '#FF7A45',
    emojis: EMOJIS,
    colors: COLORS,
    themeStyle: ''
  },

  onLoad(options) {
    this.setData({ themeStyle: theme.getThemeStyle() })
    if (options.id) {
      const c = store.getCategoryById(options.id)
      if (c) {
        this.setData({ id: options.id, isEdit: true, name: c.name, icon: c.icon || '📦', color: c.color || '#FF7A45' })
        wx.setNavigationBarTitle({ title: '编辑分类' })
      }
    } else {
      wx.setNavigationBarTitle({ title: '新建分类' })
    }
  },

  onName(e) {
    this.setData({ name: e.detail.value })
  },
  onIcon(e) {
    this.setData({ icon: e.currentTarget.dataset.icon })
  },
  onColor(e) {
    this.setData({ color: e.currentTarget.dataset.color })
  },

  save() {
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '请填写分类名', icon: 'none' })
      return
    }
    if (this.data.isEdit) {
      store.updateCategory(this.data.id, { name, icon: this.data.icon, color: this.data.color })
    } else {
      store.addCategory({ id: genId('c'), name, icon: this.data.icon, color: this.data.color })
    }
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  },

  onDelete() {
    const id = this.data.id
    const count = store.getItems().filter((it) => it.categoryId === id).length
    if (count === 0) {
      wx.showModal({
        title: '删除分类',
        content: '确定删除「' + this.data.name + '」吗？',
        confirmColor: '#FF4D4F',
        success: (res) => {
          if (res.confirm) {
            store.deleteCategory(id)
            wx.navigateBack()
          }
        }
      })
      return
    }
    wx.showModal({
      title: '删除分类',
      content: '该分类下有 ' + count + ' 件物品，删除后如何处理？',
      confirmText: '继续',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (!res.confirm) return
        wx.showActionSheet({
          itemList: ['移动到其他分类', '变为未分类'],
          success: (r) => {
            if (r.tapIndex === 0) this.moveAndDelete(id)
            else this.deleteUncategorized(id)
          }
        })
      }
    })
  },

  moveAndDelete(id) {
    const targets = store.getCategories().filter((c) => c.id !== id)
    if (!targets.length) {
      this.deleteUncategorized(id)
      return
    }
    wx.showActionSheet({
      itemList: targets.map((c) => c.icon + ' ' + c.name),
      success: (r) => {
        const to = targets[r.tapIndex]
        if (!to) return
        store.reassignCategory(id, to.id)
        store.deleteCategory(id)
        wx.showToast({ title: '已移动并删除', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      }
    })
  },

  deleteUncategorized(id) {
    store.reassignCategory(id, '')
    store.deleteCategory(id)
    wx.showToast({ title: '已删除', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  }
})
