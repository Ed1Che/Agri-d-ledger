/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@agridl/shared-types', '@agridl/api-client'],
  serverExternalPackages: [],

  experimental: {
    // Workaround for Next.js 16.2 /_global-error prerender bug (E1068):
    // Run static page generation in the main process instead of workers so that
    // async-storage modules are available (same context as the server runtime).
    workerThreads: false,
  },
}

module.exports = nextConfig
