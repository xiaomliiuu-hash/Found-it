const store = require('../../utils/store')
const theme = require('../../utils/theme')
const { genId } = require('../../utils/id')
const { savePhoto, removePhoto } = require('../../utils/file')
const { todayStr, daysBetween, formatRemaining, getEffectiveExpiry } = require('../../utils/date')
const { TEMPLATES } = require('../../utils/templates')

const ALERT_OPTIONS = [1, 2, 3, 5, 7, 14, 30]
const UNITS = ['件', '盒', '瓶', '包', '个', '袋', '斤', '支', '罐']

function emptyForm() {
  return {
    name: '',
    photos: [],
    room: '',
    place: '',
    categoryId: '',
    spaceId: '',
    tags: [],
    memberId: '',
    expiryEnabled: false,
    date: '',
    alertDays: 3,
    quantity: '',
    unit: '',
    openedAt: '',
    shelfDays: '',
    purchaseDate: '',
    purchaseStore: '',
    purchasePrice: '',
    lowStockThreshold: '',
    borrowedEnabled: false,
    borrowedTo: '',
    note: ''
  }
}

Page({
  data: {
    id: '',
    isEdit: false,
    categories: [],
    members: [],
    rooms: [],
    spaces: [],
    spaceIndex: 0,
    units: UNITS,
    alertOptions: ALERT_OPTIONS,
    alertIndex: 2,
    form: emptyForm(),
    tagInput: '',
    remainingText: '',
    remainingClass: '',
    openedHint: false,
    templates: TEMPLATES,
    themeColor: '#54684F',
    themeStyle: '',
    // 分类浮层
    showCategoryPicker: false
  },

  onLoad(options) {
    this.setData({ themeColor: theme.getThemeColor(), themeStyle: theme.getThemeStyle() })
    const categories = store.getCategories()
    const members = store.getMembers()
    const spaces = store.getSpaces()
    const currentSpaceId = store.getCurrentSpaceId()
    const spaceIndex = Math.max(0, spaces.findIndex((s) => s.id === currentSpaceId))
    const rooms = store.getRooms(currentSpaceId)
    const settings = store.getSettings()
    const defaultAlertDays = settings.defaultAlertDays || 3
    const alertIndex = Math.max(0, ALERT_OPTIONS.indexOf(defaultAlertDays))

    if (options.id) {
      const item = store.getItemById(options.id)
      if (item) {
        const sid = item.spaceId || currentSpaceId
        const idx = Math.max(0, spaces.findIndex((s) => s.id === sid))
        const form = {
          name: item.name || '',
          photos: item.photos || [],
          room: (item.location && item.location.room) || '',
          place: (item.location && item.location.place) || '',
          categoryId: item.categoryId || '',
          spaceId: sid,
          tags: item.tags || [],
          memberId: item.memberId || '',
          expiryEnabled: !!(item.expiry && item.expiry.enabled),
          date: (item.expiry && item.expiry.date) || '',
          alertDays: (item.expiry && item.expiry.alertDays) || defaultAlertDays,
          quantity: (typeof item.quantity === 'number') ? String(item.quantity) : '',
          unit: item.unit || '',
          openedAt: (item.opened && item.opened.openedAt) || '',
          shelfDays: (item.opened && item.opened.shelfDays) ? String(item.opened.shelfDays) : '',
          purchaseDate: (item.purchase && item.purchase.date) || '',
          purchaseStore: (item.purchase && item.purchase.store) || '',
          purchasePrice: (item.purchase && item.purchase.price !== null && item.purchase.price !== undefined) ? String(item.purchase.price) : '',
          lowStockThreshold: (typeof item.lowStockThreshold === 'number') ? String(item.lowStockThreshold) : '',
          borrowedEnabled: !!(item.borrowed && item.borrowed.enabled),
          borrowedTo: (item.borrowed && item.borrowed.to) || '',
          note: item.note || ''
        }
        const ai = Math.max(0, ALERT_OPTIONS.indexOf(form.alertDays))
        this.setData({
          id: options.id, isEdit: true, form, alertIndex: ai,
          categories, members, spaces, spaceIndex: idx, rooms: store.getRooms(sid)
        })
        wx.setNavigationBarTitle({ title: '编辑物品' })
        this.recalcRemaining()
        return
      }
    }

    this.setData({
      categories,
      members,
      spaces,
      spaceIndex,
      rooms,
      alertIndex,
      'form.categoryId': categories.length ? categories[0].id : '',
      'form.memberId': members.length ? members[0].id : '',
      'form.spaceId': currentSpaceId
    })

    // 语音录入草稿预填（一次性，消费即清）
    const draft = store.getVoiceDraft()
    if (draft) {
      store.clearVoiceDraft()
      const p = {}
      if (draft.name) p['form.name'] = draft.name
      if (draft.room) p['form.room'] = draft.room
      if (draft.place) p['form.place'] = draft.place
      if (draft.quantity) p['form.quantity'] = draft.quantity
      if (draft.unit) p['form.unit'] = draft.unit
      if (draft.note) p['form.note'] = draft.note
      if (draft.date) { p['form.date'] = draft.date; p['form.expiryEnabled'] = true }
      if (Object.keys(p).length) this.setData(p)
      wx.showToast({ title: '已按语音填入，请确认', icon: 'none' })
    }

    this.recalcRemaining()
  },

  // ---- 实时剩余天数 ----
  recalcRemaining() {
    const form = this.data.form
    const eff = getEffectiveExpiry({
      expiry: { enabled: form.expiryEnabled, date: form.date, alertDays: form.alertDays },
      opened: { openedAt: form.openedAt, shelfDays: Number(form.shelfDays) || 0 }
    })
    let remainingText = ''
    let remainingClass = ''
    let openedHint = false
    if (eff) {
      const days = daysBetween(todayStr(), eff.date)
      remainingText = formatRemaining(days)
      remainingClass = days < 0 ? 'r-expired' : (days === 0 ? 'r-today' : 'r-ok')
      openedHint = eff.source === 'opened'
    }
    this.setData({ remainingText, remainingClass, openedHint })
  },

  // ---- 文本输入 ----
  onName(e) { this.setData({ 'form.name': e.detail.value }) },
  onRoom(e) { this.setData({ 'form.room': e.detail.value }) },
  onPlace(e) { this.setData({ 'form.place': e.detail.value }) },
  onNote(e) { this.setData({ 'form.note': e.detail.value }) },
  onQuantity(e) { this.setData({ 'form.quantity': e.detail.value }) },
  onUnit(e) { this.setData({ 'form.unit': e.detail.value }) },
  onShelfDays(e) { this.setData({ 'form.shelfDays': e.detail.value }); this.recalcRemaining() },
  onPurchaseDate(e) { this.setData({ 'form.purchaseDate': e.detail.value }) },
  onPurchaseStore(e) { this.setData({ 'form.purchaseStore': e.detail.value }) },
  onPurchasePrice(e) { this.setData({ 'form.purchasePrice': e.detail.value }) },
  onLowStock(e) { this.setData({ 'form.lowStockThreshold': e.detail.value }) },
  onBorrowedTo(e) { this.setData({ 'form.borrowedTo': e.detail.value }) },

  // ---- 选择 ----
  onRoomChip(e) { this.setData({ 'form.room': e.currentTarget.dataset.room }) },
  onUnitChip(e) { this.setData({ 'form.unit': e.currentTarget.dataset.unit }) },
  onMember(e) { this.setData({ 'form.memberId': e.currentTarget.dataset.id }) },
  onSpaceChange(e) {
    const i = Number(e.detail.value)
    const sp = this.data.spaces[i]
    if (!sp) return
    this.setData({ spaceIndex: i, 'form.spaceId': sp.id, rooms: store.getRooms(sp.id), 'form.room': '' })
  },
  onTemplate(e) {
    const ds = e.currentTarget.dataset
    const form = this.data.form
    const patch = {}
    if (!form.name && ds.name) patch['form.name'] = ds.name
    if (!form.categoryId && ds.category) patch['form.categoryId'] = ds.category
    if (!form.unit && ds.unit) patch['form.unit'] = ds.unit
    const shelf = Number(ds.shelf)
    if (!form.shelfDays && ds.shelf && shelf > 0) patch['form.shelfDays'] = ds.shelf
    if (Object.keys(patch).length) {
      this.setData(patch)
      wx.showToast({ title: '已套用「' + ds.name + '」，可继续补充', icon: 'none' })
    }
  },
  onExpirySwitch(e) { this.setData({ 'form.expiryEnabled': e.detail.value }); this.recalcRemaining() },
  onDate(e) { this.setData({ 'form.date': e.detail.value }); this.recalcRemaining() },
  onOpenedAt(e) { this.setData({ 'form.openedAt': e.detail.value }); this.recalcRemaining() },
  onBorrowedSwitch(e) { this.setData({ 'form.borrowedEnabled': e.detail.value }) },
  onAlert(e) {
    const i = Number(e.detail.value)
    this.setData({ alertIndex: i, 'form.alertDays': ALERT_OPTIONS[i] })
  },

  // ---- 分类浮层 ----
  openCategorySheet() { this.setData({ showCategoryPicker: true }) },
  closeCategorySheet() { this.setData({ showCategoryPicker: false }) },
  noop() {},
  onCategoryPick(e) {
    this.setData({ 'form.categoryId': e.currentTarget.dataset.id, showCategoryPicker: false })
  },

  // ---- 标签 ----
  onTagInput(e) { this.setData({ tagInput: e.detail.value }) },
  addTag() {
    const t = this.data.tagInput.trim()
    if (!t) return
    if (this.data.form.tags.indexOf(t) >= 0) {
      this.setData({ tagInput: '' })
      return
    }
    this.setData({ 'form.tags': this.data.form.tags.concat(t), tagInput: '' })
  },
  removeTag(e) {
    const t = e.currentTarget.dataset.tag
    this.setData({ 'form.tags': this.data.form.tags.filter((x) => x !== t) })
  },

  // ---- 照片 ----
  choosePhoto() {
    const remain = 9 - this.data.form.photos.length
    if (remain <= 0) {
      wx.showToast({ title: '最多 9 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: async (res) => {
        wx.showLoading({ title: '保存中' })
        const saved = []
        for (const f of res.tempFiles) {
          try {
            saved.push(await savePhoto(f.tempFilePath))
          } catch (e) {
            console.error('保存照片失败', e)
          }
        }
        wx.hideLoading()
        this.setData({ 'form.photos': this.data.form.photos.concat(saved) })
      }
    })
  },
  previewPhoto(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.form.photos })
  },
  removePhotoTap(e) {
    const url = e.currentTarget.dataset.url
    removePhoto(url)
    this.setData({ 'form.photos': this.data.form.photos.filter((x) => x !== url) })
  },

  // ---- 保存 ----
  buildItem() {
    const form = this.data.form
    const toNum = (s) => (s === '' || s === null || s === undefined) ? null : Number(s)
    return {
      id: this.data.isEdit ? this.data.id : genId('it'),
      name: form.name.trim(),
      photos: form.photos,
      location: { room: form.room.trim(), place: form.place.trim() },
      categoryId: form.categoryId,
      spaceId: form.spaceId,
      tags: form.tags,
      memberId: form.memberId,
      expiry: { enabled: form.expiryEnabled, date: form.date, alertDays: form.alertDays },
      quantity: toNum(form.quantity),
      unit: form.unit.trim(),
      opened: { openedAt: form.openedAt, shelfDays: Number(form.shelfDays) || 0 },
      purchase: { date: form.purchaseDate, store: form.purchaseStore.trim(), price: form.purchasePrice.trim() },
      lowStockThreshold: toNum(form.lowStockThreshold),
      borrowed: { enabled: form.borrowedEnabled, to: form.borrowedTo.trim() },
      note: form.note.trim(),
      createdAt: this.data.isEdit ? undefined : Date.now(),
      updatedAt: Date.now()
    }
  },

  save() {
    this.doSave(false)
  },
  saveAndContinue() {
    this.doSave(true)
  },

  doSave(andContinue) {
    const form = this.data.form
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写物品名称', icon: 'none' })
      return
    }
    const item = this.buildItem()

    if (this.data.isEdit) {
      const old = store.getItemById(this.data.id)
      if (old) {
        item.createdAt = old.createdAt
        item.archived = old.archived
        const removed = (old.photos || []).filter((p) => form.photos.indexOf(p) === -1)
        removed.forEach((p) => removePhoto(p))
      }
      store.updateItem(this.data.id, item)
    } else {
      store.addItem(item)
    }

    wx.showToast({ title: '已保存', icon: 'success' })

    if (andContinue && !this.data.isEdit) {
      const keep = {
        categoryId: form.categoryId,
        memberId: form.memberId,
        room: form.room,
        spaceId: form.spaceId,
        alertDays: form.alertDays,
        unit: form.unit
      }
      const fresh = Object.assign(emptyForm(), keep)
      const idx = Math.max(0, ALERT_OPTIONS.indexOf(fresh.alertDays))
      this.setData({ form: fresh, tagInput: '', alertIndex: idx })
      this.recalcRemaining()
    } else {
      setTimeout(() => wx.navigateBack(), 500)
    }
  }
})
