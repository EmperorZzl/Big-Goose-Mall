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
  padding: 60rpx;
}

.picker-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2rpx dashed rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  padding: 80rpx 60rpx;
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
  color: rgba(255, 255, 255, 0.55);
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
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #FFFFFF;
  }

  &.camera {
    background: rgba(255, 255, 255, 0.1);
    color: #FFFFFF;
    border: 2rpx solid rgba(255, 255, 255, 0.2);
  }

  &::active {
    transform: scale(0.96);
  }
}
</style>
