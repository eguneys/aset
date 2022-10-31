import { commonjs } from '@hyrious/esbuild-plugin-commonjs'
import {build } from 'esbuild'

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  outdir: "dist",
  platform: "node",
  plugins: [commonjs()]
}).catch(() => process.exit(1))
