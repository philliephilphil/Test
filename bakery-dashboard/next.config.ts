import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The data-reading API routes build their file paths dynamically
  // (path.join(process.cwd(), "data", file)), which Next.js cannot trace
  // statically. Explicitly include the data folder so the files are bundled
  // into the serverless functions on Vercel. See node_modules/next/dist/docs/
  // .../config/01-next-config-js/output.md.
  outputFileTracingIncludes: {
    "/api/*": ["./data/**/*"],
  },
};

export default nextConfig;
