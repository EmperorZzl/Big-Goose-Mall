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
  gap: 24rpx;
  padding: 40rpx 0;
}

.step-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &.active {
    background: #00F5FF;
    border-color: #00F5FF;
    box-shadow: 0 0 20rpx rgba(0, 245, 255, 0.4);

    .dot-number {
      color: #0F0F1A;
      font-weight: bold;
    }
  }

  &.completed {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-color: #667eea;
  }
}

.dot-number {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 500;
}
</style>
