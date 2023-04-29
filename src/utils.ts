import { computed } from 'vue'
export function useWatermarkBg(props: { fontSize: number; text: string; gap: number }) {
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
