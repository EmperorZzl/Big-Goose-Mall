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
  onShareAppMessage() {
    return {
      title: '来看看我加了水印的图片',
      path: '/pages/index/index',
      imageUrl: this.generatedImagePath || ''
    }
  },
  onShareTimeline() {
    return {
      title: '水印图片',
      query: '',
      imageUrl: this.generatedImagePath || ''
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
