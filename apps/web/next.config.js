/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@agridl/shared-types', '@agridl/api-client'],
  serverExternalPackages: [],
  experimental: {
      turbopack: {
        aliases: {
          'fs': 'empty-module',
          'module': 'empty-module',
          'perf_hooks': 'empty-module',
          'v8': 'empty-module',
        },
      },
    },

}

module.exports = nextConfig
