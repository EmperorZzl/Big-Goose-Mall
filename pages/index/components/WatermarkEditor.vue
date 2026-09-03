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
      // 获取图片信息（uni-app Vue2 promise 风格返回 [err, info]）
      const [err, info] = await uni.getImageInfo({ src: this.imagePath })
      if (err || !info) {
        console.error('获取图片信息失败:', err)
        return
      }
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

      // 在隐藏的全尺寸 canvas 上绘制
      this.exportWidth = imgWidth
      this.exportHeight = imgHeight
      this.exportMode = true

      try {
        // 等待 canvas 按新尺寸渲染完成（ref 实例在 $refs 上）
        await this.$nextTick()
        await this.$refs.exportCanvas.renderCanvas()

        return await this.$refs.exportCanvas.exportToTempFilePath()
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
