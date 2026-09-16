<template>
  <view class="watermark-editor">
    <!-- 预览区：canvas 尺寸由 initPreviewLayout() 量测真实可用空间后 contain-fit 算出，
         保证整图完整可见（不再按固定宽度算高、被 overflow 裁掉上下） -->
    <view class="preview-area">
      <watermark-canvas
        v-if="previewImage && !exportMode && previewWidth > 0"
        ref="previewCanvas"
        :canvas-width="previewWidth"
        :canvas-height="previewHeight"
        :image-path="previewImage"
        :watermark-config="config"
        canvas-id="preview-canvas"
      />
    </view>

    <!-- 隐藏的导出 canvas（用于生成最终全尺寸水印图）。silent：渲染失败由下方统一抛错，避免双重提示。
         注意：canvas 不能移出视口（left:-9999px 等），否则真机原生层不光栅化、导出空白图。
         这里让它以小尺寸完整留在视口内，用 z-index 压到页面不透明背景之下实现视觉隐藏。 -->
    <watermark-canvas
      v-if="exportMode"
      ref="exportCanvas"
      :canvas-width="exportWidth"
      :canvas-height="exportHeight"
      :display-width="exportDisplayWidth"
      :display-height="exportDisplayHeight"
      :image-path="imagePath"
      :watermark-config="config"
      canvas-id="export-canvas"
      silent
      class="export-canvas-hidden"
    />

    <!-- 参数面板：分组 + 每行只放一个控件，避免互相挤压 -->
    <view class="params-panel">
      <!-- 位置模式 -->
      <view class="param-group">
        <text class="group-label">水印位置</text>
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
      </view>

      <!-- 文字：输入框独占一行，预设标签另起一行 -->
      <view class="param-group">
        <text class="group-label">水印文字</text>
        <input
          v-model="config.text"
          class="text-input"
          placeholder="输入水印文字"
          placeholder-class="text-input-placeholder"
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

      <!-- 样式参数：统一三列栅格（标签 / 控件 / 数值） -->
      <view class="param-group">
        <text class="group-label">样式</text>

        <!-- 密度、角度仅平铺模式生效。按设计文档「置灰」而非隐藏：
             既让用户看得见有哪些能力，也让面板高度恒定、预览区不必反复重新量测 -->
        <view class="param-row" :class="{ muted: !isTile }">
          <text class="param-label">密度</text>
          <slider
            :value="config.density"
            :min="1"
            :max="10"
            :step="1"
            :disabled="!isTile"
            activeColor="#00F5FF"
            block-color="#00F5FF"
            backgroundColor="rgba(255,255,255,0.1)"
            @change="handleDensityChange"
            class="param-slider"
          />
          <text class="param-value">{{ config.density }}</text>
        </view>

        <view class="param-row">
          <text class="param-label">透明度</text>
          <slider
            :value="config.opacity * 10"
            :min="1"
            :max="10"
            :step="1"
            activeColor="#00F5FF"
            block-color="#00F5FF"
            backgroundColor="rgba(255,255,255,0.1)"
            @change="handleOpacityChange"
            class="param-slider"
          />
          <text class="param-value">{{ (config.opacity * 100).toFixed(0) }}%</text>
        </view>

        <view class="param-row" :class="{ muted: !isTile }">
          <text class="param-label">角度</text>
          <slider
            :value="config.angle + 45"
            :min="0"
            :max="90"
            :step="1"
            :disabled="!isTile"
            activeColor="#00F5FF"
            block-color="#00F5FF"
            backgroundColor="rgba(255,255,255,0.1)"
            @change="handleAngleChange"
            class="param-slider"
          />
          <text class="param-value">{{ config.angle }}°</text>
        </view>

        <view class="param-row">
          <text class="param-label">字号</text>
          <slider
            :value="config.fontSize"
            :min="12"
            :max="48"
            :step="1"
            activeColor="#00F5FF"
            block-color="#00F5FF"
            backgroundColor="rgba(255,255,255,0.1)"
            @change="handleFontSizeChange"
            class="param-slider"
          />
          <text class="param-value">{{ config.fontSize }}</text>
        </view>

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
            <!-- 第 7 格：当前为自定义色时显示该色（解决选了自定义色后没有任何色块高亮的问题），否则显示 +。
                 style 必须拼成字符串 —— WXML 不支持在 style 绑定里写对象字面量，会编译报错 -->
            <view
              class="color-dot custom"
              :class="{ active: !!customColor }"
              :style="customColor ? 'background-color:' + customColor + ';' : ''"
              @tap="showCustomColorPicker"
            >
              <text v-if="!customColor" class="custom-color-text">+</text>
            </view>
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

