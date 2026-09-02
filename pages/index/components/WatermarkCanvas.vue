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
      canvas: null,
      _initPromise: null,
      _renderId: 0,
      _pendingRender: null
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
    },
    canvasWidth: {
      handler() {
        this.updateCanvasSize()
      },
      immediate: false
    },
    canvasHeight: {
      handler() {
        this.updateCanvasSize()
      },
      immediate: false
    }
  },
  mounted() {
    this.initCanvas()
  },
  methods: {
    async initCanvas() {
      this._initPromise = new Promise((resolve, reject) => {
        const query = uni.createSelectorQuery().in(this)
        query.select(`#${this.canvasId}`)
          .fields({ node: true, size: true })
          .exec(async (res) => {
            if (!res[0]) {
              console.error('Canvas 节点获取失败')
              reject(new Error('Canvas 节点获取失败'))
              return
            }

            const canvas = res[0].node
            const ctx = canvas.getContext('2d')

            // 设置 canvas 实际尺寸
            canvas.width = this.canvasWidth
            canvas.height = this.canvasHeight

            this.canvas = canvas
            this.ctx = ctx

            resolve()

            await this.renderCanvas()
          })
      })
    },
    async renderCanvas() {
      // 渲染序号：每次渲染请求递增，用于丢弃过期渲染结果
      const myId = ++this._renderId

      // 等待 canvas 初始化完成（init 竞态保护）
      if (this._initPromise) {
        try {
          await this._initPromise
        } catch (error) {
          return
        }
      }

      // 初始化期间出现新渲染请求，当前渲染已过期，丢弃
      if (myId !== this._renderId) {
        return
      }

      if (!this.ctx || !this.canvas || !this.imagePath) {
        return
      }

      // 串行化：等待上一个渲染完成，避免并发写入共享 ctx 导致花屏
      if (this._pendingRender) {
        await this._pendingRender.catch(() => {})
        // 等待期间出现新渲染请求，当前渲染过期，丢弃
        if (myId !== this._renderId) {
          return
        }
      }

      const task = drawWatermark({
        canvas: this.canvas,
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
        imagePath: this.imagePath,
        ...this.watermarkConfig
      })
      this._pendingRender = task

      try {
        await task
        // 绘制完成后若已有更新的渲染请求，本次结果视为过期
        if (myId !== this._renderId) {
          return
        }
      } catch (error) {
        // 仅由最新渲染上报错误，避免过期渲染重复弹 toast
        if (myId === this._renderId) {
          console.error('Canvas 渲染失败:', error)
          uni.showToast({
            title: '渲染失败，请重试',
            icon: 'none'
          })
        }
      } finally {
        if (this._pendingRender === task) {
          this._pendingRender = null
        }
      }
    },
    /**
     * 更新 canvas 实际尺寸并重渲染
     */
    async updateCanvasSize() {
      if (!this.canvas) {
        return
      }
      this.canvas.width = this.canvasWidth
      this.canvas.height = this.canvasHeight
      await this.renderCanvas()
    },
    /**
     * 导出为临时文件
     * @returns {Promise<string>} 临时文件路径
     */
    async exportToTempFilePath() {
      // 等待 canvas 初始化完成（init 竞态保护）
      if (this._initPromise) {
        await this._initPromise
      }

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
