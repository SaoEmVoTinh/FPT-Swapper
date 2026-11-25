import os from "node:os";
import type { NextConfig } from "next";

const localIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface): iface is os.NetworkInterfaceInfo => Boolean(iface && iface.family === "IPv4"))
  .map((iface) => iface.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: Array.from(new Set(["localhost", "127.0.0.1", "172.18.224.1", ...localIps])),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
