<template>
  <view class="step-indicator">
    <view
      v-for="step in 3"
      :key="step"
      class="step-dot"
      :class="{ active: step === currentStep, completed: step < currentStep }"
    >
      <text class="dot-number">{{ step }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'StepIndicator',
  props: {
    currentStep: {
      type: Number,
      default: 1,
      validator: (value) => value >= 1 && value <= 3
    }
  }
}
</script>

<style lang="scss" scoped>
.step-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 0;
}

.step-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &.active {
    background: $watermark-accent-color;
    border-color: $watermark-accent-color;
    box-shadow: 0 0 20rpx rgba(0, 245, 255, 0.4);

    .dot-number {
      color: #0F0F1A;
      font-weight: bold;
    }
  }

  &.completed {
    background: $watermark-primary-gradient;
    border-color: #667eea;
  }
}

.dot-number {
  font-size: 22rpx;
  color: $watermark-text-secondary;
  font-weight: 500;
}
</style>
