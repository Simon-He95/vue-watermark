import { describe, expect, it } from 'vitest'
import * as lib from '../src'

describe('library exports', () => {
  it('should export WaterMark component', () => {
    expect(lib).toHaveProperty('WaterMark')
    expect(typeof lib.WaterMark).toBe('object')
  })
  it('should export types barrel', () => {
    // types are erased at runtime; just ensure the module shape exists
    expect(lib).toBeTruthy()
  })
})
