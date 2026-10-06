"use client"

import { Text, useSharedRecords } from "@/components/i18n/language-provider"

import { useCallback, useEffect, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import GearEnhancement from "@/components/gear-enhancement"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import Image from "@/components/next-image"
import { ArtifactData } from "@/model/Artifact"
import type { ModelFile } from "@/model/Hero_Model"
import { ArtifactEffectBadges } from "@/components/artifact-effect-badges"

const ArtifactModels = dynamic(() => import("@/app/artifacts/components/models"), {
	ssr: false,
	loading: () => (
		<div className="flex h-96 items-center justify-center">
			<Spinner className="h-8 w-8" />
		</div>
	),
})

function getTabFromHash() {
	return typeof window !== "undefined" && window.location.hash === "#models" ? "models" : "effects"
}

interface ArtifactClientProps {
	artifactData: ArtifactData
	sortedArtifactSlugs: string[]
	artifactModels: ModelFile[]
}

export default function ArtifactClient({ artifactData: sourceArtifact, sortedArtifactSlugs, artifactModels }: ArtifactClientProps) {
	const router = useRouter()
	const shared = useSharedRecords()
	const artifactData = shared.artifacts?.find(record => record.id === sourceArtifact.id) ?? sourceArtifact
	const [isNavigating, startTransition] = useTransition()
	const [activeTab, setActiveTab] = useState(getTabFromHash)
	const hasModels = artifactModels.length > 0

	useEffect(() => {
		const handleHashChange = () => setActiveTab(getTabFromHash())
		window.addEventListener("hashchange", handleHashChange)
		return () => window.removeEventListener("hashchange", handleHashChange)
	}, [])

	const handleTabChange = (value: string) => {
		setActiveTab(value)
		window.history.replaceState(window.history.state, "", `#${value}`)
	}
	const enhancementValues = Object.fromEntries(
		Object.entries(artifactData.value ?? {}).map(([statKey, values]) => [
			statKey,
			Object.fromEntries(values.split(",").map((value, level) => [String(level), value.trim()])),
		]),
	)

	const handleNavigate = useCallback(
		(direction: "prev" | "next") => {
			let slugs = sortedArtifactSlugs
			if (typeof window !== "undefined") {
				const stored = sessionStorage.getItem("currentArtifactList")
				if (stored) {
					try {
						const parsed = JSON.parse(stored)
						if (Array.isArray(parsed) && parsed.length > 0) slugs = parsed
					} catch {
						// fallback to alphabetical order
					}
				}
			}

			if (!slugs || slugs.length === 0) return
			const currentSlug = artifactData.id.toLowerCase().replace(/\s+/g, "-")
			const currentIndex = slugs.indexOf(currentSlug)
			if (currentIndex === -1) return

			let targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1
			if (targetIndex < 0) targetIndex = slugs.length - 1
			if (targetIndex >= slugs.length) targetIndex = 0

			startTransition(() => {
				router.replace(`/artifacts/${slugs[targetIndex]}${window.location.hash}`)
			})
		},
		[sortedArtifactSlugs, artifactData.id, router, startTransition],
	)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented) return
			if (e.target instanceof HTMLElement && e.target.closest('[role="tablist"]')) return
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
			if (e.key === "ArrowLeft") handleNavigate("prev")
			if (e.key === "ArrowRight") handleNavigate("next")
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [handleNavigate])

	return (
		<div className="relative">
			{/* Full-dialog navigation loading overlay */}
			{isNavigating && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
					<Spinner className="h-10 w-10" />
				</div>
			)}
			{/* Artifact Header */}
			<div className="flex flex-row gap-4 items-center min-h-22.5 md:min-h-24.5 pb-2 relative">
				{/* Navigation Buttons */}
				{sortedArtifactSlugs && sortedArtifactSlugs.length > 0 && (
					<div className="absolute top-0 right-0 flex gap-1 z-10">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleNavigate("prev")}
							title="Previous Artifact"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							disabled={isNavigating}
						>
							<ChevronLeft className="h-5 w-5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleNavigate("next")}
							title="Next Artifact"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							disabled={isNavigating}
						>
							<ChevronRight className="h-5 w-5" />
						</Button>
					</div>
				)}
				<div className="shrink-0 relative">
					<div className="w-16 h-16 md:w-20 md:h-20">
						<Image
							src={`/kingsraid-data/assets/${artifactData.thumbnail
								.split("/")
								.map(encodeURIComponent)
								.join("/")}`}
							alt={artifactData.id}
							width="0"
							height="0"
							sizes="20vw md:5vw"
							className="w-full h-auto rounded"
						/>
					</div>
				</div>
				<div className="grow min-w-0 self-start pr-18">
					<div className="flex flex-col">
						<h1 className="text-2xl md:text-3xl font-bold"><Text>{artifactData.name}</Text></h1>
					</div>
					<div className="mt-2">
						<ArtifactEffectBadges artifact={artifactData} />
					</div>
				</div>
			</div>

			<Tabs value={hasModels ? activeTab : "effects"} onValueChange={handleTabChange} className="w-full mt-2">
				<TabsList className="w-full overflow-x-auto overflow-y-hidden flex-nowrap justify-start">
					<TabsTrigger value="effects"><Text messageKey="uiEffects" /></TabsTrigger>
					{hasModels ? <TabsTrigger value="models"><Text messageKey="uiModels" /></TabsTrigger> : null}
				</TabsList>
				<TabsContent value="effects" className="mt-4 space-y-4">
					{/* Effects Description */}
					<div>
						<Card className="gap-2">
							<CardHeader>
								<CardTitle><Text messageKey="uiEffects" /></CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-lg">
									<GearEnhancement
										key={artifactData.id}
										name={artifactData.name}
										description={artifactData.description}
										descriptionByStar={artifactData.descriptionByStar}
										values={enhancementValues}
									/>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Story */}
					<div>
						<Card className="gap-2">
							<CardHeader>
								<CardTitle><Text messageKey="uiStory" /></CardTitle>
							</CardHeader>
							<CardContent>
								<div className="whitespace-pre-wrap"><Text>{artifactData.story}</Text></div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
				{hasModels ? (
					<TabsContent value="models" className="mt-4">
						<ArtifactModels
							key={artifactData.id}
							modelFiles={artifactModels}
							artifactName={artifactData.name}
						/>
					</TabsContent>
				) : null}
			</Tabs>
		</div>
	)
}
