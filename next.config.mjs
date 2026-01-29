/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-side packages that shouldn't be bundled
  serverExternalPackages: [
    "dockerode",
    "docker-modem",
    "ssh2",
    "better-sqlite3",
    "node-pty",
  ],
};

export default nextConfig;
