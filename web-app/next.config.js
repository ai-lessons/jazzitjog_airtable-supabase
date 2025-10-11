// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname, // фиксируем корень проекта
  },
};

module.exports = nextConfig;
