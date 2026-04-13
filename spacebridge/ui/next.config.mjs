/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // better-sqlite3 is a native module — exclude from bundling, load at runtime
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
