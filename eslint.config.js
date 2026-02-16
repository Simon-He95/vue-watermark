import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      'node_modules',
      'dist',
      'pnpm-lock.yaml',
      'playground/shims.d.ts',
      'playground/components.d.ts',
    ],
  },
  {
    rules: {
      // overrides
    },
  },
)
