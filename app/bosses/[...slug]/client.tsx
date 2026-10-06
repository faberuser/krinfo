"use client"

import { Text, BossLanguageScope } from "@/components/i18n/language-provider"
import { useEffect, useState, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "@/components/next-image"
import { BossData } from "@/model/Boss"
import { ModelFile } from "@/model/Hero_Model"
import dynamic from "next/dynamic"
import DataHeavyContent from "@/components/data-heavy-content"
import { Spinner } from "@/components/ui/spinner"

// Dynamic import for heavy 3D model viewer
const BossModels = dynamic(() => import("@/app/bosses/components/models"), {
	loading: () => (
		<div className="flex items-center justify-center h-96">
			<Spinner className="h-8 w-8" />
		</div>
	),
	ssr: false,
})

// Boss models are now organized by variant (similar to hero costumes)
type BossModelData = Record<string, ModelFile[]>

interface BossClientProps {
	bossData: BossData
	bossModels?: BossModelData
	bossScenes?: Array<{ value: string; label: string }>
	enableModelsVoices?: boolean
	sortedBossSlugs: string[]
}

export default function BossClient(props: BossClientProps) {
	return (
		<BossLanguageScope boss={props.bossData}>
			{(bossData) => <BossContent {...props} bossData={bossData} />}
		</BossLanguageScope>
	)
}

function BossContent({
	bossData,
	bossModels,
	bossScenes = [],
	enableModelsVoices = false,
	sortedBossSlugs,
}: BossClientProps) {
	const router = useRouter()
	const { profile, skills } = bossData
	const [isNavigating, startTransition] = useTransition()

	const handleNavigate = useCallback(
		(direction: "prev" | "next") => {
			let slugs = sortedBossSlugs
			if (typeof window !== "undefined") {
				const stored = sessionStorage.getItem("currentBossList")
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
			const currentSlug = bossData.id.toLowerCase().replace(/\s+/g, "-")
			const currentIndex = slugs.indexOf(currentSlug)
			if (currentIndex === -1) return

			let targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1
			if (targetIndex < 0) targetIndex = slugs.length - 1
			if (targetIndex >= slugs.length) targetIndex = 0

			startTransition(() => {
				router.replace(`/bosses/${slugs[targetIndex]}${window.location.hash}`)
			})
		},
		[sortedBossSlugs, bossData.id, router],
	)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
			if (e.key === "ArrowLeft") handleNavigate("prev")
			if (e.key === "ArrowRight") handleNavigate("next")
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [handleNavigate])

	// Helper function to get tab from hash
	const getTabFromHash = () => {
		if (typeof window === "undefined") return "profile_skills"
		const hash = window.location.hash.slice(1) // Remove the '#'
		const validTabs = ["profile_skills", "models"]
		return validTabs.includes(hash) ? hash : "profile_skills"
	}

	// State to track active tab - initialize from URL hash
	const [activeTab, setActiveTab] = useState<string>(getTabFromHash)

	// Listen for hash changes (e.g., browser back/forward)
	useEffect(() => {
		const handleHashChange = () => {
			setActiveTab(getTabFromHash())
		}

		window.addEventListener("hashchange", handleHashChange)
		return () => window.removeEventListener("hashchange", handleHashChange)
	}, [])

	// Update URL hash when tab changes
	const handleTabChange = (value: string) => {
		setActiveTab(value)
		window.history.replaceState(null, "", `#${value}`)
	}

	return (
		<div className="relative">
			{/* Full-dialog navigation loading overlay */}
			{isNavigating && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
					<Spinner className="h-10 w-10" />
				</div>
			)}
			{/* Boss Header */}
			<div className="flex flex-row gap-4 items-center pb-2 relative">
				{/* Navigation Buttons */}
				{sortedBossSlugs && sortedBossSlugs.length > 0 && (
					<div className="absolute top-0 right-0 flex gap-1 z-10">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleNavigate("prev")}
							title="Previous Boss"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							disabled={isNavigating}
						>
							<ChevronLeft className="h-5 w-5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleNavigate("next")}
							title="Next Boss"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							disabled={isNavigating}
						>
							<ChevronRight className="h-5 w-5" />
						</Button>
					</div>
				)}
				{/* Boss Image */}
				<div className="shrink-0 relative">
					<div className="w-16 h-16 md:w-20 md:h-20">
						<Image
							src={`/kingsraid-data/assets/${profile.thumbnail}`}
							alt={profile.name}
							width="0"
							height="0"
							sizes="20vw md:5vw"
							className="w-full h-auto rounded"
						/>
					</div>
				</div>
				{/* Boss Name & Info */}
				<div className="grow min-w-0">
					<div className="flex flex-col">
						<h1 className="text-2xl md:text-3xl font-bold truncate">
							<Text>{profile.name}</Text>
						</h1>
						<span className="text-sm md:text-base text-muted-foreground">
							<Text>{profile.title}</Text>
						</span>
					</div>
					<div className="flex flex-wrap gap-2 mt-2">
						{bossData.profile.type.map((type) => (
							<Badge key={type} variant="default">
								<Text>{type}</Text>
							</Badge>
						))}
						<Badge variant="secondary">
							<Text>{profile.race}</Text>
						</Badge>
						<Badge
							variant="default"
							className={
								profile.damage_type === "Physical"
									? "bg-red-300"
									: profile.damage_type === "Magical"
										? "bg-blue-300"
										: "bg-yellow-300"
							}
						>
							<Text>{profile.damage_type}</Text>
						</Badge>
					</div>
				</div>
			</div>

			{/* Tabs Section */}
			<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-2">
				<TabsList className="w-full overflow-x-auto overflow-y-hidden flex-nowrap justify-start">
					<TabsTrigger value="profile_skills">
						<Text messageKey="uiProfileSkills" />
					</TabsTrigger>
					{enableModelsVoices && bossModels && Object.keys(bossModels).length > 0 && (
						<TabsTrigger value="models">
							<Text messageKey="uiModels" />
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="profile_skills" className="mt-4">
					<div className="space-y-4">
						<div className="grid md:grid-cols-2 gap-6">
							<Card className="gap-2">
								<CardHeader>
									<CardTitle>
										<Text messageKey="uiCharacteristics" />
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-sm">
										<Text>{profile.characteristics}</Text>
									</div>
								</CardContent>
							</Card>

							<Card className="gap-2">
								<CardHeader>
									<CardTitle>
										<Text messageKey="uiRecommendedHeroes" />
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-sm">
										<Text>{profile.recommended_heroes}</Text>
									</div>
								</CardContent>
							</Card>
						</div>

						{Object.entries(skills).map(([skillId, skill]) => (
							<Card key={skillId} className="gap-2">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex flex-row gap-2 items-center">
											<CardTitle
												className={`text-lg ${
													profile.damage_type === "Physical"
														? "text-red-300"
														: profile.damage_type === "Magical"
															? "text-blue-300"
															: "text-yellow-400"
												}`}
											>
												<Text>{skill.name}</Text>
											</CardTitle>
											<div className="flex gap-2">
												{skill.cost && (
													<Badge
														variant="default"
														className="bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-900"
													>
														<Text messageKey="uiCost_97c94eff" suffix=" " />
														<Text>{skill.cost}</Text>
													</Badge>
												)}
												{skill.cooldown && (
													<Badge
														variant="default"
														className="bg-orange-100 text-orange-800 dark:bg-orange-200 dark:text-orange-900"
													>
														<Text messageKey="uiCooldown_48ced960" suffix=" " />
														<Text>{skill.cooldown}</Text>s
													</Badge>
												)}
											</div>
										</div>
										<Badge variant="secondary">
											#<Text>{skillId}</Text>
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-sm">
										<Text>{skill.description}</Text>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				{enableModelsVoices && bossModels && Object.keys(bossModels).length > 0 && (
					<TabsContent value="models" className="mt-4">
						<DataHeavyContent
							description="This tab contains large 3D model files and textures that may consume significant mobile data."
							estimatedSize="30-60 MB"
						>
							<BossModels
								key={profile.name}
								bossModels={bossModels}
								bossScenes={bossScenes}
								bossName={bossData.id}
							/>
						</DataHeavyContent>
					</TabsContent>
				)}
			</Tabs>
		</div>
	)
}
