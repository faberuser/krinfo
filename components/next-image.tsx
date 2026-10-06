"use client"

import { useTranslation } from "@/components/i18n/language-provider"
import NextImage, { ImageProps as NextImageProps } from "next/image"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

interface CustomImageProps extends Omit<NextImageProps, "src"> {
	src: string
}

export default function Image({ src, ...props }: CustomImageProps) {
	const { t } = useTranslation()
	// Only prepend basePath for local images (not external URLs)
	if (!src.startsWith("http")) {
		const localSrc = src.startsWith("/") ? src : "/" + src
		src = basePath && (localSrc === basePath || localSrc.startsWith(`${basePath}/`))
			? localSrc
			: `${basePath}${localSrc}`
	}

	return <NextImage src={src} {...props} alt={t(props.alt)} />
}
