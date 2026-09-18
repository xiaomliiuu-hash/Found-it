const store = require('../../utils/store')
const { todayStr, daysBetween, getExpiryStatus, getRemainingDays, formatRemaining } = require('../../utils/date')

Component({
  properties: {
    item: { type: Object, value: null },
    category: { type: Object, value: null },
    member: { type: Object, value: null }
  },
  data: {
    status: 'none',
    statusText: '',
    qtyText: '',
    borrowed: false,
    lowStock: false,
    usedUp: false,
    hasProgress: false,
    progressPct: 0,
    progressClass: ''
  },
  observers: {
    item: function (item) {
      if (!item) return
      const today = todayStr()
      const status = getExpiryStatus(item, today)
      const days = getRemainingDays(item, today)
      let qtyText = ''
      if (typeof item.quantity === 'number') {
        qtyText = '×' + item.quantity + (item.unit || '')
      }

      // 保质期进度条：开封后保质按 已用/总天数；基础到期仅临期窗口内显示
      let progress = null
      let progressClass = ''
      const opened = item.opened
      if (opened && opened.openedAt && opened.shelfDays > 0) {
        const used = daysBetween(opened.openedAt, today)
        progress = Math.max(0, Math.min(1, used / opened.shelfDays))
      } else if (item.expiry && item.expiry.enabled && item.expiry.date) {
        const remaining = getRemainingDays(item, today)
        if (remaining !== null && remaining !== undefined) {
          if (remaining < 0) {
            progress = 1
          } else {
            const alert = item.expiry.alertDays || 0
            if (alert > 0 && remaining <= alert) progress = 1 - remaining / alert
            else if (alert === 0 && remaining === 0) progress = 1
          }
        }
      }
      if (progress !== null) {
        progressClass = progress >= 1 ? 'p-red' : (progress >= 0.7 ? 'p-orange' : 'p-green')
      }

      const usedUp = store.isUsedUp(item)
      const lowStock = !usedUp && store.isLowStock(item)

      this.setData({
        status,
        statusText: status === 'none' ? '' : formatRemaining(days),
        qtyText,
        borrowed: !!(item.borrowed && item.borrowed.enabled),
        usedUp,
        lowStock,
        hasProgress: progress !== null,
        progressPct: progress === null ? 0 : Math.round(progress * 100),
        progressClass
      })
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.data.item.id })
    }
  }
})
