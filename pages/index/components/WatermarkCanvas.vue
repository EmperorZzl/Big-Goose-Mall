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
