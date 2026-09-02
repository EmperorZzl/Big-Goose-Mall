# 图片水印功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现图片加水印功能，用户可选择图片（相册或拍照），配置文本水印参数（实时预览），生成带水印的图片并保存/分享到微信。

**Architecture:** 单页面容器 + 5个组件（步骤指示器、图片选择器、水印编辑器、Canvas渲染器、预览保存器）+ 2个工具模块（水印绘制、配置记忆）。步骤间用条件渲染+CSS过渡动画切换。

**Tech Stack:** uni-app Vue 2 + 微信小程序 canvas-2d 接口 + uni.setStorageSync/getStorageSync

**Spec:** docs/superpowers/specs/2026-09-02-watermark-feature-design.md

## Global Constraints

- uni-app Vue 2
- 微信小程序为主平台（使用 canvas type="2d" 新接口）
- UI风格：潮流年轻（深色背景、紫蓝渐变、霓虹青强调色、动效）
- 水印参数：文字内容、密度(1-10)、透明度(0.1-1.0)、角度(-45°~45°)、字号(12-48)、颜色、位置模式（平铺/单角/居中）
- 预设模板：© 2024、禁止转载、仅供展示
- 配置记忆：参数变更时保存，进入Step2时恢复

---

## 文件结构总览

```
pages/index/
├── index.vue                        # 修改：主容器，管理步骤切换和状态
└── components/
    ├── StepIndicator.vue           # 新建：顶部3步进度指示器
    ├── ImagePicker.vue             # 新建：Step1 图片选择器
    ├── WatermarkEditor.vue         # 新建：Step2 水印参数编辑器
    ├── WatermarkCanvas.vue         # 新建：Canvas 渲染组件
    └── PreviewSaver.vue            # 新建：Step3 预览、保存、分享

utils/
├── watermark.js                     # 新建：水印绘制核心逻辑
└── storage.js                        # 新建：配置记忆工具

pages.json                           # 修改：无变化（已有pages/index配置）
```

---

## Task 1: 创建组件目录结构

**Files:**
- Create: `pages/index/components/` 目录

**Interfaces:**
- Consumes: 无
- Produces: 目录结构供后续任务使用

- [ ] **Step 1: 创建 components 目录**

```bash
mkdir -p pages/index/components
```

- [ ] **Step 2: 验证目录创建成功**

Run: `ls -la pages/index/`
Expected: 显示 components 目录

- [ ] **Step 3: Commit**

```bash
git add pages/index/components
git commit -m "feat: create components directory for watermark feature"
```

---

## Task 2: 实现配置记忆工具 storage.js

**Files:**
- Create: `utils/storage.js`

**Interfaces:**
- Consumes: uni-app API (setStorageSync, getStorageSync, removeStorageSync)
- Produces: `saveWatermarkConfig(config)`, `getWatermarkConfig()`, `removeWatermarkConfig()`

- [ ] **Step 1: 创建 storage.js 文件**

```javascript
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
```

- [ ] **Step 2: 验证文件创建成功**

Run: `cat utils/storage.js`
Expected: 显示完整文件内容

- [ ] **Step 3: Commit**

```bash
git add utils/storage.js
git commit -m "feat: add storage utility for watermark config persistence"
```

---

## Task 3: 实现水印绘制核心逻辑 watermark.js

**Files:**
- Create: `utils/watermark.js`

**Interfaces:**
- Consumes: Canvas 2D Context API
- Produces: `drawWatermark(ctx, params)` - 核心绘制函数

- [ ] **Step 1: 创建 watermark.js 文件**

```javascript
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
```

- [ ] **Step 2: 验证文件创建成功**

Run: `cat utils/watermark.js`
Expected: 显示完整文件内容

- [ ] **Step 3: Commit**

```bash
git add utils/watermark.js
git commit -m "feat: add watermark drawing core logic"
```

---

## Task 4: 实现 StepIndicator 组件

**Files:**
- Create: `pages/index/components/StepIndicator.vue`

**Interfaces:**
- Consumes: `currentStep` prop (number 1-3)
- Produces: 渲染步骤指示器 UI

