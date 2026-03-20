import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // UI primitives re-export all Radix components — unused ones are intentional (library pattern)
  ignore: ['src/components/ui/**'],
}

export default config
