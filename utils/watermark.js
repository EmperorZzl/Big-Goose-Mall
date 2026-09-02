/**
 * 水印绘制核心逻辑
 * 纯函数设计，便于单元测试
 */

/**
 * 绘制水印到 canvas
 * @param {CanvasRenderingContext2D} ctx - canvas 2d 上下文
 * @param {Object} params - 绘制参数
 * @param {number} params.canvasWidth - canvas 宽度
 * @param {number} params.canvasHeight - canvas 高度
 * @param {string} params.imagePath - 背景图片路径
 * @param {string} params.text - 水印文字
 * @param {number} params.density - 密度 1-10 (平铺模式用)
 * @param {number} params.opacity - 透明度 0.1-1.0
 * @param {number} params.angle - 角度 -45~45 (度数)
 * @param {number} params.fontSize - 字号 (像素)
 * @param {string} params.color - 颜色 hex
 * @param {string} params.position - 位置模式: 'tile'|'corner'|'center'
 * @returns {Promise<void>}
 */
export async function drawWatermark(ctx, params) {
  const {
    canvasWidth,
    canvasHeight,
    imagePath,
    text,
    density = 5,
    opacity = 0.5,
    angle = 0,
    fontSize = 24,
    color = '#FFFFFF',
    position = 'tile'
  } = params

  // 清空 canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // 绘制背景图
  const img = canvas.createImage()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = imagePath
  })
  ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)

  // 设置水印样式
  ctx.globalAlpha = opacity
  ctx.fillStyle = color
  ctx.font = `${fontSize}px sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  // 根据位置模式绘制水印
  switch (position) {
    case 'tile':
      drawTileWatermark(ctx, text, canvasWidth, canvasHeight, density, angle, fontSize)
      break
    case 'corner':
      drawCornerWatermark(ctx, text, canvasWidth, canvasHeight, fontSize)
      break
    case 'center':
      drawCenterWatermark(ctx, text, canvasWidth, canvasHeight, fontSize)
      break
    default:
      drawTileWatermark(ctx, text, canvasWidth, canvasHeight, density, angle, fontSize)
  }
}

/**
 * 平铺模式绘制水印
 */
function drawTileWatermark(ctx, text, width, height, density, angle, fontSize) {
  // 密度转换为间距: density 1-10 -> spacing 300-30
  const spacing = 330 - (density * 30)
  const angleRad = (angle * Math.PI) / 180

  ctx.save()

  // 计算需要绘制的行列数（覆盖整个画布）
  const cols = Math.ceil(width / spacing) + 2
  const rows = Math.ceil(height / spacing) + 2

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const x = col * spacing
      const y = row * spacing

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angleRad)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
  }

  ctx.restore()
}

/**
 * 单角模式绘制水印（右下角）
 */
function drawCornerWatermark(ctx, text, width, height, fontSize) {
  const padding = fontSize * 2
  ctx.fillText(text, width - padding, height - padding)
}

/**
 * 居中模式绘制水印
 */
function drawCenterWatermark(ctx, text, width, height, fontSize) {
  ctx.fillText(text, width / 2, height / 2)
}

/**
 * 获取默认配置
 */
export function getDefaultConfig() {
  return {
    text: '',
    density: 5,
    opacity: 0.5,
    angle: 0,
    fontSize: 24,
    color: '#FFFFFF',
    position: 'tile'
  }
}
