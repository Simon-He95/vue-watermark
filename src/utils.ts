import { ref, unref, watch } from 'vue'

interface Bg {
  base64: string
  size: number
  styleSize: number
}

function createCanvasAndDrawText(
  textVal: string,
  font: string,
  rotationVal: number,
  canvasSize: number,
  fillColor = 'rgba(0,0,0,0.3)',
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = canvasSize
  canvas.height = canvasSize
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((Math.PI / 180) * rotationVal)
  ctx.fillStyle = fillColor
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(textVal, 0, 0)
  return canvas
}

function drawImageToCanvas(
  img: HTMLImageElement,
  rotationVal: number,
  canvasSize: number,
  imageScale = 0.6,
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = canvasSize
  canvas.height = canvasSize
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((Math.PI / 180) * rotationVal)
  // draw image centered and scaled to fit within canvasSize * 0.6
  const w = img.width
  const h = img.height
  const scale = Math.min(
    (canvasSize * imageScale) / w,
    (canvasSize * imageScale) / h,
  )
  ctx.drawImage(img, -(w * scale) / 2, -(h * scale) / 2, w * scale, h * scale)
  return canvas
}

export function useWatermarkBg(props: any) {
  const bg = ref<Bg>({ base64: '', size: 0, styleSize: 0 })

  // SSR guard: nothing to do server-side
  if (typeof document === 'undefined' || typeof window === 'undefined')
    return bg

  const update = async () => {
    const dpr = window.devicePixelRatio || 1
    const fontSizeVal = unref(props.fontSize ?? 40)
    const textVal = unref(props.text ?? '')
    const gapVal = unref(props.gap ?? 20)
    const rotationVal = unref(props.rotation ?? -45)
    const imageVal = unref(props.image ?? '')
    const colorProp = unref(props.color ?? 'auto')
    // determine fill color
    let fillColor = ''
    if (colorProp === 'auto') {
      // Prefer app-level dark class if present; otherwise fallback to system
      const hasDarkClass = !!(
        (document?.documentElement
          && document.documentElement.classList.contains('dark'))
        || (document?.body && document.body.classList.contains('dark'))
      )
      let isDark = hasDarkClass
      if (!hasDarkClass) {
        const mq
          = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
        isDark = mq ? mq.matches : false
      }
      const autoDark = unref(props.autoColorDark ?? 'rgba(255,255,255,0.35)')
      const autoLight = unref(props.autoColorLight ?? 'rgba(0,0,0,0.3)')
      fillColor = isDark ? autoDark : autoLight
    }
    else {
      // Support CSS variable, e.g. 'var(--wm-color)'
      const isVar
        = typeof colorProp === 'string' && colorProp.trim().startsWith('var(')
      if (isVar) {
        const inside = colorProp.trim().slice(4, -1)
        const [nameRaw, fallbackRaw] = inside.split(',')
        const name = nameRaw?.trim() || ''
        const fallback = fallbackRaw?.trim() || ''
        const resolved = name
          ? getComputedStyle(document.documentElement)
              .getPropertyValue(name)
              .trim()
          : ''
        fillColor = resolved || fallback || '#000000'
      }
      else {
        fillColor = colorProp
      }
    }
    const imageScale = unref(props.imageScale ?? 0.6)

    const size = fontSizeVal * dpr
    const font = `${size}px serif`

    // prepare a temporary ctx to measure text width
    const measureCanvas = document.createElement('canvas')
    const measureCtx = measureCanvas.getContext('2d')!
    measureCtx.font = font
    const { width } = measureCtx.measureText(textVal || '')
    const canvasSize = Math.max(100, width) + gapVal * dpr

    // If image is provided and is an HTMLImageElement that's already loaded, draw it sync
    if (
      imageVal
      && (imageVal as any).tagName === 'IMG'
      && (imageVal as any).complete
    ) {
      try {
        const canvas = drawImageToCanvas(
          imageVal as HTMLImageElement,
          rotationVal,
          canvasSize,
          imageScale,
        )
        bg.value = {
          base64: canvas.toDataURL(),
          size: canvasSize,
          styleSize: canvasSize / dpr,
        }
        return
      }
      catch {
        // fallthrough to text
      }
    }

    // If imageVal is a string, attempt to load it as an image (supports data URL, svg text via blob)
    if (typeof imageVal === 'string' && imageVal.trim()) {
      let src = imageVal.trim()
      // If it's an inline svg string (starts with <svg), create a blob URL
      if (src.startsWith('<svg')) {
        const blob = new Blob([src], { type: 'image/svg+xml' })
        src = URL.createObjectURL(blob)
      }

      const img = new Image()
      // try to avoid tainting canvas; allow crossOrigin when needed
      img.crossOrigin = 'anonymous'
      const imgLoad = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => {
          resolve(img)
        }
        img.onerror = () => {
          reject(new Error('Image load error'))
        }
      })
      img.src = src
      try {
        const loaded = await imgLoad
        const canvas = drawImageToCanvas(
          loaded,
          rotationVal,
          canvasSize,
          imageScale,
        )
        bg.value = {
          base64: canvas.toDataURL(),
          size: canvasSize,
          styleSize: canvasSize / dpr,
        }
        // revoke blob URL if we created one
        if (src.startsWith('blob:')) {
          URL.revokeObjectURL(src)
        }
        return
      }
      catch {
        // image failed to load — fall back to text
        if (src.startsWith('blob:')) {
          URL.revokeObjectURL(src)
        }
      }
    }

    // Fallback: draw text with the computed fill color
    const canvas = createCanvasAndDrawText(
      textVal,
      font,
      rotationVal,
      canvasSize,
      fillColor,
    )
    bg.value = {
      base64: canvas.toDataURL(),
      size: canvasSize,
      styleSize: canvasSize / dpr,
    }
  }

  // run initial update
  update()

  // watch relevant props and update when they change
  watch(
    () => [
      unref(props.text),
      unref(props.image),
      unref(props.rotation),
      unref(props.fontSize),
      unref(props.gap),
      unref(props.imageScale),
      unref(props.color),
      unref(props.autoColorDark),
      unref(props.autoColorLight),
    ],
    () => {
      update()
    },
  )

  // If color is 'auto', listen to prefers-color-scheme and .dark class changes
  if (unref(props.color ?? 'auto') === 'auto') {
    // System theme changes
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => update()
      if (mq.addEventListener) {
        mq.addEventListener('change', handler)
      }
      else {
        mq.addListener(handler)
      }
    }

    // App-level .dark class changes on html/body
    const targets: Element[] = []
    if (document?.documentElement)
      targets.push(document.documentElement)
    if (document?.body)
      targets.push(document.body)
    const mo = new MutationObserver(() => update())
    for (const t of targets) {
      mo.observe(t, { attributes: true, attributeFilter: ['class'] })
    }
  }

  return bg
}
