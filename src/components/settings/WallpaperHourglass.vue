<template>
  <span class="settings-wallpaper-hourglass" :class="classes" aria-hidden="true">
    <span class="settings-wallpaper-hourglass__top">
      <span class="settings-wallpaper-hourglass__sand-top"></span>
    </span>
    <span class="settings-wallpaper-hourglass__sand-fall"></span>
    <span class="settings-wallpaper-hourglass__bottom">
      <span class="settings-wallpaper-hourglass__sand-bottom"></span>
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  size: { type: String, default: '' },
  light: { type: Boolean, default: false }
});

const classes = computed(() => {
  const list = [];
  if (props.size === 'sm') list.push('settings-wallpaper-hourglass--sm');
  if (props.light) list.push('settings-wallpaper-hourglass--light');
  return list;
});
</script>

<style scoped>
/* 定时翻转水晶沙漏（参考粉色玻璃 + 蓝沙；尺寸由 --hg-fs 控制） */
.settings-wallpaper-hourglass {
  --hg-fs: 1px;
  font-size: var(--hg-fs);
  width: 22em;
  height: 42em;
  position: relative;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
  box-sizing: border-box;
  animation: settings-hourglass-flip 1s ease-in-out infinite;
  filter: drop-shadow(0 0 0.35em rgba(255, 160, 195, 0.28));
}

.settings-wallpaper-hourglass--sm {
  --hg-fs: 0.72px;
}

.settings-wallpaper-hourglass__top,
.settings-wallpaper-hourglass__bottom {
  width: 22em;
  height: 21em;
  position: absolute;
  left: 0;
  border: none;
  background: rgba(255, 225, 235, 0.32);
  border-radius: 0.45em;
  backdrop-filter: blur(3px);
}

.settings-wallpaper-hourglass__top {
  top: 0;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

.settings-wallpaper-hourglass__bottom {
  bottom: 0;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.settings-wallpaper-hourglass__sand-top {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(173, 216, 230, 0.92), rgba(135, 206, 235, 0.92));
  border-radius: 0.35em;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  animation: settings-hourglass-sand-top 1s linear infinite;
}

.settings-wallpaper-hourglass__sand-fall {
  position: absolute;
  top: 21em;
  left: 50%;
  width: 0.18em;
  height: 21em;
  margin-left: -0.09em;
  background: rgba(135, 206, 235, 0.9);
  border-radius: 0.1em;
  animation: settings-hourglass-sand-fall 1s linear infinite;
  z-index: 10;
}

.settings-wallpaper-hourglass__sand-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(0deg, rgba(173, 216, 230, 0.92), rgba(135, 206, 235, 0.92));
  border-radius: 0.35em;
  clip-path: polygon(50% 100%, 100% 100%, 100% 100%, 0 100%, 0 100%, 50% 100%);
  animation: settings-hourglass-sand-bottom 1s linear infinite;
}

.settings-wallpaper-hourglass--light {
  filter: drop-shadow(0 0 0.45em rgba(255, 255, 255, 0.12));
}

.settings-wallpaper-hourglass--light .settings-wallpaper-hourglass__top,
.settings-wallpaper-hourglass--light .settings-wallpaper-hourglass__bottom {
  background: rgba(255, 240, 248, 0.38);
}

.settings-wallpaper-hourglass--light .settings-wallpaper-hourglass__sand-top {
  background: linear-gradient(180deg, rgba(191, 219, 254, 0.95), rgba(147, 197, 253, 0.95));
}

.settings-wallpaper-hourglass--light .settings-wallpaper-hourglass__sand-fall {
  background: rgba(186, 230, 253, 0.92);
}

.settings-wallpaper-hourglass--light .settings-wallpaper-hourglass__sand-bottom {
  background: linear-gradient(0deg, rgba(191, 219, 254, 0.95), rgba(147, 197, 253, 0.95));
}

@keyframes settings-hourglass-sand-top {
  0% {
    height: 100%;
  }
  90% {
    height: 0%;
  }
  100% {
    height: 0%;
  }
}

@keyframes settings-hourglass-sand-fall {
  0% {
    opacity: 1;
    height: 21em;
  }
  90% {
    opacity: 0;
    height: 0;
  }
  100% {
    opacity: 0;
    height: 0;
  }
}

@keyframes settings-hourglass-sand-bottom {
  0% {
    clip-path: polygon(50% 100%, 100% 100%, 100% 100%, 0 100%, 0 100%, 50% 100%);
  }
  90% {
    clip-path: polygon(50% 0%, 100% 100%, 100% 100%, 0 100%, 0 100%, 50% 0%);
  }
  100% {
    clip-path: polygon(50% 0%, 100% 100%, 100% 100%, 0 100%, 0 100%, 50% 0%);
  }
}

@keyframes settings-hourglass-flip {
  0% {
    transform: rotate(0deg);
  }
  90% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(180deg);
  }
}
</style>
