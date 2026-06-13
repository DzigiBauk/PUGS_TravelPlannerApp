import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function requireProxyTarget(env: Record<string, string>, name: string): string {
  const value = env[name]
  if (!value) {
    throw new Error(`Required environment variable ${name} is not configured.`)
  }

  return value
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/user-api': {
          target: requireProxyTarget(env, 'USER_SERVICE_PROXY_TARGET'),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/user-api/, ''),
        },
        '/travelplan-api': {
          target: requireProxyTarget(env, 'TRAVEL_PLAN_SERVICE_PROXY_TARGET'),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/travelplan-api/, ''),
        },
        '/route-api': {
          target: requireProxyTarget(env, 'ROUTE_SERVICE_PROXY_TARGET'),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/route-api/, ''),
        },
      },
    },
  }
})
