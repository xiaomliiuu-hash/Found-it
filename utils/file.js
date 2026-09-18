// 图片文件持久化：临时路径会被系统清理，必须 saveFile 到本地用户目录

// 保存临时图片 -> 返回持久化路径
function savePhoto(tempFilePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().saveFile({
      tempFilePath,
      success: (res) => resolve(res.savedFilePath),
      fail: reject
    })
  })
}

// 删除已持久化图片
function removePhoto(filePath) {
  return new Promise((resolve) => {
    if (!filePath) return resolve()
    wx.getFileSystemManager().removeSavedFile({
      filePath,
      success: resolve,
      fail: resolve
    })
  })
}

module.exports = { savePhoto, removePhoto }
