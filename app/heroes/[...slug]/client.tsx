"use client"

import { useEffect, useState, Suspense, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { HeroData } from "@/model/Hero"
import Profile from "@/app/heroes/components/profile"
import Skills from "@/app/heroes/components/skills"
import Perks from "@/app/heroes/components/perks"
import Gear from "@/app/heroes/components/gear"
import Costumes from "@/app/heroes/components/costumes"
import dynamic from "next/dynamic"
import Voices, { VoiceFiles } from "@/app/heroes/components/voices"
import { capitalize, classColorMapBadge } from "@/lib/utils"
import Image from "@/components/next-image"
import { Costume, ModelFile } from "@/model/Hero_Model"
import DataHeavyContent from "@/components/data-heavy-content"
import { ClassPerksData } from "@/app/heroes/components/perks"
import { Spinner } from "@/components/ui/spinner"

// Dynamic import for heavy 3D model viewer
const Models = dynamic(() => import("@/app/heroes/components/models"), {
	loading: () => (
		<div className="flex items-center justify-center h-96">
			<Spinner className="h-8 w-8" />
		</div>
	),
	ssr: false,
})

interface HeroClientProps {
	heroData: HeroData
	costumes: Costume[]
	heroModels: { [costume: string]: ModelFile[] }
	voiceFiles: VoiceFiles
	availableScenes?: Array<{ value: string; label: string }>
	enableModelsVoices?: boolean
	classPerks: ClassPerksData
	sortedHeroSlugs: string[]
}

export default function HeroClient({
	heroData,
	costumes,
	heroModels,
	voiceFiles,
	availableScenes = [],
	enableModelsVoices = false,
	classPerks,
	sortedHeroSlugs,
}: HeroClientProps) {
	const router = useRouter()
	const [isNavigating, startTransition] = useTransition()
	// Helper function to get tab from hash
	const getTabFromHash = () => {
		if (typeof window === "undefined") return "skills"
		const hash = window.location.hash.slice(1) // Remove the '#'
		const searchParams = new URLSearchParams(window.location.search)
		const validTabs = ["skills", "perks", "gear", "profile", "costumes", "models", "voices"]
		if (validTabs.includes(hash)) return hash
		if (searchParams.has("p")) return "perks"
		return "skills"
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

	const handleNavigate = useCallback(
		(direction: "prev" | "next") => {
			let slugs = sortedHeroSlugs
			// Attempt to load the dynamically sorted list from the Heroes list page
			if (typeof window !== "undefined") {
				const storedSlugs = sessionStorage.getItem("currentHeroList")
				if (storedSlugs) {
					try {
						const parsedSlugs = JSON.parse(storedSlugs)
						if (Array.isArray(parsedSlugs) && parsedSlugs.length > 0) {
							slugs = parsedSlugs
						}
					} catch {
						// Fallback to initial alphabetical order
					}
				}
			}

			if (!slugs || slugs.length === 0) return
			const currentSlug = heroData.profile.name.toLowerCase().replace(/\s+/g, "-")
			const currentIndex = slugs.indexOf(currentSlug)
			if (currentIndex === -1) return

			let targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1
			if (targetIndex < 0) targetIndex = slugs.length - 1
			if (targetIndex >= slugs.length) targetIndex = 0

			const targetSlug = slugs[targetIndex]
			startTransition(() => {
				router.replace(`/heroes/${targetSlug}${window.location.hash}`)
			})
		},
		[sortedHeroSlugs, heroData.profile.name, router],
	)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't trigger if user is typing in an input
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
			{/* Compact Hero Header */}
			<div className="flex flex-row gap-4 items-center pb-2 relative">
				{/* Navigation Buttons */}
				{sortedHeroSlugs && sortedHeroSlugs.length > 0 && (
					<div className="absolute top-0 right-0 gap-1 z-10">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleNavigate("prev")}
							title="Previous Hero"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							disabled={isNavigating}
						>
							<ChevronLeft className="h-5 w-5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleNavigate("next")}
							title="Next Hero"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							disabled={isNavigating}
						>
							<ChevronRight className="h-5 w-5" />
						</Button>
					</div>
				)}

				{/* Hero Image - Smaller */}
				<div className="shrink-0 relative">
					<div className="w-16 h-16 md:w-20 md:h-20">
						<Image
							src={`/kingsraid-data/assets/${heroData.profile.thumbnail}`}
							alt={heroData.profile.name}
							width={80}
							height={80}
							sizes="(min-width: 768px) 80px, 64px"
							className="w-full h-auto rounded"
						/>
					</div>
					{/* Class Icon Badge */}
					<div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-7 md:h-7 rounded-full bg-background border-2 overflow-hidden shadow-sm">
						<Image
							src={`/kingsraid-data/assets/classes/${heroData.profile.class.toLowerCase()}.png`}
							alt={heroData.profile.class}
							width={28}
							height={28}
							className="w-full h-full object-cover"
						/>
					</div>
				</div>

				{/* Hero Name & Key Stats */}
				<div className="grow min-w-0">
					<div className="flex flex-col">
						<h1 className="text-2xl md:text-3xl font-bold truncate">{capitalize(heroData.profile.name)}</h1>
						<span className="text-sm md:text-base text-muted-foreground">{heroData.profile.title}</span>
					</div>
					<div className="flex flex-wrap gap-2 mt-2">
						<Badge variant="default" className={classColorMapBadge(heroData.profile.class)}>
							{heroData.profile.class}
						</Badge>
						<Badge variant="secondary">{heroData.profile.position}</Badge>
						<Badge
							variant="default"
							className={heroData.profile.damage_type === "Physical" ? "bg-red-300" : "bg-blue-300"}
						>
							{heroData.profile.damage_type}
						</Badge>
					</div>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-2">
				<TabsList className="w-full overflow-x-auto overflow-y-hidden flex-nowrap justify-start">
					<TabsTrigger value="skills">Skills</TabsTrigger>
					<TabsTrigger value="perks">Perks</TabsTrigger>
					<TabsTrigger value="gear">Gear</TabsTrigger>
					<TabsTrigger value="profile">Profile</TabsTrigger>
					<TabsTrigger value="costumes">Costumes</TabsTrigger>
					{enableModelsVoices && (
						<>
							<TabsTrigger value="models">Models</TabsTrigger>
							<TabsTrigger value="voices">Voices</TabsTrigger>
						</>
					)}
				</TabsList>

				<TabsContent value="profile" className="mt-4">
					<Profile heroData={heroData} />
				</TabsContent>
				<TabsContent value="skills" className="mt-4">
					<Skills heroData={heroData} />
				</TabsContent>
				<TabsContent value="perks" className="mt-4">
					<Suspense fallback={<div>Loading Perks...</div>}>
						<Perks heroData={heroData} classPerks={classPerks} />
					</Suspense>
				</TabsContent>
				<TabsContent value="gear" className="mt-4">
					<Gear heroData={heroData} />
				</TabsContent>
				<TabsContent value="costumes" className="mt-4">
					<Costumes heroData={heroData} costumes={costumes} />
				</TabsContent>
				{enableModelsVoices && (
					<>
						<TabsContent value="models" className="mt-4">
							<DataHeavyContent
								description="This tab contains large 3D model files and textures that may consume significant mobile data."
								estimatedSize="20-40 MB per costume"
							>
								<Models
									heroModels={heroModels}
									availableScenes={availableScenes}
									voiceFiles={voiceFiles}
								/>
							</DataHeavyContent>
						</TabsContent>

						<TabsContent value="voices" className="mt-4">
							<DataHeavyContent
								description="This tab contains multiple voice audio files that may consume mobile data when played."
								estimatedSize="1-5 MB total"
							>
								<Voices heroData={heroData} voiceFiles={voiceFiles} />
							</DataHeavyContent>
						</TabsContent>
					</>
				)}
			</Tabs>
		</div>
	)
}
