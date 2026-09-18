const store = require('../../utils/store')
const theme = require('../../utils/theme')
const { genId } = require('../../utils/id')
const { exportCsvFile, buildCsv } = require('../../utils/csv')
const { clearDemoItems } = require('../../utils/templates')

const MEMBER_COLORS = ['#FF7A45', '#5B8DEF', '#4ECDC4', '#F5A623', '#9B59B6', '#FF6B6B']
const ALERT_OPTIONS = [1, 2, 3, 5, 7, 14, 30]
const SPACE_ICONS = ['🏠', '🏢', '🚗', '🏡', '🏬', '🎒']

Page({
  data: {
    members: [],
    categories: [],
    rooms: [],
    spaces: [],
    currentSpaceId: '',
    itemCount: 0,
    trashCount: 0,
    demoCount: 0,
    storageInfo: '',
    notifyEnabled: true,
    themeColor: '#FF7A45',
    themeStyle: '',
    themes: theme.THEMES,
    alertOptions: ALERT_OPTIONS,
    alertIndex: 2
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    this.refresh()
  },

  refresh() {
    const members = store.getMembers()
    const categories = store.getCategories()
    const spaces = store.getSpaces()
    const currentSpaceId = store.getCurrentSpaceId()
    const rooms = store.getRooms(currentSpaceId)
    const settings = store.getSettings()
    const items = store.getItems()
    const itemCount = items.filter((it) => !it.archived).length
    const trashCount = store.getTrash().length
    const demoCount = items.filter((it) => it.demo).length
    let storageInfo = ''
    try {
      const info = wx.getStorageInfoSync()
      storageInfo = (info.currentSize / 1024).toFixed(1) + ' KB / ' + Math.round(info.limitSize / 1024) + ' KB'
    } catch (e) {}

    const alertDays = settings.defaultAlertDays || 3
    const alertIndex = Math.max(0, ALERT_OPTIONS.indexOf(alertDays))

    this.setData({
      members,
      categories,
      spaces,
      currentSpaceId,
      rooms,
      itemCount,
      trashCount,
      demoCount,
      storageInfo,
      notifyEnabled: settings.notifyEnabled !== false,
      themeColor: theme.getThemeColor(),
      themeStyle: theme.getThemeStyle(),
      alertIndex
    })
  },

  // ---- 空间 ----
  addSpace() {
    wx.showModal({
      title: '新增空间',
      editable: true,
      placeholderText: '空间名，如：办公室',
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const name = res.content.trim()
          const icon = SPACE_ICONS[store.getSpaces().length % SPACE_ICONS.length]
          store.addSpace({ id: genId('sp'), name, icon })
          this.refresh()
        }
      }
    })
  },
  switchSpace(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.currentSpaceId) return
    store.setCurrentSpaceId(id)
    this.refresh()
  },
  deleteSpace(e) {
    const id = e.currentTarget.dataset.id
    const sp = store.getSpaceById(id)
    if (!sp) return
    if (store.getSpaces().length <= 1) {
      wx.showToast({ title: '至少保留一个空间', icon: 'none' })
      return
    }
    const n = store.getItems().filter((it) => it.spaceId === id).length
    wx.showModal({
      title: '删除空间',
      content: n > 0 ? ('「' + sp.name + '」下有 ' + n + ' 件物品，删除后物品将移入回收站。') : ('确定删除「' + sp.name + '」吗？'),
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          store.deleteSpace(id)
          this.refresh()
        }
      }
    })
  },

  // ---- 成员 ----
  addMember() {
    wx.showModal({
      title: '添加成员',
      editable: true,
      placeholderText: '成员名字，如：妈妈',
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const name = res.content.trim()
          const color = MEMBER_COLORS[this.data.members.length % MEMBER_COLORS.length]
          store.addMember({ id: genId('m'), name, color })
          this.refresh()
        }
      }
    })
  },
  removeMember(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.members.length <= 1) {
      wx.showToast({ title: '至少保留一个成员', icon: 'none' })
      return
    }
    const m = this.data.members.find((x) => x.id === id)
    wx.showModal({
      title: '删除成员',
      content: '确定删除「' + (m && m.name) + '」吗？',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          store.deleteMember(id)
          this.refresh()
        }
      }
    })
  },

  // ---- 分类 ----
  addCategory() {
    wx.navigateTo({ url: '/pages/category-edit/category-edit' })
  },
  editCategory(e) {
    wx.navigateTo({ url: '/pages/category-edit/category-edit?id=' + e.currentTarget.dataset.id })
  },

  // ---- 房间/位置（当前空间）----
  addRoom() {
    wx.showModal({
      title: '添加房间',
      editable: true,
      placeholderText: '房间名，如：地下室',
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          store.addRoom(this.data.currentSpaceId, res.content.trim())
          this.refresh()
        }
      }
    })
  },
  removeRoom(e) {
    const room = e.currentTarget.dataset.room
    wx.showModal({
      title: '删除房间',
      content: '确定删除「' + room + '」吗？已记录该房间的物品不受影响。',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          store.deleteRoom(this.data.currentSpaceId, room)
          this.refresh()
        }
      }
    })
  },

  // ---- 回收站 / 示例数据 ----
  goTrash() {
    wx.navigateTo({ url: '/pages/trash/trash' })
  },
  clearDemo() {
    const n = this.data.demoCount
    if (!n) return
    wx.showModal({
      title: '清空示例数据',
      content: '将删除 ' + n + ' 件示例物品，不影响你手动添加的物品。',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          clearDemoItems()
          this.refresh()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  // ---- 通知 ----
  onNotifySwitch(e) {
    const s = store.getSettings()
    s.notifyEnabled = e.detail.value
    store.saveSettings(s)
    this.setData({ notifyEnabled: e.detail.value })
  },
  onAlertChange(e) {
    const i = Number(e.detail.value)
    const s = store.getSettings()
    s.defaultAlertDays = ALERT_OPTIONS[i]
    store.saveSettings(s)
    this.setData({ alertIndex: i })
  },

  // ---- 主题 ----
  onTheme(e) {
    const color = e.currentTarget.dataset.color
    const s = store.getSettings()
    s.themeColor = color
    store.saveSettings(s)
    this.setData({ themeColor: color, themeStyle: theme.getThemeStyle() })
    theme.apply()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ themeStyle: theme.getThemeStyle() })
    }
  },

  replayGuide() {
    const s = store.getSettings()
    s.onboarded = false
    store.saveSettings(s)
    wx.switchTab({ url: '/pages/home/home' })
  },

  // ---- 数据 ----
  exportCsv() {
    wx.showLoading({ title: '生成中' })
    exportCsvFile().then((filePath) => {
      wx.hideLoading()
      wx.showActionSheet({
        itemList: ['发送到微信保存', '复制到剪贴板'],
        success: (r) => {
          if (r.tapIndex === 0) {
            wx.shareFileMessage({
              filePath,
              fileName: '找到噜_备份.csv',
              fail: () => wx.showToast({ title: '分享失败', icon: 'none' })
            })
          } else {
            wx.setClipboardData({ data: buildCsv(), success: () => wx.showToast({ title: '已复制', icon: 'success' }) })
          }
        }
      })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '生成失败', icon: 'none' })
    })
  },
  exportJson() {
    const data = {
      version: 1,
      exportedAt: Date.now(),
      items: store.getItems(),
      members: store.getMembers(),
      categories: store.getCategories(),
      rooms: store.getRooms(store.getCurrentSpaceId()),
      spaces: store.getSpaces(),
      settings: store.getSettings()
    }
    wx.setClipboardData({ data: JSON.stringify(data), success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' }) })
  },
  importJson() {
    wx.getClipboardData({
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (!data || !Array.isArray(data.items)) throw new Error('invalid')
          wx.showModal({
            title: '导入数据',
            content: '将导入 ' + data.items.length + ' 件物品，覆盖当前数据（照片文件不会导入）。继续？',
            confirmColor: '#FF7A45',
            success: (r) => {
              if (r.confirm) {
                store.saveItems(data.items || [])
                if (Array.isArray(data.members) && data.members.length) store.saveMembers(data.members)
                if (Array.isArray(data.categories) && data.categories.length) store.saveCategories(data.categories)
                if (Array.isArray(data.spaces) && data.spaces.length) store.saveSpaces(data.spaces)
                if (data.settings) store.saveSettings(data.settings)
                this.refresh()
                theme.apply()
                wx.showToast({ title: '导入成功', icon: 'success' })
              }
            }
          })
        } catch (e) {
          wx.showToast({ title: '剪贴板不是有效数据', icon: 'none' })
        }
      },
      fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
    })
  }
})
