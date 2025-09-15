import { computed, unref } from 'vue'

export function useWatermarkBg(props: any) {
  // Support both plain props and reactive refs (component props)
  const { gap, text, fontSize } = props
  return computed(() => {
    // SSR guard: if document/window not available return empty image
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return {
        base64: '',
        size: 0,
        styleSize: 0,
      }
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return {
        base64: '',
        size: 0,
        styleSize: 0,
      }
    }
    const dpr = window.devicePixelRatio || 1
    const fontSizeVal = unref(fontSize)
    const textVal = unref(text)
    const gapVal = unref(gap)

    const size = fontSizeVal * dpr
    const font = `${size}px serif`
    ctx.font = font
    const { width } = ctx.measureText(textVal)
    const canvasSize = Math.max(100, width) + gapVal * dpr
    canvas.width = canvasSize
    canvas.height = canvasSize
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((Math.PI / 180) * -45)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(textVal, 0, 0)
    return {
      base64: canvas.toDataURL(),
      size: canvasSize,
      styleSize: canvasSize / dpr,
    }
  })
}
