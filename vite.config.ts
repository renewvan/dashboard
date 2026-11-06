import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, lazyPlugins, loadEnv } from 'vite-plus'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Unprefixed (non-VITE_) variables, for the dev proxy only: Vite does not load .env into process.env.
  const env = loadEnv(mode, __dirname, '')
  return {
    lint: {
      plugins: ['react', 'typescript', 'oxc'],
      rules: {
        'react/rules-of-hooks': 'error',
        'react/only-export-components': [
          'warn',
          {
            allowConstantExport: true,
          },
        ],
        'vite-plus/prefer-vite-plus-imports': 'error',
      },
      options: {
        typeAware: true,
        typeCheck: true,
      },
      jsPlugins: [
        {
          name: 'vite-plus',
          specifier: 'vite-plus/oxlint-plugin',
        },
      ],
    },
    fmt: {
      useTabs: false,
      tabWidth: 2,
      printWidth: 100,
      singleQuote: true,
      semi: false,
      trailingComma: 'all',
      arrowParens: 'always',
      sortPackageJson: false,
      sortTailwindcss: {},
      ignorePatterns: [
        'dist',
        'dist-ssr',
        'node_modules',
        'pnpm-lock.yaml',
        '*.min.*',
        'docs/',
        '.scratch/',
      ],
    },
    staged: {
      '*.{ts,tsx,js,jsx,mjs,cjs}': ['vp lint', 'vp fmt'],
      '*': 'vp fmt --no-error-on-unmatched-pattern',
    },
    plugins: lazyPlugins(() => [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          navigateFallback: '/index.html',
        },
      }),
    ]),
    server: {
      // History charts query InfluxDB at the same-origin `/influx`, which Caddy serves in production
      // and injects a read-only token into (ADR 0024). In dev, tunnel the hub's Influx
      // (`ssh -L 8086:localhost:8086 renewvan`) and put the read-only token in `.env` as
      // INFLUXDB_DASHBOARD_TOKEN (no VITE_ prefix, so it never reaches the bundle).
      proxy: {
        '/influx': {
          target: env.INFLUXDB_URL ?? 'http://localhost:8086',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/influx/, ''),
          headers: env.INFLUXDB_DASHBOARD_TOKEN
            ? { Authorization: `Token ${env.INFLUXDB_DASHBOARD_TOKEN}` }
            : {},
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
    },
  }
})
