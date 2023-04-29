import type { DefineComponent } from 'vue'
import { defineComponent, h, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { useWatermarkBg } from './utils'
import type { props } from './types'
export const waterMark = defineComponent({
  name: 'WaterMark',
  props: {
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
  },
  setup(props, { slots }) {
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

    return () => h('div', {
      'class': 'water-container',
      'data-watermark': '',
      'style': {
        position: 'relative',
      },
      'relative': '',
      'ref': waterRef,
    },
    slots?.default?.(),
    )
  },
}) as DefineComponent<props & Record<string, any>>
