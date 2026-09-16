<template>
  <view class="preview-saver">
    <!-- mode="aspectFit" 保证整图完整显示；容器高度由 flex:1 从页面骨架继承 -->
    <image class="preview-image" :src="imagePath" mode="aspectFit" />

    <!-- 按钮主次分层：主操作全宽 → 两个分享并排 → 换一张降级为文字链接 -->
    <view class="action-buttons">
      <button class="action-btn primary" @tap="handleSaveToAlbum">
        {{ saveButtonText }}
      </button>

      <view class="share-row">
        <button class="action-btn share" open-type="share" @tap="handleShareToFriend">
          分享给好友
        </button>
        <button class="action-btn share" open-type="share" @tap="handleShareToTimeline">
          分享到朋友圈
        </button>
      </view>

      <view class="reselect-link" @tap="handleReselect">换一张</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'PreviewSaver',
  props: {
    imagePath: {
      type: String,
      required: true
    },
    // 分享配置预留：由页面（index.vue 的 onShareAppMessage/onShareTimeline）引用。
    // 注意：页面级分享钩子只在页面组件中生效，子组件内定义会静默失效。
    shareConfig: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      saveButtonText: '保存到相册',
      hasSaved: false
    }
  },
  mounted() {
    // #ifdef MP-WEIXIN
    // wx.showShareMenu 是微信独有 API，其他端调用会直接报错，用条件编译隔离
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
      fail: (err) => {
        console.error('分享菜单设置失败:', err)
      }
    })
    // #endif
  },
  methods: {
    async handleSaveToAlbum() {
      try {
        // uni-app Vue2 promise 化约定：await uni.* API（无回调时）resolve 为 [err, res]，不会 reject
        const [err] = await uni.saveImageToPhotosAlbum({
          filePath: this.imagePath
        })

        if (err) {
          console.error('保存失败:', err)
          this.showSaveError(err)
          return
        }

        this.hasSaved = true
        this.saveButtonText = '已保存 ✓'

        uni.showToast({
          title: '保存成功！可从相册分享到微信',
          icon: 'success',
          duration: 3000
        })

        this.$emit('saved')
      } catch (err) {
        // 兼容未来切换为标准 reject 风格或原生回调异常
        console.error('保存失败:', err)
        this.showSaveError(err)
      }
    },
    /**
     * 保存失败处理：权限拒绝时引导去设置页
     * @param {Object} err - uni API 返回的错误对象
     */
    showSaveError(err) {
      // 空值保护：errMsg 可能缺失
      if (err && err.errMsg && err.errMsg.includes('auth')) {
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
    },
    handleShareToFriend() {
      // 微信小程序通过 button open-type="share" 触发，
      // 分享内容由页面级 onShareAppMessage 决定
    },
    handleShareToTimeline() {
      // 朋友圈分享同样通过 button open-type="share" 触发，
      // 微信根据页面级 onShareTimeline 返回的配置处理
    },
    handleReselect() {
      this.$emit('reselect')
    }
  }
}
</script>

<style lang="scss" scoped>
// 不写 height:100vh/100% —— 高度由父级 .step-body 撑开，内容超高时交给页面滚动
.preview-saver {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 30rpx 30rpx;
  box-sizing: border-box;
}

.preview-image {
  flex: none;
  // 确定高度：aspectFit 在这个盒子里完整显示整图，且不依赖上一步的布局
  height: 52vh;
  min-height: 420rpx;
  width: 100%;
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.2);
}

.action-buttons {
  flex: none;
  // 内容不足一屏时压到底部；超出时随页面滚动
  margin-top: auto;
  padding-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.share-row {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  padding: 26rpx 0;
  border-radius: 48rpx;
  border: none;
  transition: all 0.2s ease;

  &.primary {
    width: 100%;
    background: $watermark-primary-gradient;
    color: $watermark-text-primary;
    font-size: 32rpx;
    font-weight: 600;

    &:active {
      transform: scale(0.98);
    }
  }

  &.share {
    flex: 1;
    font-size: 28rpx;
    background: rgba(255, 255, 255, 0.08);
    color: $watermark-text-primary;
    border: 2rpx solid rgba(255, 255, 255, 0.15);

    &:active {
      transform: scale(0.98);
      background: rgba(255, 255, 255, 0.12);
    }
  }
}

.reselect-link {
  text-align: center;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: $watermark-text-secondary;

  &:active {
    color: $watermark-text-primary;
  }
}
</style>
