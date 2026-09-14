"use client"

import Image from "@/components/next-image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, startTransition } from "react"
import { Spinner } from "@/components/ui/spinner"

export type ViewMode = "splashart" | "icon"

export default function HeroCard({
	name,
	splashart,
	reverseSA = false,
	viewMode = "splashart",
	// blurDataURLMap = {},
}: {
	name: string
	splashart: string
	reverseSA: boolean
	viewMode?: ViewMode
	// blurDataURLMap?: Record<string, string>
}) {
	const [loading, setLoading] = useState(false)
	const pathname = usePathname()

	// Reset spinner if navigation is cancelled or we return to the same page
	useEffect(() => {
		startTransition(() => setLoading(false))
	}, [pathname])

	// Derive icon path from splashart path (replace sa.png with ico.png)
	const iconPath = splashart.replace(/sa\.png$/, "ico.png")
	const imagePath = viewMode === "icon" ? iconPath : splashart
	// const imageKey = `/kingsraid-data/assets/${imagePath}`
	// const blurDataURL = blurDataURLMap[imageKey]

	const isIconView = viewMode === "icon"

	return (
		<Link
			key={name}
			className={`border rounded flex flex-col relative cursor-pointer overflow-hidden ${
				isIconView ? "w-24 h-24 sm:w-28 sm:h-28" : "w-40 h-56 sm:w-48 sm:h-64"
			}`}
			href={`/heroes/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}`}
			onClick={() => setLoading(true)}
		>
			<Image
				src={"/kingsraid-data/assets/" + imagePath}
				alt={name}
				fill
				sizes={isIconView ? "(min-width: 640px) 112px, 96px" : "(min-width: 640px) 192px, 160px"}
				className={`w-full flex-1 object-cover ${
					isIconView ? "object-center" : reverseSA ? "object-left" : "object-right"
				} hover:scale-110 transition-all duration-500`}
				// {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
			/>
			<div
				className={`font-bold w-full text-center absolute bottom-0 bg-linear-to-t from-black/70 to-transparent text-white ${
					isIconView ? "text-xs h-6 py-1" : "text-xl h-12 py-2"
				}`}
			>
				{name}
			</div>
			{loading && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
					<Spinner className="h-6 w-6 text-white" />
				</div>
			)}
		</Link>
	)
}
