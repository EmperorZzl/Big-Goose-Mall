<template>
  <view class="container">
    <!-- 标题：仅第 1 步做品牌露出。第 2/3 步要把高度让给图片预览 -->
    <view v-if="currentStep === 1" class="header">
      <text class="title">Big-Goose-Mall</text>
    </view>

    <!-- 步骤指示器 -->
    <step-indicator class="step-bar" :current-step="currentStep" />

    <!-- 步骤内容区：吃掉剩余高度，内部布局交给各步骤组件自己分配 -->
    <view class="step-body">
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
    /**
     * 防抖保存配置：连续调参时只在停顿 500ms 后落一次存储
     */
    debouncedSaveConfig() {
      clearTimeout(this._saveTimer)
      this._saveTimer = setTimeout(() => {
        saveWatermarkConfig(this.watermarkConfig)
      }, 500)
    }
  },
  created() {
    // 非响应式实例状态：防抖定时器句柄。Vue2 不把 `_` 前缀的键代理到实例上，
    // 因此这类状态只能作为普通实例属性存在，不能放进 data() 或 methods
    this._saveTimer = null
  }
}
</script>

<style lang="scss" scoped>
.container {
  // min-height（而非 height）+ 不设 overflow:hidden —— 参数面板在小屏上会超出视口，
  // 页面必须能滚动，否则下面的参数和按钮直接被裁掉、够不着
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $watermark-bg-dark;
}

.header {
  padding: 40rpx 30rpx 20rpx;
  text-align: center;
  flex: none;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: $watermark-text-primary;
  text-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.3);
}

.step-bar {
  flex: none;
}

// 步骤内容区：至少占满剩余高度（内容更高时自然撑开、由页面滚动）。
// 各步骤组件不再写 height:100vh —— 那会让内容从步骤条下方再撑满一屏。
.step-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
