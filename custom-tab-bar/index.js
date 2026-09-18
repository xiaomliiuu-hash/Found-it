const theme = require('../utils/theme')

Component({
  data: {
    selected: 0,
    themeStyle: '',
    list: [
      { pagePath: '/pages/home/home', text: '物品', icon: '📦' },
      { pagePath: '/pages/expiry/expiry', text: '过期', icon: '⏰' },
      { pagePath: '/pages/shopping/shopping', text: '清单', icon: '🛒' },
      { pagePath: '/pages/settings/settings', text: '我的', icon: '🏠' }
    ]
  },

  lifetimes: {
    attached() {
      this.setData({ themeStyle: theme.getThemeStyle() })
    }
  },

  pageLifetimes: {
    show() {
      this.setData({ themeStyle: theme.getThemeStyle() })
    }
  },

  methods: {
    onTap(e) {
      const index = Number(e.currentTarget.dataset.index)
      const path = e.currentTarget.dataset.path
      if (index === this.data.selected) return
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    }
  }
})
