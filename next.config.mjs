/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel Hobby plan has a monthly image-optimization quota. With 130+
    // remote covers this quota is exhausted -> optimizer returns HTTP 402
    // and new covers break. Serve originals directly from their CDN instead
    // (covers are already 85-250KB, so optimization isn't worth the ceiling).
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};

export default nextConfig;