// 导出尺寸上限：微信 iOS canvas 2d 面积上限约 16.7M px（≈4096×4096），
// 超限（如 48MP 照片 8000×6000）会导出失败或得到空白图
const MAX_EXPORT_SIDE = 4096

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
      // 导出 canvas 的显示尺寸（px）：canvas 须完整位于视口内才能在真机上正常光栅化，
      // 因此显示为小尺寸，位图（canvas.width/height）仍为原图分辨率，导出清晰度不受影响
      exportDisplayWidth: 325,
      exportDisplayHeight: 325,
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
  computed: {
    /** 密度/角度仅在平铺模式下生效，其余模式置灰 */
    isTile() {
      return this.config.position === 'tile'
    },
    /** 当前颜色若不在预设色板里，就是自定义色（空串表示未使用自定义色） */
    customColor() {
      return this.presetColors.indexOf(this.config.color) === -1 ? this.config.color : ''
    }
  },
  async mounted() {
    await this.initPreviewLayout()
  },
  methods: {
    /**
     * 量测预览区真实可用尺寸。
     * 预览区是 flex:1，其高度取决于参数面板占掉多少，只能运行时量测。
     */
    measurePreviewArea() {
      return new Promise((resolve) => {
        uni.createSelectorQuery().in(this)
          .select('.preview-area')
          .boundingClientRect((rect) => resolve(rect || null))
          .exec()
      })
    },
    /**
     * 按可用空间 contain-fit 出预览尺寸：整图完整放得下，且不改变长宽比。
     * 这是「图片能看全」的关键 —— 取 min 而非固定宽度算高。
     */
    async initPreviewLayout() {
      // 获取图片信息（uni-app Vue2 promise 风格返回 [err, info]）
      const [err, info] = await uni.getImageInfo({ src: this.imagePath })
      if (err || !info) {
        console.error('获取图片信息失败:', err)
        return
      }

      // 等一次布局稳定：mounted 时参数面板尚未定型，此时量测会拿到错误高度
      await this.$nextTick()
      const box = await this.measurePreviewArea()

      // 量测失败时退化为按 325px 见方的可用空间，至少不至于不显示
      const boxWidth = box && box.width > 0 ? box.width : 325
      const boxHeight = box && box.height > 0 ? box.height : 325

      const scale = Math.min(boxWidth / info.width, boxHeight / info.height)
      this.previewWidth = Math.max(1, Math.floor(info.width * scale))
      this.previewHeight = Math.max(1, Math.floor(info.height * scale))
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
    /**
     * 自定义色值输入。用 uni.showModal 的 editable 模式（参数原样透传给 wx.showModal）
     * 而非 showActionSheet —— 后者只能让用户在固定选项里选，做不了真正的自定义色。
     */
    showCustomColorPicker() {
      uni.showModal({
        title: '自定义颜色',
        editable: true,
        placeholderText: '#RRGGBB，如 #FF5722',
        success: (res) => {
          if (!res.confirm) return
          const raw = (res.content || '').trim()
          // 接受 #RGB / #RRGGBB，也容忍省略 #
          if (!/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) {
            uni.showToast({
              title: '格式不对，请输入 #RRGGBB',
              icon: 'none'
            })
            return
          }
          this.setColor((raw[0] === '#' ? raw : '#' + raw).toUpperCase())
        }
      })
    },
    handleReselect() {
      this.$emit('reselect')
    },
    /**
     * 用原图尺寸绘制水印并导出（清晰度无损，超限自动等比缩放）
     * @returns {Promise<string>} 带水印图片的临时路径
     */
    async exportWatermarkedImage() {
      // 获取原图尺寸（uni-app Vue2 promise 风格返回 [err, info]）
      const [err, info] = await uni.getImageInfo({ src: this.imagePath })
      if (err || !info) {
        throw new Error('获取原图信息失败')
      }

      let imgWidth = info.width
      let imgHeight = info.height

      // 超大图保护：最长边超过上限时等比缩放，避免超出 canvas 面积上限导致导出失败/空白
      if (Math.max(imgWidth, imgHeight) > MAX_EXPORT_SIDE) {
        const scale = MAX_EXPORT_SIDE / Math.max(imgWidth, imgHeight)
        // 向下取整，保证缩放后不会因舍入仍略超上限
        imgWidth = Math.floor(imgWidth * scale)
        imgHeight = Math.floor(imgHeight * scale)
        uni.showToast({
          title: '图片较大，已自动缩放处理',
          icon: 'none'
        })
      }

      // 在隐藏的全尺寸 canvas 上绘制（位图全尺寸，显示尺寸按比例缩小以留在视口内）。
      // 显示尺寸上限取自预览区实测尺寸（已确定落在视口内），并再夹到 320px 以内兼容窄屏机型。
      const box = await this.measurePreviewArea()
      const boxSide = box && Math.max(box.width, box.height) > 0
        ? Math.max(box.width, box.height)
        : 320
      const displayBound = Math.min(320, boxSide)
      const displayScale = Math.min(1, displayBound / Math.max(imgWidth, imgHeight))

      this.exportWidth = imgWidth
      this.exportHeight = imgHeight
      this.exportDisplayWidth = Math.max(1, Math.round(imgWidth * displayScale))
      this.exportDisplayHeight = Math.max(1, Math.round(imgHeight * displayScale))
      this.exportMode = true

      try {
        // 等待 canvas 按新尺寸渲染完成（ref 实例在 $refs 上）
        await this.$nextTick()
        const exportCanvas = this.$refs.exportCanvas
        await exportCanvas.renderCanvas()
        // renderCanvas() 在请求过期时会提前返回，此时绘制尚未完成；
        // 必须等画布内容真正落定后再校验/导出，否则会导出透明画布（相册中显示为黑图）
        await exportCanvas.waitForIdle()

        // 渲染失败时不导出（否则会导出未绘制水印的空白画布），
        // 抛错由 handleGenerate 的 catch 统一提示"生成失败"
        if (exportCanvas.hasRenderFailed()) {
          throw new Error('导出 canvas 渲染失败')
        }

        return await exportCanvas.exportToTempFilePath()
      } finally {
        // 无论成功失败都退出导出模式，恢复预览区显示
        this.exportMode = false
      }
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
// 导出 canvas 视觉隐藏：保持在视口内（真机要求），仅用层级压到页面不透明背景之下
.export-canvas-hidden {
  position: fixed;
  top: 0;
  left: 0;
  z-index: -9999;
}

// 不写 height:100vh/100% —— 高度由父级 .step-body 撑开，内容超高时交给页面滚动
.watermark-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 30rpx 30rpx;
  box-sizing: border-box;
}

.preview-area {
  flex: none;
  // 给预览一个确定的盒子高度：contain-fit 需要确定的可用空间。
  // 用 vh 而非 flex:1，是为了不依赖参数面板占掉多少高度（各机型表现一致）。
  // 不设 overflow:hidden —— canvas 尺寸已由 contain-fit 算好，裁切只会掩盖尺寸算错。
  height: 44vh;
  min-height: 400rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.params-panel {
  flex: none;
  background: $watermark-bg-card;
  border: 2rpx solid $watermark-border-card;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  margin-bottom: 24rpx;
}

// 分组之间用细分隔线，避免一大片参数糊在一起
.param-group {
  & + & {
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 2rpx solid $watermark-border-card;
  }
}

.group-label {
  display: block;
  font-size: 24rpx;
  color: $watermark-text-secondary;
  letter-spacing: 2rpx;
  margin-bottom: 16rpx;
}

.position-selector {
  display: flex;
  gap: 16rpx;
}

.position-btn {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 48rpx;
  text-align: center;
  font-size: 28rpx;
  background: $watermark-bg-card;
  color: $watermark-text-secondary;
  border: 2rpx solid $watermark-border-card;
  transition: all 0.3s ease;

  &.active {
    background: $watermark-primary-gradient;
    color: $watermark-text-primary;
    border-color: #667eea;
  }

  &:active {
    transform: scale(0.96);
  }
}

// 三列栅格：标签固定宽度 / 控件吃掉剩余 / 数值定宽右对齐，保证四行滑块严格对齐
.param-row {
  display: flex;
  align-items: center;
  height: 72rpx;

  & + & {
    margin-top: 4rpx;
  }

  // 当前模式下不生效的参数（密度/角度在非平铺模式）
  &.muted {
    opacity: 0.35;
  }
}

.param-label {
  flex: none;
  width: 100rpx;
  font-size: 26rpx;
  color: $watermark-text-secondary;
}

.param-slider {
  flex: 1;
  margin: 0 16rpx;
}

.param-value {
  flex: none;
  width: 90rpx;
  text-align: right;
  font-size: 26rpx;
  color: $watermark-text-secondary;
  // 等宽数字，避免数值变化时右侧文字左右抖动
  font-variant-numeric: tabular-nums;
}

.text-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.05);
  border: 2rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  color: $watermark-text-primary;
  font-size: 28rpx;
}

.text-input-placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.preset-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.preset-tag {
  padding: 8rpx 20rpx;
  background: $watermark-bg-card;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: $watermark-text-secondary;
  border: 2rpx solid rgba(255, 255, 255, 0.1);

  &:active {
    background: rgba(255, 255, 255, 0.1);
  }
}

.color-picker {
  flex: 1;
  display: flex;
  gap: 16rpx;
}

.color-dot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  transition: all 0.2s ease;

  &.active {
    border-color: $watermark-accent-color;
    box-shadow: 0 0 16rpx rgba(0, 245, 255, 0.3);
  }

  // 自定义色格：未选自定义色时空心虚线，选中后由内联 style 填充实际颜色
  &.custom {
    display: flex;
    align-items: center;
    justify-content: center;

    &:not(.active) {
      background: rgba(255, 255, 255, 0.1) !important;
      border: 2rpx dashed rgba(255, 255, 255, 0.2);
    }
  }

  &:active {
    transform: scale(0.9);
  }
}

.custom-color-text {
  font-size: 32rpx;
  color: $watermark-text-secondary;
  line-height: 1;
}

.action-bar {
  flex: none;
  // 内容不足一屏时把操作栏压到底部；内容超出一屏时它就在参数下方、随页面滚动
  margin-top: auto;
  padding-top: 24rpx;
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  padding: 26rpx 0;
  border-radius: 48rpx;
  font-size: 32rpx;
  border: none;
  transition: all 0.2s ease;

  &.primary {
    background: $watermark-primary-gradient;
    color: $watermark-text-primary;

    &[disabled] {
      opacity: 0.3;
    }

    &:not([disabled]):active {
      transform: scale(0.96);
    }
  }

  &.secondary {
    background: $watermark-bg-card;
    color: $watermark-text-primary;
    border: 2rpx solid rgba(255, 255, 255, 0.1);

    &:active {
      transform: scale(0.96);
      background: rgba(255, 255, 255, 0.08);
    }
  }
}
</style>
