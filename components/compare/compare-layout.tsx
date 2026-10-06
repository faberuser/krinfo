"use client"

import { GameLanguageScope } from "@/components/i18n/language-provider"
import { Text } from "@/components/i18n/language-provider"

import { ReactNode, useEffect, useRef } from "react"
import { DataVersionLabels } from "@/hooks/use-data-version"
import { DataVersion } from "@/lib/constants"
import { useCompareMode } from "@/hooks/use-compare-mode"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CompareLayoutProps {
	/** Single view content (when not in compare mode) */
	children: ReactNode
	/** Content renderer for each version */
	renderContent: (version: DataVersion) => ReactNode
	/** Available versions for this entity */
	availableVersions: DataVersion[]
	/** Optional: Custom class for the layout container */
	className?: string
	/** @deprecated Use renderContent instead. Left side content for compare mode */
	leftContent?: ReactNode
	/** @deprecated Use renderContent instead. Right side content for compare mode */
	rightContent?: ReactNode
}

export default function CompareLayout({
	children,
	renderContent,
	leftContent,
	rightContent,
	availableVersions,
	className,
}: CompareLayoutProps) {
	const { isCompareMode, compareVersions, leftVersion, rightVersion, isHydrated, syncScroll } = useCompareMode()

	const panelsRef = useRef<(HTMLDivElement | null)[]>([])
	const isScrolling = useRef(false)

	useEffect(() => {
		if (!syncScroll || !isCompareMode) return

		const handleScroll = (e: Event) => {
			if (isScrolling.current) return
			isScrolling.current = true

			const source = e.target as HTMLDivElement
			panelsRef.current.forEach((panel) => {
				if (panel && panel !== source) {
					panel.scrollTop = source.scrollTop
				}
			})

			requestAnimationFrame(() => {
				isScrolling.current = false
			})
		}

		// Keep a local copy of the elements we attached listeners to
		const attachedPanels: HTMLDivElement[] = []

		panelsRef.current.forEach((panel) => {
			if (panel) {
				panel.addEventListener("scroll", handleScroll, { passive: true })
				attachedPanels.push(panel)
			}
		})

		return () => {
			attachedPanels.forEach((panel) => {
				panel.removeEventListener("scroll", handleScroll)
			})
		}
	}, [syncScroll, isCompareMode, compareVersions.length])

	if (!isHydrated) {
		return <>{children}</>
	}

	if (!isCompareMode) {
		return <>{children}</>
	}

	// Support legacy leftContent/rightContent props
	if (leftContent !== undefined && rightContent !== undefined && !renderContent) {
		const leftAvailable = availableVersions.includes(leftVersion)
		const rightAvailable = availableVersions.includes(rightVersion)

		return (
			<div className={cn("hidden lg:flex lg:flex-row gap-3 lg:h-[calc(100vh-140px)] w-full", className)}>
				{/* Left Panel */}
				<div className="flex-1 min-w-0 flex flex-col">
					<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pb-2 mb-2 shrink-0">
						<Badge variant="secondary" className="text-sm font-medium">
							<Text>{DataVersionLabels[leftVersion]}</Text>
						</Badge>
					</div>
					{leftAvailable ? (
						<div
							className="flex-1 overflow-y-auto pr-2 custom-scrollbar compare-panel"
							ref={(el) => {
								panelsRef.current[0] = el
							}}
						>
							<GameLanguageScope version={leftVersion}>{leftContent}</GameLanguageScope>
						</div>
					) : (
						<div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg bg-muted/50">
							<Text messageKey="uiNotAvailableIn" suffix=" " /><Text>{DataVersionLabels[leftVersion]}</Text>
						</div>
					)}
				</div>

				{/* Right Panel */}
				<div className="flex-1 min-w-0 flex flex-col">
					<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pb-2 mb-2 shrink-0">
						<Badge variant="secondary" className="text-sm font-medium">
							<Text>{DataVersionLabels[rightVersion]}</Text>
						</Badge>
					</div>
					{rightAvailable ? (
						<div
							className="flex-1 overflow-y-auto pr-2 custom-scrollbar compare-panel"
							ref={(el) => {
								panelsRef.current[1] = el
							}}
						>
							<GameLanguageScope version={rightVersion}>{rightContent}</GameLanguageScope>
						</div>
					) : (
						<div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg bg-muted/50">
							<Text messageKey="uiNotAvailableIn" suffix=" " /><Text>{DataVersionLabels[rightVersion]}</Text>
						</div>
					)}
				</div>
			</div>
		)
	}

	// New multi-version layout
	return (
		<div className={cn("hidden lg:flex lg:flex-row gap-3 lg:h-[calc(100vh-140px)] w-full", className)}>
			{compareVersions.map((version, index) => {
				const isAvailable = availableVersions.includes(version)

				return (
					<div key={version} className="flex-1 min-w-0 flex flex-col">
						<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pb-2 mb-2 shrink-0">
							<Badge variant="secondary" className="text-sm font-medium">
								<Text>{DataVersionLabels[version]}</Text>
							</Badge>
						</div>
						{isAvailable ? (
							<div
								className="flex-1 overflow-y-auto pr-2 custom-scrollbar compare-panel"
								ref={(el) => {
									panelsRef.current[index] = el
								}}
							>
								<GameLanguageScope version={version}>{renderContent(version)}</GameLanguageScope>
							</div>
						) : (
							<div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg bg-muted/50">
								<Text messageKey="uiNotAvailableIn" suffix=" " /><Text>{DataVersionLabels[version]}</Text>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
