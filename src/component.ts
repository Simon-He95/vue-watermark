import type { DefineComponent } from 'vue'
import type { props } from './types'
import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  watchEffect,
} from 'vue'
import { useWatermarkBg } from './utils'

export const WaterMark = defineComponent({
  name: 'WaterMark',
  props: {
    text: {
      type: String,
      // default provided below; not marked as required to avoid runtime contradictions
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
    rotation: {
      type: Number,
      default: -45,
    },
    image: {
      type: [String, Object] as any,
      default: '',
    },
    imageScale: {
      type: Number,
      default: 0.6,
    },
    color: {
      type: String,
      default: 'auto',
    },
    autoColorDark: {
      type: String,
      default: 'rgba(255,255,255,0.35)',
    },
    autoColorLight: {
      type: String,
      default: 'rgba(0,0,0,0.3)',
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
      // ensure updateCount is tracked as a dependency
      void updateCount.value
      if (!waterRef.value)
        return
      if (div)
        div.remove()
      div = document.createElement('div')
      const { base64, styleSize } = bg.value
      // Make watermark overlay non-interactive and hidden from assistive tech
      div.style.cssText = `background-image:url(${base64});background-size:${styleSize}px ${styleSize}px;background-repeat:repeat;width:100%;height:100%;z-index:9999;position:absolute;inset:0;pointer-events:none;${props.styles}`
      div.setAttribute('aria-hidden', 'true')
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
            void updateCount.value++
            continue
          }
        }
      })
      observer.observe(waterRef.value!, {
        childList: true,
        subtree: true,
        attributes: true,
      })
    })

    onUnmounted(() => {
      observer && observer.disconnect()
      div = null
    })

    return () =>
      h(
        'div',
        {
          'class': 'water-container',
          'data-watermark': '',
          'style': {
            position: 'relative',
          },
          'ref': waterRef,
        },
        slots?.default?.(),
      )
  },
}) as DefineComponent<props & Record<string, any>>
