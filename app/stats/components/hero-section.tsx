"use client"

import { Text } from "@/components/i18n/language-provider"

import { useState, useCallback } from "react"
import Image from "@/components/next-image"
import { ArrowRight, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ComparisonContent } from "@/app/stats/components/comparison-content"
import type { HeroComparison, HeroSegment } from "@/app/stats/types"

export function HeroSection({
	heroName,
	heroClass,
	heroThumbnail,
	overallStatus,
	segments,
	heroPairMap,
}: {
	heroName: string
	heroClass: string
	heroThumbnail: string
	overallStatus: "changed" | "added" | "removed"
	segments: HeroSegment[]
	heroPairMap: Record<string, Record<string, HeroComparison>>
}) {
	const [open, setOpen] = useState(false)

	const segmentKey = useCallback((seg: HeroSegment) => `${seg.versionA}_vs_${seg.versionB}`, [])

	const totalChanges = segments.reduce((acc, seg) => {
		const d = seg.diff
		if (!d || d.status !== "changed") return acc
		return acc + d.changeCount
	}, 0)

	const lastSeg = segments[segments.length - 1]

	const statusBadge =
		overallStatus === "added" ? (
			<Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30 text-xs">
				<Text messageKey="uiAddedIn" suffix=" " /><Text>{lastSeg.versionBLabel}</Text>
			</Badge>
		) : overallStatus === "removed" ? (
			<Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 text-xs">
				<Text messageKey="uiRemovedIn" suffix=" " /><Text>{lastSeg.versionBLabel}</Text>
			</Badge>
		) : (
			<Badge variant="secondary" className="text-xs">
				{totalChanges} <Text messageKey="uiChanges_d0b4ba23" /></Badge>
		)

	return (
		<Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg overflow-hidden">
			<CollapsibleTrigger className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors">
				<ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", !open && "-rotate-90")} />
				<Image
					src={`/kingsraid-data/assets/${heroThumbnail}`}
					alt={heroName}
					width={32}
					height={32}
					className="rounded shrink-0 object-cover"
					style={{ width: 32, height: 32 }}
				/>
				<div className="flex flex-col min-w-0">
					<span className="font-semibold text-sm"><Text>{heroName}</Text></span>
					<span className="text-xs text-muted-foreground"><Text>{heroClass}</Text></span>
				</div>
				<div className="ml-auto">{statusBadge}</div>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="border-t divide-y">
					{segments.map((seg) => {
						const key = segmentKey(seg)
						const diff = seg.diff
						const comparison = heroPairMap[key]?.[heroName]
						return (
							<div key={key} className="px-4 py-3">
								{segments.length > 1 && (
									<div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										<Text>{seg.versionALabel}</Text>
										<ArrowRight className="w-3 h-3" />
										<Text>{seg.versionBLabel}</Text>
									</div>
								)}
								{!diff || diff.status === "added" ? (
									<p className="text-sm text-muted-foreground">
										<Text>{heroName}</Text> <Text messageKey="uiWasAddedIn" suffix=" " /><Text>{seg.versionBLabel}</Text>.
									</p>
								) : diff.status === "removed" ? (
									<p className="text-sm text-muted-foreground">
										<Text>{heroName}</Text> <Text messageKey="uiWasRemovedIn" suffix=" " /><Text>{seg.versionBLabel}</Text>.
									</p>
								) : diff.changeCount === 0 ? (
									<p className="text-sm text-muted-foreground"><Text messageKey="uiNoChangesInThisSegment" /></p>
								) : comparison ? (
									<ComparisonContent comparison={comparison} />
								) : (
									<p className="text-sm text-muted-foreground"><Text messageKey="uiComparisonDataUnavailable" /></p>
								)}
							</div>
						)
					})}
				</div>
			</CollapsibleContent>
		</Collapsible>
	)
}
