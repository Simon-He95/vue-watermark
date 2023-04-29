<script setup lang="ts">
const props = defineProps({
  text: {
    type: String,
    required: true,
    default: 'watermark',
  },
  fontSize: {
    type: Number,
    default: 40,
  },
  gap: {
    type: Number,
    default: 20,
  },
  styles: {
    type: String,
    default: '',
  },
})

const waterRef = ref<HTMLElement>()
const bg = useWatermarkBg(props)
let observer: MutationObserver
let div: HTMLElement | null
const updateCount = ref(0)
watchEffect(() => {
  updateCount.value
  if (!waterRef.value)
    return
  if (div)
    div.remove()
  div = document.createElement('div')
  const { base64, styleSize } = bg.value
  div.style.cssText = `background-image:url(${base64});background-size:${styleSize}px ${styleSize}px;background-repeat:repeat;width:100%;height:100%;z-index:9999;position:absolute;inset:0;${props.styles}`
  waterRef.value.appendChild(div)
})

// 监控dom变化
onMounted(() => {
  observer = new MutationObserver((entries) => {
    for (const entry of entries) {
      for (const dom of entry.removedNodes as any) {
        if (dom === div) {
          updateCount.value++
          continue
        }
      }
      if (entry.target === div) {
        // 更新属性
        updateCount.value++
        continue
      }
    }
  })
  observer.observe(waterRef.value!, { childList: true, subtree: true, attributes: true })
})

onUnmounted(() => {
  observer && observer.disconnect()
  div = null
})

function useWatermarkBg(props: { fontSize: number; text: string; gap: number }) {
  const { gap, text, fontSize } = props
  return computed(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const size = fontSize * dpr
    const font = `${size}px serif`
    ctx.font = font
    const { width } = ctx.measureText(text)
    const canvasSize = Math.max(100, width) + gap * dpr
    canvas.width = canvasSize
    canvas.height = canvasSize
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((Math.PI / 180) * -45)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)
    return {
      base64: canvas.toDataURL(),
      size: canvasSize,
      styleSize: canvasSize / dpr,
    }
  })
}
</script>

<template>
  <div ref="waterRef" class="water-container" relative>
    <slot />
  </div>
</template>

<style scoped>
</style>