- [ ] **Step 1: 创建 StepIndicator.vue**

```vue
<template>
  <view class="step-indicator">
    <view
      v-for="step in 3"
      :key="step"
      class="step-dot"
      :class="{ active: step === currentStep, completed: step < currentStep }"
    >
      <text class="dot-number">{{ step }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'StepIndicator',
  props: {
    currentStep: {
      type: Number,
      default: 1,
      validator: (value) => value >= 1 && value <= 3
    }
  }
}
</script>

<style lang="scss" scoped>
.step-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24rpx;
  padding: 40rpx 0;
}

.step-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &.active {
    background: #00F5FF;
    border-color: #00F5FF;
    box-shadow: 0 0 20rpx rgba(0, 245, 255, 0.4);

    .dot-number {
      color: #0F0F1A;
      font-weight: bold;
    }
  }

  &.completed {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-color: #667eea;
  }
}

.dot-number {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 500;
}
</style>
```

- [ ] **Step 2: 验证文件创建成功**

Run: `cat pages/index/components/StepIndicator.vue`
Expected: 显示完整文件内容

- [ ] **Step 3: Commit**

```bash
git add pages/index/components/StepIndicator.vue
git commit -m "feat: add StepIndicator component"
```

---

## Task 5: 实现 ImagePicker 组件（Step 1）

**Files:**
- Create: `pages/index/components/ImagePicker.vue`

**Interfaces:**
- Consumes: 无
- Produces: `@select` 事件 (emit), 传递 `{ tempFilePath: string }`

- [ ] **Step 1: 创建 ImagePicker.vue**

```vue
<template>
  <view class="image-picker">
    <view class="picker-card" @tap="handlePickFromAlbum">
      <view class="picker-icon">🖼️</view>
      <text class="picker-text">选择一张图片</text>
      <view class="picker-buttons">
        <button class="picker-btn album" @tap.stop="handlePickFromAlbum">相册</button>
        <button class="picker-btn camera" @tap.stop="handlePickFromCamera">拍照</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ImagePicker',
  methods: {
    handlePickFromAlbum() {
      this.chooseImage(['album'])
    },
    handlePickFromCamera() {
      this.chooseImage(['camera'])
    },
    chooseImage(sourceType) {
      uni.chooseImage({
        count: 1,
        sourceType,
        sizeType: ['original', 'compressed'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0]
          this.$emit('select', { tempFilePath })
        },
        fail: (err) => {
          console.error('选择图片失败:', err)
          uni.showModal({
            title: '权限受限',
            content: '请在设置中开启相册或相机权限',
            showCancel: true,
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                uni.openSetting()
              }
            }
          })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.image-picker {
  padding: 60rpx;
}

.picker-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2rpx dashed rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  padding: 80rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.08);
  }
}

.picker-icon {
  font-size: 120rpx;
  opacity: 0.8;
}

.picker-text {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.55);
}

.picker-buttons {
  display: flex;
  gap: 24rpx;
  margin-top: 20rpx;
}

.picker-btn {
  padding: 20rpx 48rpx;
  border-radius: 48rpx;
  font-size: 28rpx;
  border: none;
  transition: all 0.2s ease;

  &.album {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #FFFFFF;
  }

  &.camera {
    background: rgba(255, 255, 255, 0.1);
    color: #FFFFFF;
    border: 2rpx solid rgba(255, 255, 255, 0.2);
  }

  &::active {
    transform: scale(0.96);
  }
}
</style>
```

- [ ] **Step 2: 验证文件创建成功**

Run: `cat pages/index/components/ImagePicker.vue`
Expected: 显示完整文件内容

- [ ] **Step 3: Commit**

```bash
git add pages/index/components/ImagePicker.vue
git commit -m "feat: add ImagePicker component (Step 1)"
```

---

## Task 6: 实现 WatermarkCanvas 组件

**Files:**
- Create: `pages/index/components/WatermarkCanvas.vue`

**Interfaces:**
- Consumes: `canvasWidth`, `canvasHeight`, `imagePath`, `watermarkConfig` props
- Produces: 内部调用 `drawWatermark` 渲染 canvas

- [ ] **Step 1: 创建 WatermarkCanvas.vue**

