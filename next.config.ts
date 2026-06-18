import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  turbopack: {
    root: appDir,
  },
};

export default withNextIntl(nextConfig);
