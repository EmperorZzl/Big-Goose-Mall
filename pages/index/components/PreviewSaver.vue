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
      <button class="action-btn share" open-type="share" @tap="handleShareToTimeline">
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
    },
    // 分享配置预留：由页面（Task 9 的 onShareAppMessage/onShareTimeline）引用。
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
      // 微信会根据页面级 onShareTimeline 返回配置处理
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
