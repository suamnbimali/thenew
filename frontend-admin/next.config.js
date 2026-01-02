/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_POCKETBASE_URL: process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090',
    NEXT_PUBLIC_SCHADS_ENGINE_URL: process.env.NEXT_PUBLIC_SCHADS_ENGINE_URL || 'http://localhost:8001',
    NEXT_PUBLIC_MATCHING_ENGINE_URL: process.env.NEXT_PUBLIC_MATCHING_ENGINE_URL || 'http://localhost:8002',
  },
}

module.exports = nextConfig
