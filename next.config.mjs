/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  },
  webpack: (config) => {
    // pdfjs-dist optionally requires 'canvas' which we don't need for text extraction
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
