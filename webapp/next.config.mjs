/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 完全クライアントサイド処理のためサーバAPIは使わない。
  // exceljs 等の Node 系依存をクライアントバンドルで扱えるよう webpack fallback を無効化。
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, stream: false, crypto: false };
    return config;
  },
};

export default nextConfig;
