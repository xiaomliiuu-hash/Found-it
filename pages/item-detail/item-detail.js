const store = require('../../utils/store')
const theme = require('../../utils/theme')
const { todayStr, getExpiryStatus, getRemainingDays, formatRemaining, getEffectiveExpiry } = require('../../utils/date')

Page({
  data: {
    id: '',
    item: null,
    category: null,
    member: null,
    status: 'none',
    expiryText: '',
    expirySourceHint: '',
    quantityText: '',
    openedText: '',
    purchaseText: '',
    lowStockText: '',
    borrowedText: '',
    themeStyle: '',
    rooms: [],
    borrowedActive: false,
    // 移动位置浮层
    showMove: false,
    moveRoom: '',
    movePlace: ''
  },

  onLoad(options) {
    this.setData({ id: options.id || '' })
  },

  onShow() {
    this.setData({ themeStyle: theme.getThemeStyle() })
    this.refresh()
  },

  refresh() {
    const item = store.getItemById(this.data.id)
    if (!item) {
      wx.showToast({ title: '物品不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }

    const categories = store.getCategories()
    const members = store.getMembers()
    const category = categories.find((c) => c.id === item.categoryId) || null
    const member = members.find((m) => m.id === item.memberId) || null

    const today = todayStr()
    const status = getExpiryStatus(item, today)
    let expiryText = ''
    let expirySourceHint = ''
    const eff = getEffectiveExpiry(item)
    if (eff) {
      const days = getRemainingDays(item, today)
      expiryText = eff.date + ' · ' + formatRemaining(days)
      if (eff.source === 'opened') expirySourceHint = '按开封后保质期'
    }

    const quantityText = (typeof item.quantity === 'number') ? (item.quantity + (item.unit ? ' ' + item.unit : '')) : ''
    let openedText = ''
    if (item.opened && item.opened.openedAt) {
      openedText = item.opened.openedAt + (item.opened.shelfDays ? ' · 开封后 ' + item.opened.shelfDays + ' 天' : '')
    }
    let purchaseText = ''
    if (item.purchase) {
      const parts = []
      if (item.purchase.date) parts.push(item.purchase.date)
      if (item.purchase.store) parts.push(item.purchase.store)
      if (item.purchase.price) parts.push('¥' + item.purchase.price)
      purchaseText = parts.join(' · ')
    }
    const lowStockText = (typeof item.lowStockThreshold === 'number') ? ('低于 ' + item.lowStockThreshold + ' 件提醒') : ''
    let borrowedText = ''
    if (item.borrowed && item.borrowed.enabled) {
      borrowedText = item.borrowed.to ? ('借给 ' + item.borrowed.to) : '已借出'
    }

    this.setData({
      item, category, member, status,
      expiryText, expirySourceHint, quantityText,
      openedText, purchaseText, lowStockText, borrowedText,
      rooms: store.getRooms(item.spaceId),
      borrowedActive: !!(item.borrowed && item.borrowed.enabled)
    })
  },

  preview(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.item.photos })
  },

  goEdit() {
    wx.navigateTo({ url: '/pages/item-edit/item-edit?id=' + this.data.id })
  },

  // ---- 四大操作 ----
  onMove() {
    const item = this.data.item
    this.setData({
      showMove: true,
      moveRoom: (item.location && item.location.room) || '',
      movePlace: (item.location && item.location.place) || ''
    })
  },
  onMoveClose() { this.setData({ showMove: false }) },
  noop() {},
  onPickRoom(e) { this.setData({ moveRoom: e.currentTarget.dataset.room }) },
  onMovePlace(e) { this.setData({ movePlace: e.detail.value }) },
  onMoveConfirm() {
    const room = this.data.moveRoom.trim()
    const place = this.data.movePlace.trim()
    if (!room && !place) {
      wx.showToast({ title: '请填写位置', icon: 'none' })
      return
    }
    store.updateItem(this.data.id, { location: { room, place } })
    this.setData({ showMove: false })
    wx.showToast({ title: '已移动位置', icon: 'success' })
    this.refresh()
  },

  onBorrow() {
    const item = this.data.item
    if (item.borrowed && item.borrowed.enabled) {
      store.updateItem(this.data.id, { borrowed: { enabled: false, to: '' } })
      wx.showToast({ title: '已归还', icon: 'success' })
      this.refresh()
      return
    }
    wx.showModal({
      title: '借给谁',
      editable: true,
      placeholderText: '如：同事小李',
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          store.updateItem(this.data.id, { borrowed: { enabled: true, to: res.content.trim() } })
          wx.showToast({ title: '已标记借出', icon: 'success' })
          this.refresh()
        }
      }
    })
  },

  onUseUp() {
    const item = this.data.item
    if (typeof item.quantity === 'number' && item.quantity === 0) {
      wx.showToast({ title: '已经是用完状态', icon: 'none' })
      return
    }
    store.updateItem(this.data.id, { quantity: 0 })
    wx.showToast({ title: '已标记用完', icon: 'success' })
    this.refresh()
  },

  onDiscard() {
    const item = this.data.item
    wx.showModal({
      title: '丢弃物品',
      content: '「' + item.name + '」将移入回收站，可随时恢复。',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          store.deleteItem(item.id)
          wx.navigateBack()
        }
      }
    })
  },

  onArchive() {
    const item = this.data.item
    const next = !item.archived
    store.archiveItem(item.id, next)
    wx.showToast({ title: next ? '已归档，不再提醒' : '已取消归档', icon: 'none' })
    this.refresh()
  }
})