```vue
<template>
  <view class="watermark-canvas-wrapper" :style="{ width: wrapperWidth + 'rpx' }">
    <canvas
      type="2d"
      :id="canvasId"
      :canvas-id="canvasId"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
      class="watermark-canvas"
    ></canvas>
  </view>
</template>

<script>
import { drawWatermark } from '@/utils/watermark.js'

export default {
  name: 'WatermarkCanvas',
  props: {
    canvasId: {
      type: String,
      default: 'watermark-canvas'
    },
    wrapperWidth: {
      type: Number,
      default: 650 // rpx，容器宽度
    },
    canvasWidth: {
      type: Number,
      required: true // 实际像素宽度
    },
    canvasHeight: {
      type: Number,
      required: true // 实际像素高度
    },
    imagePath: {
      type: String,
      default: ''
    },
    watermarkConfig: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      ctx: null,
      canvas: null
    }
  },
  watch: {
    imagePath: {
      handler() {
        this.renderCanvas()
      },
      immediate: true
    },
    watermarkConfig: {
      handler() {
        this.renderCanvas()
      },
      deep: true
    }
  },
  mounted() {
    this.initCanvas()
  },
  methods: {
    async initCanvas() {
      const query = uni.createSelectorQuery().in(this)
      query.select(`#${this.canvasId}`)
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res[0]) {
            console.error('Canvas 节点获取失败')
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')

          // 设置 canvas 实际尺寸
          canvas.width = this.canvasWidth
          canvas.height = this.canvasHeight

          this.canvas = canvas
          this.ctx = ctx

          await this.renderCanvas()
        })
    },
    async renderCanvas() {
      if (!this.ctx || !this.canvas || !this.imagePath) {
        return
      }

      try {
        await drawWatermark(this.ctx, {
          canvasWidth: this.canvasWidth,
          canvasHeight: this.canvasHeight,
          imagePath: this.imagePath,
          ...this.watermarkConfig
        })
      } catch (error) {
        console.error('Canvas 渲染失败:', error)
        uni.showToast({
          title: '渲染失败，请重试',
          icon: 'none'
        })
      }
    },
    /**
     * 导出为临时文件
     * @returns {Promise<string>} 临时文件路径
     */
    async exportToTempFilePath() {
      if (!this.canvas) {
        throw new Error('Canvas 未初始化')
      }

      return new Promise((resolve, reject) => {
        uni.canvasToTempFilePath({
          canvas: this.canvas,
          canvasId: this.canvasId,
          success: (res) => {
            resolve(res.tempFilePath)
          },
          fail: (err) => {
            reject(err)
          }
        }, this)
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.watermark-canvas-wrapper {
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16rpx;
  overflow: hidden;
}

.watermark-canvas {
  display: block;
}
</style>
```

- [ ] **Step 2: 验证文件创建成功**

Run: `cat pages/index/components/WatermarkCanvas.vue`
Expected: 显示完整文件内容

- [ ] **Step 3: Commit**

```bash
git add pages/index/components/WatermarkCanvas.vue
git commit -m "feat: add WatermarkCanvas component"
```

---

## Task 7: 实现 WatermarkEditor 组件（Step 2）

**Files:**
- Create: `pages/index/components/WatermarkEditor.vue`

**Interfaces:**
- Consumes: `imagePath`, `initialConfig` props
- Produces: `@configChange` 事件 (emit 配置), `@generate` 事件, `@reselect` 事件

- [ ] **Step 1: 创建 WatermarkEditor.vue**

```vue
<template>
  <view class="watermark-editor">
    <!-- 预览区 -->
    <view class="preview-area">
      <watermark-canvas
        v-if="previewImage && !exportMode"
        ref="previewCanvas"
        :canvas-width="previewWidth"
        :canvas-height="previewHeight"
        :image-path="previewImage"
        :watermark-config="config"
        :wrapper-width="650"
        canvas-id="preview-canvas"
      />
    </view>

    <!-- 隐藏的导出 canvas（用于生成最终全尺寸水印图） -->
    <watermark-canvas
      v-if="exportMode"
      ref="exportCanvas"
      :canvas-width="exportWidth"
      :canvas-height="exportHeight"
      :image-path="imagePath"
      :watermark-config="config"
      :wrapper-width="0"
      canvas-id="export-canvas"
      style="position: fixed; left: -9999px; opacity: 0;"
    />

    <!-- 位置模式切换 -->
    <view class="position-selector">
      <view
        v-for="mode in positionModes"
        :key="mode.value"
        class="position-btn"
        :class="{ active: config.position === mode.value }"
        @tap="setPosition(mode.value)"
      >
        {{ mode.label }}
      </view>
    </view>

    <!-- 参数面板 -->
    <view class="params-panel">
      <!-- 文字输入 -->
      <view class="param-row">
        <text class="param-label">水印文字</text>
        <input
          v-model="config.text"
          class="text-input"
          placeholder="输入水印文字"
          @input="handleConfigChange"
        />
        <view class="preset-tags">
          <view
            v-for="preset in presetTexts"
            :key="preset"
            class="preset-tag"
            @tap="applyPreset(preset)"
          >
            {{ preset }}
          </view>
        </view>
      </view>

      <!-- 密度滑块 (仅平铺模式) -->
      <view v-if="config.position === 'tile'" class="param-row">
        <text class="param-label">密度</text>
        <slider
          :value="config.density"
          :min="1"
          :max="10"
          :step="1"
          activeColor="#00F5FF"
          backgroundColor="rgba(255,255,255,0.1)"
          @change="handleDensityChange"
          class="param-slider"
        />
        <text class="param-value">{{ config.density }}</text>
      </view>

      <!-- 透明度滑块 -->
      <view class="param-row">
        <text class="param-label">透明度</text>
        <slider
          :value="config.opacity * 10"
          :min="1"
          :max="10"
          :step="1"
          activeColor="#00F5FF"
          backgroundColor="rgba(255,255,255,0.1)"
          @change="handleOpacityChange"
          class="param-slider"
        />
        <text class="param-value">{{ (config.opacity * 100).toFixed(0) }}%</text>
      </view>

      <!-- 角度滑块 (仅平铺模式) -->
      <view v-if="config.position === 'tile'" class="param-row">
        <text class="param-label">角度</text>
        <slider
          :value="config.angle + 45"
          :min="0"
          :max="90"
          :step="1"
          activeColor="#00F5FF"
          backgroundColor="rgba(255,255,255,0.1)"
          @change="handleAngleChange"
          class="param-slider"
        />
        <text class="param-value">{{ config.angle }}°</text>
      </view>

      <!-- 字号滑块 -->
      <view class="param-row">
        <text class="param-label">字号</text>
        <slider
          :value="config.fontSize"
          :min="12"
          :max="48"
          :step="1"
          activeColor="#00F5FF"
          backgroundColor="rgba(255,255,255,0.1)"
          @change="handleFontSizeChange"
          class="param-slider"
        />
        <text class="param-value">{{ config.fontSize }}</text>
      </view>

      <!-- 颜色选择 -->
      <view class="param-row">
        <text class="param-label">颜色</text>
        <view class="color-picker">
          <view
            v-for="color in presetColors"
            :key="color"
            class="color-dot"
            :class="{ active: config.color === color }"
            :style="{ backgroundColor: color }"
            @tap="setColor(color)"
          />
          <view class="color-dot custom" @tap="showCustomColorPicker">
            <text class="custom-color-text">+</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <button class="action-btn secondary" @tap="handleReselect">重新选择</button>
      <button class="action-btn primary" :disabled="!config.text" @tap="handleGenerate">
        生成水印
      </button>
    </view>
  </view>
</template>

<script>
import WatermarkCanvas from './WatermarkCanvas.vue'
import { getDefaultConfig } from '@/utils/watermark.js'

export default {
  name: 'WatermarkEditor',
  components: {
    WatermarkCanvas
  },
  props: {
    imagePath: {
      type: String,
      required: true
    },
    initialConfig: {
      type: Object,
      default: () => getDefaultConfig()
    }
  },
  data() {
    return {
      config: { ...this.initialConfig },
      previewImage: this.imagePath,
      previewWidth: 0,
      previewHeight: 0,
      // 导出模式（用于生成最终水印图）
      exportMode: false,
      exportWidth: 0,
      exportHeight: 0,
      exportCanvas: null,
      // 位置模式
      positionModes: [
        { value: 'tile', label: '平铺' },
        { value: 'corner', label: '单角' },
        { value: 'center', label: '居中' }
      ],
      // 预设文字
      presetTexts: ['© 2024', '禁止转载', '仅供展示'],
      // 预设颜色
      presetColors: ['#FFFFFF', '#000000', '#808080', '#FF0000', '#FFFF00', '#00FFFF']
    }
  },
  async mounted() {
    await this.calculatePreviewSize()
  },
  methods: {
    async calculatePreviewSize() {
      // 获取图片信息
      const info = await uni.getImageInfo({ src: this.imagePath })
      const imgWidth = info.width
      const imgHeight = info.height

      // 容器宽度 650rpx，转为 px (假设 2rpx = 1px)
      const containerWidth = 325 // px
      const ratio = imgWidth / imgHeight

      this.previewWidth = containerWidth
      this.previewHeight = containerWidth / ratio
    },
    handleConfigChange() {
      this.$emit('configChange', this.config)
    },
    handleDensityChange(e) {
      this.config.density = e.detail.value
      this.handleConfigChange()
    },
    handleOpacityChange(e) {
      this.config.opacity = e.detail.value / 10
      this.handleConfigChange()
    },
    handleAngleChange(e) {
      this.config.angle = e.detail.value - 45
      this.handleConfigChange()
    },
    handleFontSizeChange(e) {
      this.config.fontSize = e.detail.value
      this.handleConfigChange()
    },
    setPosition(position) {
      this.config.position = position
      this.handleConfigChange()
    },
    setColor(color) {
      this.config.color = color
      this.handleConfigChange()
    },
    applyPreset(text) {
      this.config.text = text
      this.handleConfigChange()
    },
    showCustomColorPicker() {
      uni.showActionSheet({
        itemList: this.presetColors.map(c => `${c} (预设)`),
        success: (res) => {
          this.setColor(this.presetColors[res.tapIndex])
        }
      })
    },
    handleReselect() {
      this.$emit('reselect')
    },
    /**
     * 用原图尺寸绘制水印并导出（清晰度无损）
     * @returns {Promise<string>} 带水印图片的临时路径
     */
    async exportWatermarkedImage() {
      // 获取原图尺寸
      const info = await uni.getImageInfo({ src: this.imagePath })

      // 在隐藏的全尺寸 canvas 上绘制
      this.exportWidth = info.width
      this.exportHeight = info.height
      this.exportMode = true

      // 等待 canvas 按新尺寸渲染完成
      await this.$nextTick()
      await this.exportCanvas.renderCanvas()

      const tempFilePath = await this.exportCanvas.exportToTempFilePath()
      this.exportMode = false

      return tempFilePath
    },
    handleGenerate() {
      if (!this.config.text) {
        uni.showToast({
          title: '请输入水印文字',
          icon: 'none'
        })
        return
      }

      // 显示加载提示（大图绘制可能较慢）
      uni.showLoading({ title: '生成中...', mask: true })

      this.exportWatermarkedImage()
        .then((imagePath) => {
          uni.hideLoading()
          this.$emit('generate', { config: this.config, imagePath })
        })
        .catch((error) => {
          uni.hideLoading()
          console.error('生成水印失败:', error)
          uni.showToast({
            title: '生成失败，请重试',
            icon: 'none'
          })
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.watermark-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0 30rpx 30rpx;
  box-sizing: border-box;
}

.preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 30rpx;
}

.position-selector {
  display: flex;
  gap: 16rpx;
  margin-bottom: 30rpx;
}

.position-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 48rpx;
  text-align: center;
  font-size: 28rpx;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.55);
  border: 2rpx solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;

  &.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #FFFFFF;
    border-color: #667eea;
  }

  &:active {
    transform: scale(0.96);
  }
}

.params-panel {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.param-row {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.param-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.55);
  min-width: 140rpx;
}

.text-input {
  flex: 1;
  padding: 16rpx 24rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 2rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  color: #FFFFFF;
  font-size: 28rpx;
}

.preset-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.preset-tag {
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
  border: 2rpx solid rgba(255, 255, 255, 0.1);

  &:active {
    background: rgba(255, 255, 255, 0.1);
  }
}

.param-slider {
  flex: 1;
  margin: 0 20rpx;
}

.param-value {
  min-width: 80rpx;
  text-align: right;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.55);
}

.color-picker {
  flex: 1;
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.color-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  transition: all 0.2s ease;

  &.active {
    border-color: #00F5FF;
    box-shadow: 0 0 16rpx rgba(0, 245, 255, 0.3);
  }

  &.custom {
    background: rgba(255, 255, 255, 0.1) !important;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx dashed rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: scale(0.9);
  }
}

.custom-color-text {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.55);
}

.action-bar {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  padding: 28rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
  border: none;
  transition: all 0.2s ease;

  &.primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #FFFFFF;

    &[disabled] {
      opacity: 0.3;
    }

    &:not([disabled]):active {
      transform: scale(0.96);
    }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.05);
    color: #FFFFFF;
    border: 2rpx solid rgba(255, 255, 255, 0.1);

    &:active {
      transform: scale(0.96);
      background: rgba(255, 255, 255, 0.08);
    }
  }
}
</style>
```

- [ ] **Step 2: 验证文件创建成功**

Run: `cat pages/index/components/WatermarkEditor.vue`
Expected: 显示完整文件内容

- [ ] **Step 3: Commit**

```bash
git add pages/index/components/WatermarkEditor.vue
git commit -m "feat: add WatermarkEditor component (Step 2)"
```

---

## Task 8: 实现 PreviewSaver 组件（Step 3）

**Files:**
- Create: `pages/index/components/PreviewSaver.vue`

**Interfaces:**
- Consumes: `imagePath` prop (已加水印的图片路径)
- Produces: `@reselect` 事件, `@saved` 事件

- [ ] **Step 1: 创建 PreviewSaver.vue**

```vue
<template>
  <view class="preview-saver">
    <image class="preview-image" :src="imagePath" mode="aspectFit" />

    <view class="action-buttons">
      <button class="action-btn primary" @tap="handleSaveToAlbum">
        {{ saveButtonText }}
      </button>
      <button class="action-btn share" open-type="share" @tap="handleShareToFriend">
        分享给好友
      </button>
      <button class="action-btn share" @tap="handleShareToTimeline">
        分享到朋友圈
      </button>
      <button class="action-btn secondary" @tap="handleReselect">
        换一张
      </button>
    </view>

    <!-- 微信分享菜单配置按钮（隐藏） -->
    <button
      class="share-menu-trigger"
      open-type="share"
      @tap="handleShareTrigger"
    >
      分享
    </button>
  </view>
