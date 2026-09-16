<template>
  <view class="watermark-canvas-wrapper" :style="wrapperStyle">
    <canvas
      type="2d"
      :id="canvasId"
      :canvas-id="canvasId"
      :style="canvasStyle"
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
    // 容器宽度（rpx）。0 = 自适应内容宽度（预览尺寸已由父组件 contain-fit 算好，无需再约束）
    wrapperWidth: {
      type: Number,
      default: 0
    },
    canvasWidth: {
      type: Number,
      required: true // 实际像素宽度
    },
    canvasHeight: {
      type: Number,
      required: true // 实际像素高度
    },
    // 显示尺寸（CSS px）。0 = 与位图尺寸一致。
    // 导出场景传小尺寸让 canvas 完整落在视口内（位图仍为全尺寸，导出分辨率不受影响）
    displayWidth: {
      type: Number,
      default: 0
    },
    displayHeight: {
      type: Number,
      default: 0
    },
    imagePath: {
      type: String,
      default: ''
    },
    watermarkConfig: {
      type: Object,
      default: () => ({})
    },
    // 静默模式：渲染失败不弹 toast（导出 canvas 使用，由页面统一上报错误）
    silent: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      ctx: null,
      canvas: null
    }
  },
  computed: {
    /**
     * 容器样式：wrapperWidth 为 0 时不设宽度，让容器收缩包裹 canvas 并由外层居中，
     * 避免给预览尺寸再套一层固定的 rpx 宽度（会与实际量测出的尺寸打架）。
     * 返回字符串而非对象 —— WXML 的 style 绑定只可靠地接受字符串。
     */
    wrapperStyle() {
      return this.wrapperWidth > 0 ? `width:${this.wrapperWidth}rpx;` : ''
    },
    /**
     * canvas 的 CSS 显示尺寸与位图尺寸解耦：
     * 位图尺寸（canvas.width/height）决定导出分辨率，
     * 显示尺寸决定布局。canvas 必须完整位于视口内，
     * 否则真机原生层不光栅化，导出为空白图。
     */
    canvasStyle() {
      const w = this.displayWidth > 0 ? this.displayWidth : this.canvasWidth
      const h = this.displayHeight > 0 ? this.displayHeight : this.canvasHeight
      return `width:${w}px;height:${h}px;`
    }
  },
  created() {
    // 非响应式实例状态：Vue2 不会把 `_`/`$` 前缀的 data 键代理到实例上，
    // 因此这类状态必须挂在 created() 中作为普通实例属性
    this._initPromise = null
    this._renderId = 0
    this._pendingRender = null
    this._lastRenderFailed = false
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
        this._lastRenderFailed = false
      } catch (error) {
        // 仅由最新渲染上报错误，避免过期渲染重复弹 toast
        if (myId === this._renderId) {
          this._lastRenderFailed = true
          console.error('Canvas 渲染失败:', error)
          // 导出 canvas 处于静默模式，错误由页面（exportWatermarkedImage）统一抛出展示
          if (!this.silent) {
            uni.showToast({
              title: '渲染失败，请重试',
              icon: 'none'
            })
          }
        }
      } finally {
        if (this._pendingRender === task) {
          this._pendingRender = null
        }
      }
    },
    /**
     * 最近一次实际执行的渲染是否失败（用于导出前校验画布有效）
     * @returns {boolean}
     */
    hasRenderFailed() {
      return this._lastRenderFailed === true
    },
    /**
     * 等待画布内容落定：初始化完成 + 所有在途渲染结束。
     *
     * 渲染是异步的（drawWatermark 内需 await 图片加载），而 renderCanvas() 在
     * 「请求已过期」时会提前 return，并不代表绘制完成。若直接导出，读到的会是
     * clearRect 之后、drawImage 之前的透明画布（保存到相册显示为黑图）。
     * 导出前必须先调用本方法。
     * @returns {Promise<void>}
     */
    async waitForIdle() {
      if (this._initPromise) {
        try {
          await this._initPromise
        } catch (error) {
          return
        }
      }
      // 循环等待：等待期间可能又有新的渲染请求入队
      while (this._pendingRender) {
        await this._pendingRender.catch(() => {})
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
      // 等待初始化与在途渲染全部结束，避免导出尚未绘制完成的透明画布
      await this.waitForIdle()

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
