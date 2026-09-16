<template>
  <view class="container">
    <!-- 标题：仅第 1 步做品牌露出。第 2/3 步要把高度让给图片预览 -->
    <view v-if="currentStep === 1" class="header">
      <text class="title">Big-Goose-Mall</text>
    </view>

    <!-- 步骤指示器 -->
    <step-indicator class="step-bar" :current-step="currentStep" />

    <!-- 步骤内容区：吃掉剩余高度，内部布局交给各步骤组件自己分配。
         动画用纯 CSS keyframes 而非 <transition> —— 微信小程序不支持 <transition>，
         uni 会把它当成未注册的自定义组件透传到 WXML，导致内容不渲染。
         每步外面包一层普通 view 承载动画：微信对自定义组件有样式隔离，
         类名加在组件标签上能否命中宿主节点不可靠；页面的 view 则没有这个问题。
         v-if 会销毁重建这层 view，所以每次切换动画都会重新跑一遍。 -->
    <view class="step-body">
      <!-- Step 1: 选择图片 -->
      <view v-if="currentStep === 1" class="step-wrap" :class="animClass">
        <image-picker @select="handleImageSelect" />
      </view>

      <!-- Step 2: 配置水印 -->
      <view v-else-if="currentStep === 2" class="step-wrap" :class="animClass">
        <watermark-editor
          :image-path="selectedImagePath"
          :initial-config="watermarkConfig"
          @config-change="handleConfigChange"
          @generate="handleGenerate"
          @reselect="handleReselect"
        />
      </view>

      <!-- Step 3: 预览保存 -->
      <view v-else class="step-wrap" :class="animClass">
        <preview-saver
          :image-path="generatedImagePath"
          @reselect="handleReselect"
          @saved="handleSaved"
        />
      </view>
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
      // 上一步的步骤号：用来判断切换方向，必须是响应式的 ——
      // computed 只按响应式依赖失效，挂在 `_` 前缀的非响应式实例属性上会永远返回第一次的值
      prevStep: 1,
      selectedImagePath: '',
      generatedImagePath: '',
      watermarkConfig: getDefaultConfig()
    }
  },
  computed: {
    /** 前进从右滑入、后退从左滑入 */
    animClass() {
      return this.currentStep < this.prevStep ? 'step-anim-back' : 'step-anim-forward'
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
    /**
     * 统一切换步骤。先记下上一步号，animClass 据此判断滑入方向
     */
    goToStep(step) {
      this.prevStep = this.currentStep
      this.currentStep = step
    },
    handleImageSelect({ tempFilePath }) {
      this.selectedImagePath = tempFilePath
      this.goToStep(2)
    },
    handleConfigChange(config) {
      this.watermarkConfig = { ...config }
      // 防抖保存配置
      this.debouncedSaveConfig()
    },
    handleGenerate({ config, imagePath }) {
      this.watermarkConfig = { ...config }
      this.generatedImagePath = imagePath
      this.goToStep(3)

      // 保存最终配置
      saveWatermarkConfig(config)
    },
    handleReselect() {
      this.selectedImagePath = ''
      this.generatedImagePath = ''
      this.goToStep(1)
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
    // 非响应式实例状态：Vue2 不把 `_` 前缀的键代理到实例上，
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

// 承载动画的外层：把可用高度完整传给里面的步骤组件
.step-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>

<!--
  步骤切换动画：淡入 + 水平滑动（设计文档第 5 节的动效承诺）。
  刻意不写 scoped —— 动画类名是加在子组件标签上的，会落到子组件根节点，
  而子组件根节点带的是它自己的 scope id，scoped 选择器匹配不到。
  用全局样式绕开这个作用域问题。
  220ms 落在 200–300ms 的合理区间；位移 32rpx 足够表达方向又不浮夸。
-->
<style lang="scss">
@keyframes step-in-forward {
  from {
    opacity: 0;
    transform: translateX(32rpx);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes step-in-back {
  from {
    opacity: 0;
    transform: translateX(-32rpx);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.step-anim-forward {
  animation: step-in-forward 0.22s ease both;
}

.step-anim-back {
  animation: step-in-back 0.22s ease both;
}
</style>
