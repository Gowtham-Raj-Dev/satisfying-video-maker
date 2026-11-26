const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim();
const basePath = rawBasePath && rawBasePath !== "/" ? rawBasePath : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
  reactStrictMode: false,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
