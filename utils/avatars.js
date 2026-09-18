// 默认手绘动物头像（本地 SVG 资源）
// 供「编辑个人资料」与「我的」页复用；src 为项目内绝对路径

const DEFAULT_AVATARS = [
  { id: 'penguin', label: '企鹅', src: '/assets/avatars/penguin.svg' },
  { id: 'fox', label: '狐狸', src: '/assets/avatars/fox.svg' },
  { id: 'bear', label: '小熊', src: '/assets/avatars/bear.svg' },
  { id: 'panda', label: '熊猫', src: '/assets/avatars/panda.svg' },
  { id: 'rabbit', label: '兔子', src: '/assets/avatars/rabbit.svg' },
  { id: 'cat', label: '小猫', src: '/assets/avatars/cat.svg' }
]

// 按 id 取默认头像，找不到回退到第一项（企鹅）
function getDefaultAvatar(id) {
  return DEFAULT_AVATARS.find((a) => a.id === id) || DEFAULT_AVATARS[0]
}

module.exports = { DEFAULT_AVATARS, getDefaultAvatar }
