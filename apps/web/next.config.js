/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@agridl/shared-types', '@agridl/api-client'],
  serverExternalPackages: [],

}

module.exports = nextConfig
