import { onScopeDispose, ref, unref, watch } from 'vue'

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

  let updateToken = 0
  let classObserver: MutationObserver | null = null
  let mediaQuery: MediaQueryList | null = null
  let mediaHandler: (() => void) | null = null

  const cleanupAutoListeners = () => {
    if (mediaQuery && mediaHandler) {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', mediaHandler)
      }
      else {
        mediaQuery.removeListener(mediaHandler as any)
      }
    }
    mediaQuery = null
    mediaHandler = null

    if (classObserver) {
      classObserver.disconnect()
      classObserver = null
    }
  }

  const commitCanvas = (
    canvas: HTMLCanvasElement,
    canvasSize: number,
    dpr: number,
    token: number,
  ) => {
    if (token !== updateToken)
      return false

    bg.value = {
      base64: canvas.toDataURL(),
      size: canvasSize,
      styleSize: canvasSize / dpr,
    }
    return true
  }

  const update = async () => {
    const token = ++updateToken
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
          = typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-color-scheme: dark)')
            : null
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
        const splitIndex = inside.indexOf(',')
        const name
          = splitIndex === -1 ? inside.trim() : inside.slice(0, splitIndex).trim()
        const fallback
          = splitIndex === -1 ? '' : inside.slice(splitIndex + 1).trim()
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
    if (imageVal && imageVal instanceof HTMLImageElement && imageVal.complete) {
      try {
        const canvas = drawImageToCanvas(
          imageVal,
          rotationVal,
          canvasSize,
          imageScale,
        )
        if (commitCanvas(canvas, canvasSize, dpr, token))
          return
      }
      catch {
        // fallthrough to text
      }
    }

    // If imageVal is a string, attempt to load it as an image (supports data URL, svg text via blob)
    if (typeof imageVal === 'string' && imageVal.trim()) {
      let blobUrl = ''
      let src = imageVal.trim()
      // If it's an inline svg string (starts with <svg), create a blob URL
      if (src.startsWith('<svg')) {
        const blob = new Blob([src], { type: 'image/svg+xml' })
        src = URL.createObjectURL(blob)
        blobUrl = src
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
        if (commitCanvas(canvas, canvasSize, dpr, token))
          return
      }
      catch {
        // image failed to load, fall back to text
      }
      finally {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl)
        }
      }
    }

    if (token !== updateToken)
      return

    // Fallback: draw text with the computed fill color
    const canvas = createCanvasAndDrawText(
      textVal,
      font,
      rotationVal,
      canvasSize,
      fillColor,
    )
    commitCanvas(canvas, canvasSize, dpr, token)
  }

  // watch relevant props and update when they change
  const stopPropsWatch = watch(
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
      void update()
    },
    { immediate: true },
  )

  const stopColorWatch = watch(
    () => unref(props.color ?? 'auto'),
    (color) => {
      cleanupAutoListeners()
      if (color !== 'auto')
        return

      // System theme changes
      mediaHandler = () => {
        void update()
      }

      // Legacy browsers can still use addListener/removeListener.
      if (typeof window.matchMedia === 'function') {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', mediaHandler)
        }
        else {
          mediaQuery.addListener(mediaHandler as any)
        }
      }

      // App-level .dark class changes on html/body
      const targets: Element[] = []
      if (document?.documentElement)
        targets.push(document.documentElement)
      if (document?.body)
        targets.push(document.body)
      classObserver = new MutationObserver(() => {
        void update()
      })
      for (const t of targets) {
        classObserver.observe(t, {
          attributes: true,
          attributeFilter: ['class'],
        })
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    // invalidate any in-flight async updates
    updateToken++
    stopPropsWatch()
    stopColorWatch()
    cleanupAutoListeners()
  })

  return bg
}
