export interface props {
  text?: string
  fontSize?: number
  gap?: number
  styles?: string
  /** rotation angle in degrees (default: -45) */
  rotation?: number
  /** image source for watermark: URL string, SVG string (starts with '<svg'), or HTMLImageElement */
  image?: string | HTMLImageElement
  /** image scale relative to canvas size (0-1). default 0.6 */
  imageScale?: number
  /** text color for watermark. Can be CSS color string or 'auto' to follow prefers-color-scheme */
  color?: string | 'auto'
  /** used when color='auto' in dark mode */
  autoColorDark?: string
  /** used when color='auto' in light mode */
  autoColorLight?: string
}