</template>

<script>
export default {
  name: 'PreviewSaver',
  props: {
    imagePath: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      saveButtonText: '保存到相册',
      hasSaved: false
    }
  },
  onShareAppMessage() {
    // 微信好友分享
    return {
      title: '来看看我加了水印的图片',
      path: '/pages/index/index',
      imageUrl: this.imagePath
    }
  },
  onShareTimeline() {
    // 朋友圈分享
    return {
      title: '水印图片',
      query: '',
      imageUrl: this.imagePath
    }
  },
  mounted() {
    // 显示朋友圈分享菜单
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
      success: () => {
        console.log('分享菜单设置成功')
      },
      fail: (err) => {
        console.error('分享菜单设置失败:', err)
      }
    })
  },
  methods: {
    async handleSaveToAlbum() {
      try {
        await uni.saveImageToPhotosAlbum({
          filePath: this.imagePath
        })

        this.hasSaved = true
        this.saveButtonText = '已保存 ✓'

        uni.showToast({
          title: '保存成功！可从相册分享到微信',
          icon: 'success',
          duration: 3000
        })

        this.$emit('saved')
      } catch (err) {
        console.error('保存失败:', err)

        // 权限拒绝引导
        if (err.errMsg.includes('auth')) {
          uni.showModal({
            title: '权限受限',
            content: '请在设置中开启相册权限',
            showCancel: true,
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                uni.openSetting()
              }
            }
          })
        } else {
          uni.showToast({
            title: '保存失败，请重试',
            icon: 'none'
          })
        }
      }
    },
    handleShareToFriend() {
      // 微信小程序通过 button open-type="share" 触发
      // 这里可以添加额外的统计或提示
    },
    handleShareToTimeline() {
      // 朋友圈分享同样通过 button open-type="share" 触发
      // 微信会根据 onShareTimeline 返回配置处理
    },
    handleShareTrigger() {
      // 隐藏的分享触发器
    },
    handleReselect() {
      this.$emit('reselect')
    }
  }
}
</script>

