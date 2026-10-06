import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true"

const nextConfig: NextConfig = {
	output: isStaticExport ? "export" : undefined,
	basePath: basePath || undefined,
	images: {
		unoptimized: isStaticExport,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "*.steamstatic.com",
				pathname: "/images/**",
			},
		],
	},
}

export default createNextIntlPlugin("./i18n/request.ts")(nextConfig)
