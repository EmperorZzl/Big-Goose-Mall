/**
 * 水印配置记忆工具
 * 使用 uni.setStorageSync/getStorageSync 持久化用户配置
 */

const STORAGE_KEY = 'watermark_config'

/**
 * 保存水印配置
 * @param {Object} config - 水印配置对象
 * @param {string} config.text - 水印文字
 * @param {number} config.density - 密度 1-10
 * @param {number} config.opacity - 透明度 0.1-1.0
 * @param {number} config.angle - 角度 -45~45
 * @param {number} config.fontSize - 字号 12-48
 * @param {string} config.color - 颜色 hex
 * @param {string} config.position - 位置模式: 'tile'|'corner'|'center'
 */
export function saveWatermarkConfig(config) {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('保存配置失败:', error)
  }
}

/**
 * 获取水印配置
 * @returns {Object|null} 配置对象，不存在时返回 null
 */
export function getWatermarkConfig() {
  try {
    const configStr = uni.getStorageSync(STORAGE_KEY)
    return configStr ? JSON.parse(configStr) : null
  } catch (error) {
    console.error('读取配置失败:', error)
    return null
  }
}

/**
 * 移除水印配置
 */
export function removeWatermarkConfig() {
  try {
    uni.removeStorageSync(STORAGE_KEY)
  } catch (error) {
    console.error('移除配置失败:', error)
  }
}