<style lang="scss" scoped>
.preview-saver {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 30rpx;
  box-sizing: border-box;
}

.preview-image {
  flex: 1;
  width: 100%;
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.2);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 30rpx;
}

.action-btn {
  padding: 28rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
  border: none;
  transition: all 0.2s ease;

  &.primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #FFFFFF;
    font-weight: bold;

    &:active {
      transform: scale(0.96);
    }
  }

  &.share {
    background: rgba(255, 255, 255, 0.08);
    color: #FFFFFF;
    border: 2rpx solid rgba(255, 255, 255, 0.15);

    &:active {
      transform: scale(0.96);
      background: rgba(255, 255, 255, 0.12);
    }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border: 2rpx solid rgba(255, 255, 255, 0.1);

    &:active {
      transform: scale(0.96);
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

.share-menu-trigger {
  position: fixed;
  left: -9999rpx;
  width: 0;
  height: 0;
  opacity: 0;
}
</style>
```

- [ ] **Step 2: 验证文件创建成功**

Run: `cat pages/index/components/PreviewSaver.vue`
Expected: 显示完整文件内容

- [ ] **Step 3: Commit**

```bash
git add pages/index/components/PreviewSaver.vue
git commit -m "feat: add PreviewSaver component (Step 3)"
```

---

## Task 9: 实现主页面 index.vue

**Files:**
- Modify: `pages/index/index.vue`

**Interfaces:**
- Consumes: 所有子组件 + storage.js
- Produces: 完整的三步流程页面

- [ ] **Step 1: 备份原 index.vue**

```bash
cp pages/index/index.vue pages/index/index.vue.backup
```

- [ ] **Step 2: 重写 index.vue**

```vue
<template>
  <view class="container">
    <!-- 标题 -->
    <view class="header">
      <text class="title">大额商城 · 水印工具</text>
    </view>

    <!-- 步骤指示器 -->
    <step-indicator :current-step="currentStep" />

    <!-- 步骤内容（条件渲染） -->
    <!-- Step 1: 选择图片 -->
    <image-picker
      v-if="currentStep === 1"
      @select="handleImageSelect"
    />

    <!-- Step 2: 配置水印 -->
    <watermark-editor
      v-if="currentStep === 2"
      :image-path="selectedImagePath"
      :initial-config="watermarkConfig"
      @config-change="handleConfigChange"
      @generate="handleGenerate"
      @reselect="handleReselect"
    />

    <!-- Step 3: 预览保存 -->
    <preview-saver
      v-if="currentStep === 3"
      :image-path="generatedImagePath"
      @reselect="handleReselect"
      @saved="handleSaved"
    />
  </view>
</template>

<script>
import StepIndicator from './components/StepIndicator.vue'
import ImagePicker from './components/ImagePicker.vue'
import WatermarkEditor from './components/WatermarkEditor.vue'
import PreviewSaver from './components/PreviewSaver.vue'
import { saveWatermarkConfig, getWatermarkConfig } from '@/utils/storage.js'
import { getDefaultConfig } from '@/utils/watermark.js'

export default {
  name: 'IndexPage',
  components: {
    StepIndicator,
    ImagePicker,
    WatermarkEditor,
    PreviewSaver
  },
  data() {
    return {
      currentStep: 1,
      selectedImagePath: '',
      generatedImagePath: '',
      watermarkConfig: getDefaultConfig()
    }
  },
  onLoad() {
    // 加载保存的配置
    const savedConfig = getWatermarkConfig()
    if (savedConfig) {
      this.watermarkConfig = savedConfig
    }
  },
  methods: {
    handleImageSelect({ tempFilePath }) {
      this.selectedImagePath = tempFilePath
      this.currentStep = 2
    },
    handleConfigChange(config) {
      this.watermarkConfig = { ...config }
      // 防抖保存配置
      this.debouncedSaveConfig()
    },
    handleGenerate({ config, imagePath }) {
      this.watermarkConfig = { ...config }
      this.generatedImagePath = imagePath
      this.currentStep = 3

      // 保存最终配置
      saveWatermarkConfig(config)
    },
    handleReselect() {
      this.currentStep = 1
      this.selectedImagePath = ''
      this.generatedImagePath = ''
    },
    handleSaved() {
      // 保存成功后的回调
      console.log('图片已保存')
    },
    debouncedSaveConfig: null
  },
  created() {
    // 创建防抖函数
    let timeout = null
    this.debouncedSaveConfig = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        saveWatermarkConfig(this.watermarkConfig)
      }, 500)
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #0F0F1A, #1A1A2E);
  padding-bottom: env(safe-area-inset-bottom);
}

.header {
  padding: 40rpx 30rpx 20rpx;
  text-align: center;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
  text-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.3);
}
</style>
```

- [ ] **Step 3: 验证文件修改成功**

Run: `cat pages/index/index.vue`
Expected: 显示新的主页面内容

- [ ] **Step 4: Commit**

```bash
git add pages/index/index.vue pages/index/index.vue.backup
git commit -m "feat: implement main page with 3-step watermark flow"
```

---

## Task 10: 更新全局样式 uni.scss

**Files:**
- Modify: `uni.scss`

**Interfaces:**
- Consumes: 无
- Produces: 全局样式变量

- [ ] **Step 1: 备份原 uni.scss**

```bash
cp uni.scss uni.scss.backup
```

- [ ] **Step 2: 追加全局样式变量到 uni.scss**

在文件末尾追加：

```scss
/* 水印功能全局样式变量 */
$watermark-primary-gradient: linear-gradient(135deg, #667eea, #764ba2);
$watermark-accent-color: #00F5FF;
$watermark-text-primary: #FFFFFF;
$watermark-text-secondary: rgba(255, 255, 255, 0.55);
$watermark-bg-card: rgba(255, 255, 255, 0.05);
$watermark-border-card: rgba(255, 255, 255, 0.08);
$watermark-bg-dark: linear-gradient(180deg, #0F0F1A, #1A1A2E);
```

- [ ] **Step 3: 验证文件修改成功**

Run: `tail -20 uni.scss`
Expected: 显示追加的样式变量

- [ ] **Step 4: Commit**

```bash
git add uni.scss uni.scss.backup
git commit -m "style: add watermark global style variables"
```

---

## 实现完成检查清单

完成所有任务后，验证以下功能：

- [ ] **Step 1 流程**: 点击相册/拍照 → 能选择图片 → 自动进入 Step 2
- [ ] **Step 2 流程**: 预览显示图片 → 调整参数实时刷新预览 → 点击"生成水印"进入 Step 3
- [ ] **Step 3 流程**: 显示带水印的图片 → 保存成功 → 可分享/换一张
- [ ] **配置记忆**: 杀掉小程序重进 → Step 2 参数恢复
- [ ] **权限引导**: 拒绝相册/保存权限 → 引导去设置
- [ ] **分享功能**: 点击分享按钮 → 微信好友/朋友圈分享（小程序卡片形式）
- [ ] **UI 风格**: 深色背景、紫蓝渐变按钮、霓虹青强调色、动效过渡

---

## Plan Complete

计划已保存到 `docs/superpowers/plans/2026-09-02-watermark-feature.md`

**执行选项：**

**1. Subagent-Driven (推荐)** - 为每个任务派发一个新子代理，任务间进行审查，快速迭代

**2. Inline Execution** - 在当前会话中使用 executing-plans 技能批量执行，带检查点审查

你希望采用哪种方式？
