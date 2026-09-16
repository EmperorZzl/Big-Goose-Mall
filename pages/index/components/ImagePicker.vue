<template>
  <view class="image-picker">
    <view class="picker-card" @tap="handlePickFromAlbum">
      <view class="picker-icon">🖼️</view>
      <text class="picker-text">选择一张图片</text>
      <view class="picker-buttons">
        <button class="picker-btn album" @tap.stop="handlePickFromAlbum">相册</button>
        <button class="picker-btn camera" @tap.stop="handlePickFromCamera">拍照</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ImagePicker',
  methods: {
    handlePickFromAlbum() {
      this.chooseImage(['album'])
    },
    handlePickFromCamera() {
      this.chooseImage(['camera'])
    },
    chooseImage(sourceType) {
      uni.chooseImage({
        count: 1,
        sourceType,
        sizeType: ['original', 'compressed'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0]
          this.$emit('select', { tempFilePath })
        },
        fail: (err) => {
          // 用户取消选择（errMsg 含 'cancel'）属正常操作，不弹权限引导
          if (err && err.errMsg && err.errMsg.includes('cancel')) {
            return
          }
          console.error('选择图片失败:', err)
          uni.showModal({
            title: '权限受限',
            content: '请在设置中开启相册或相机权限',
            showCancel: true,
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                uni.openSetting()
              }
            }
          })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.image-picker {
  // flex:1 吃满步骤区剩余高度，把选择卡片垂直居中
  flex: 1;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
}

.picker-card {
  width: 100%;
  background: $watermark-bg-card;
  border: 2rpx dashed rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  padding: 80rpx 60rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.08);
  }
}

.picker-icon {
  font-size: 120rpx;
  opacity: 0.8;
}

.picker-text {
  font-size: 32rpx;
  color: $watermark-text-secondary;
}

.picker-buttons {
  display: flex;
  gap: 24rpx;
  margin-top: 20rpx;
}

.picker-btn {
  padding: 20rpx 48rpx;
  border-radius: 48rpx;
  font-size: 28rpx;
  border: none;
  transition: all 0.2s ease;

  &.album {
    background: $watermark-primary-gradient;
    color: $watermark-text-primary;
  }

  &.camera {
    background: rgba(255, 255, 255, 0.1);
    color: $watermark-text-primary;
    border: 2rpx solid rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: scale(0.96);
  }
}
</style>
