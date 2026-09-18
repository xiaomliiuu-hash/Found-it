const store = require('../../utils/store')
const theme = require('../../utils/theme')
const { DEFAULT_AVATARS, getDefaultAvatar } = require('../../utils/avatars')
const { savePhoto, removePhoto } = require('../../utils/file')

Page({
  data: {
    name: '',
    avatar: { kind: 'default', id: 'penguin' },
    avatars: DEFAULT_AVATARS,
    isImage: false,
    imagePath: '',
    defaultSrc: '',
    nameLen: 0,
    themeStyle: ''
  },

  // 原自定义头像路径（用于换头像时清理旧文件）
  origImagePath: '',

  onLoad() {
    this.setData({ themeStyle: theme.getThemeStyle() })
    const profile = store.getProfile()
    const raw = profile.avatar || {}
    const avatar = raw.kind === 'image'
      ? { kind: 'image', path: raw.path }
      : { kind: 'default', id: raw.id || 'penguin' }
    const name = profile.name || ''
    this.origImagePath = avatar.kind === 'image' ? avatar.path : ''
    this.setData({
      name,
      avatar,
      isImage: avatar.kind === 'image',
      imagePath: avatar.kind === 'image' ? avatar.path : '',
      defaultSrc: getDefaultAvatar(avatar.id).src,
      nameLen: name.length
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value, nameLen: e.detail.value.length })
  },

  onPickDefault(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      avatar: { kind: 'default', id },
      isImage: false,
      imagePath: '',
      defaultSrc: getDefaultAvatar(id).src
    })
  },

  onChooseAlbum() {
    this.chooseImage(['album'])
  },
  onTakePhoto() {
    this.chooseImage(['camera'])
  },

  chooseImage(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      camera: 'front',
      sizeType: ['compressed'],
      success: async (res) => {
        const f = res.tempFiles && res.tempFiles[0]
        if (!f || !f.tempFilePath) return
        try {
          const path = await savePhoto(f.tempFilePath)
          this.setData({ avatar: { kind: 'image', path }, isImage: true, imagePath: path })
        } catch (e) {
          wx.showToast({ title: '头像保存失败', icon: 'none' })
        }
      }
    })
  },

  onSave() {
    const name = this.data.name.trim()
    const avatar = this.data.avatar
    // 换掉了原自定义头像则清理旧图片文件
    if (this.origImagePath && !(avatar.kind === 'image' && avatar.path === this.origImagePath)) {
      removePhoto(this.origImagePath)
    }
    store.saveProfile({ name, avatar })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  }
})
