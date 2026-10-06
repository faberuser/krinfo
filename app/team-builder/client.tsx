"use client"

import { Text, useTranslation, useLocalizedHeroes } from "@/components/i18n/language-provider"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { HeroData } from "@/model/Hero"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Share2, Check, Trash2 } from "lucide-react"
import { useDataVersion } from "@/hooks/use-data-version"
import { DataVersion } from "@/lib/constants"
import { useEnableVersionToggle } from "@/contexts/version-toggle-context"
import Fuse from "fuse.js"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"

import { TeamMember, TeamBuilderClientProps, PERK_COSTS, MIN_POINTS, MAX_POINTS } from "@/model/Team_Builder"
import {
	createEmptyMember,
	calculateUsedPoints,
	encodeTeam,
	decodeTeam,
	extractVersionFromEncoded,
} from "@/app/team-builder/utils"
import { HeroCard, EmptySlot, HeroSelectDialog } from "@/app/team-builder/components"
import { ArtifactData } from "@/model/Artifact"

function TeamBuilderContent({
	heroesMap,
	artifacts,
	artifactReleaseOrder,
	classPerksMap,
	heroClasses,
	releaseOrderMap,
}: Omit<TeamBuilderClientProps, "saReverse">) {
	const { version: dataVersion, setVersionDirect, isHydrated: versionHydrated } = useDataVersion()
	const classPerks = classPerksMap[dataVersion]
	const searchParams = useSearchParams()
	const router = useRouter()

	// Enable version toggle on mount
	useEnableVersionToggle()

	// Helper to get heroes by version
	const getHeroesByVersion = useCallback(
		(version: DataVersion | string) => {
			return heroesMap[version as DataVersion] || heroesMap.legacy
		},
		[heroesMap],
	)

	// Get heroes and release order based on data version
	const sourceHeroes = useMemo(() => getHeroesByVersion(dataVersion), [dataVersion, getHeroesByVersion])
	const heroes = useLocalizedHeroes(sourceHeroes)

	const releaseOrder = useMemo(() => {
		return releaseOrderMap[dataVersion] || releaseOrderMap.legacy
	}, [dataVersion, releaseOrderMap])

	// Initialize teamSize from state (default 8)
	const { locale } = useTranslation()
	const [teamSize, setTeamSizeState] = useState<number>(() => {
		const encoded = searchParams.get("t")
		if (encoded) {
			const urlVersion = extractVersionFromEncoded(encoded) ?? "legacy"
			// Safe initialization since we memoized getHeroesByVersion in the component
			const heroesForVersion = heroesMap[urlVersion as DataVersion] || heroesMap.legacy
			const result = decodeTeam(encoded, heroesForVersion)
			if (result) {
				return Math.min(8, Math.max(1, result.team.length))
			}
		}
		return 8
	})

	const setTeamSize = useCallback((size: number) => {
		setTeamSizeState(size)
		localStorage.setItem("team-builder-size", size.toString())
		setTeam((prev) => {
			const newTeam = [...prev]
			if (newTeam.length < size) {
				while (newTeam.length < size) {
					newTeam.push(createEmptyMember())
				}
			} else if (newTeam.length > size) {
				newTeam.length = size
			}
			return newTeam
		})
	}, [])

	// Initialize team from URL or empty (localStorage loaded in effect below)
	const [team, setTeam] = useState<TeamMember[]>(() => {
		// First try URL params (works on both server and client)
		const encoded = searchParams.get("t")
		if (encoded) {
			// Extract version from URL to use correct hero list
			const urlVersion = extractVersionFromEncoded(encoded) ?? "legacy"
			const heroesForVersion = getHeroesByVersion(urlVersion)
			const result = decodeTeam(encoded, heroesForVersion)
			if (result) {
				const decodedTeam = result.team
				// teamSize state is already properly calculated
				while (decodedTeam.length < teamSize) {
					decodedTeam.push(createEmptyMember())
				}
				return decodedTeam.slice(0, teamSize)
			}
		}
		return Array(teamSize)
			.fill(null)
			.map(() => createEmptyMember())
	})

	// Ref to track current team for effects that need fresh value without re-running
	const teamRef = useRef(team)
	useEffect(() => {
		teamRef.current = team
	}, [team])

	// Load team from localStorage on mount (client-side only)
	const [initialLoadDone, setInitialLoadDone] = useState(false)

	// Listen for version switch events from the context (team was cleared)
	useEffect(() => {
		const handleTeamCleared = () => {
			setTeam(
				Array(teamSize)
					.fill(null)
					.map(() => createEmptyMember()),
			)
			router.replace("/team-builder", { scroll: false })
		}

		window.addEventListener("team-cleared-by-version-switch", handleTeamCleared)
		return () => window.removeEventListener("team-cleared-by-version-switch", handleTeamCleared)
	}, [router, teamSize])

	// Track if URL has been handled to avoid re-processing
	const urlHandledRef = useRef(false)

	// Set version from URL on mount and re-decode team with correct heroes
	useEffect(() => {
		if (urlHandledRef.current) return

		const encoded = searchParams.get("t")
		if (!encoded) {
			urlHandledRef.current = true
			return
		}

		const urlVersion = extractVersionFromEncoded(encoded)
		if (urlVersion) {
			urlHandledRef.current = true

			// Always set version from URL (direct, bypass team check)
			setVersionDirect(urlVersion as DataVersion)

			// Re-decode team with correct heroes list to ensure consistency
			const heroesForVersion = getHeroesByVersion(urlVersion)
			const result = decodeTeam(encoded, heroesForVersion)
			if (result) {
				const decodedTeam = result.team
				// On URL load, the incoming team size overrides local storage
				const size = Math.min(8, Math.max(decodedTeam.length, 1))

				setTeamSizeState(size)
				if (typeof window !== "undefined") {
					localStorage.setItem("team-builder-size", size.toString())
				}

				while (decodedTeam.length < size) {
					decodedTeam.push(createEmptyMember())
				}
				setTeam(decodedTeam.slice(0, size))
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // Only run on mount

	useEffect(() => {
		if (initialLoadDone || !versionHydrated) return

		const encoded = searchParams.get("t")
		if (encoded) {
			// Already loaded from URL param
			setInitialLoadDone(true)
			return
		}

		// Initialize size from localStorage if exist
		let size = 8
		if (typeof window !== "undefined") {
			const savedSize = localStorage.getItem("team-builder-size")
			if (savedSize) {
				size = parseInt(savedSize, 10)
				setTeamSizeState(size)
			}
		}

		// Try localStorage
		const saved = localStorage.getItem("team-builder-team")
		let newTeam = Array(size)
			.fill(null)
			.map(() => createEmptyMember())
		if (saved) {
			try {
				const parsed = JSON.parse(saved)
				// Rehydrate hero and artifact references from their names
				// Restore from the selected version after its saved preference is available.
				const rehydrated = parsed.map((member: TeamMember & { heroName?: string; artifactName?: string }) => {
					let hero = null
					let artifact = null

					if (member.heroName) {
						hero = heroes.find((h) => h.id === member.heroName) || null
					}

					if (member.artifactName) {
						artifact = artifacts.find((a) => a.id === member.artifactName) || null
					}

					return {
						...member,
						hero,
						artifact,
						heroName: undefined,
						artifactName: undefined,
					}
				})
				while (rehydrated.length < size) {
					rehydrated.push(createEmptyMember())
				}
				newTeam = rehydrated.slice(0, size)
			} catch {
				// Invalid saved data, ignore
			}
		} else {
			// Adjust empty team strictly to `size`
			// Handles case when `team` was instantiated as length 8 in useState but localStorage size is different and `saved` team null
		}
		setTeam(newTeam)

		setInitialLoadDone(true)
	}, [initialLoadDone, versionHydrated, searchParams, heroes, artifacts])

	const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
	const [heroSearchQuery, setHeroSearchQuery] = useState("")
	const [copied, setCopied] = useState(false)
	const [heroDialogOpen, setHeroDialogOpen] = useState(false)
	const [perksDialogOpen, setPerksDialogOpen] = useState(false)

	// Filtering and sorting state - synced with Heroes page via localStorage
	const [selectedClass, setSelectedClass] = useState("all")
	const [selectedDamageType, setSelectedDamageType] = useState("all")
	const [sortType, setSortType] = useState<"alphabetical" | "release">(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("heroesSortType")
			if (stored === "alphabetical" || stored === "release") return stored
		}
		return "release"
	})
	const [reverseSort, setReverseSort] = useState(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("heroesReverseSort")
			if (stored !== null) return stored === "true"
		}
		return true
	})
	const [sortMounted, setSortMounted] = useState(false)

	// Mark as mounted after initial render
	useEffect(() => {
		setSortMounted(true)
	}, [])

	// Save filter/sort preferences to localStorage when changed (synced with Heroes page)
	useEffect(() => {
		if (sortMounted && typeof window !== "undefined") {
			localStorage.setItem("heroesSortType", sortType)
			localStorage.setItem("heroesReverseSort", reverseSort.toString())
		}
	}, [sortType, reverseSort, sortMounted])

	// Track if user has explicitly cleared the team (to distinguish from version switch clearing)
	const [userCleared, setUserCleared] = useState(false)

	// Save team to localStorage whenever it changes (only after initial load)
	useEffect(() => {
		if (!initialLoadDone) return

		if (typeof window !== "undefined") {
			const hasContent = team.some((m) => m.hero !== null)
			if (hasContent) {
				// Store hero names and artifact names instead of full objects to avoid serialization issues
				const toSave = team.map((member) => ({
					...member,
					hero: null,
					heroName: member.hero?.id || null,
					artifact: null,
					artifactName: member.artifact?.id || null,
				}))
				localStorage.setItem("team-builder-team", JSON.stringify(toSave))
				setUserCleared(false)
			} else if (userCleared) {
				// Only remove from localStorage if user explicitly cleared
				localStorage.removeItem("team-builder-team")
			}
		}
	}, [team, userCleared, initialLoadDone])

	// Note: We intentionally do NOT re-decode from URL when version/heroes changes
	// because the URL encoding is version-specific (uses hero indices).
	// The team is preserved in state and localStorage, which use hero names.
	// This is only needed if we want to support version switching while keeping URL valid,
	// which we don't - the URL is for sharing, not for version switching.

	// Sync URL with team after initial load (for localStorage loaded teams)
	useEffect(() => {
		if (!initialLoadDone) return

		const hasUrlParam = searchParams.get("t")
		const hasContent = team.some((m) => m.hero !== null)
		// If team loaded from localStorage (no URL param but has content), update URL
		if (!hasUrlParam && hasContent) {
			const encoded = encodeTeam(team, heroes, dataVersion)
			router.replace(`/team-builder?t=${encoded}`, { scroll: false })
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialLoadDone])

	// Fuse search for heroes
	const fuse = useMemo(() => {
		return new Fuse(
			heroes.filter((hero) => hero.profile?.thumbnail),
			{
				keys: ["profile.name", "id", "profile.title", "aliases"],
				threshold: 0.3,
			},
		)
	}, [heroes])

	const filteredHeroes = useMemo(() => {
		let result = heroes

		// Filter out heroes without profile thumbnail
		result = result.filter((hero) => hero.profile?.thumbnail)

		// Apply search filter
		if (heroSearchQuery.trim()) {
			const searchResults = fuse.search(heroSearchQuery)
			result = searchResults.map((item) => item.item)
		}

		// Apply class filter
		if (selectedClass !== "all") {
			result = result.filter((hero) => hero.profile?.class?.toLowerCase() === selectedClass.toLowerCase())
		}

		// Apply damage type filter
		if (selectedDamageType !== "all") {
			result = result.filter(
				(hero) => hero.profile?.damage_type?.toLowerCase() === selectedDamageType.toLowerCase(),
			)
		}

		// Sort by selected sort type
		if (sortType === "release") {
			result = [...result].sort((a, b) => {
				const aOrder = parseInt(releaseOrder[a.id] ?? "9999", 10)
				const bOrder = parseInt(releaseOrder[b.id] ?? "9999", 10)
				return aOrder - bOrder
			})
		} else {
			result = [...result].sort((a, b) => a.profile.name.localeCompare(b.profile.name, locale))
		}

		// Reverse if needed
		if (reverseSort) {
			result = result.reverse()
		}

		return result
	}, [heroes, heroSearchQuery, fuse, selectedClass, selectedDamageType, sortType, reverseSort, releaseOrder, locale])

	// Update URL when team changes
	const updateURL = useCallback(
		(newTeam: TeamMember[]) => {
			const hasContent = newTeam.some((m) => m.hero !== null)
			if (hasContent) {
				const encoded = encodeTeam(newTeam, heroes, dataVersion)
				router.replace(`/team-builder?t=${encoded}`, { scroll: false })
			} else {
				router.replace("/team-builder", { scroll: false })
			}
		},
		[router, heroes, dataVersion],
	)

	// Select hero for slot (supports multi-select by finding next empty slot)
	const selectHero = (hero: HeroData) => {
		const newTeam = [...team]

		// Check if hero is already in team
		const existingSlotIndex = newTeam.findIndex((m) => m.hero?.id === hero.id)
		if (existingSlotIndex !== -1) {
			// Hero already in team, remove it (unselect)
			newTeam[existingSlotIndex] = createEmptyMember()
			setTeam(newTeam)
			updateURL(newTeam)
			return
		}

		// Find the first empty slot
		const emptySlotIndex = newTeam.findIndex((m) => m.hero === null)
		if (emptySlotIndex === -1) {
			// No empty slots available, close dialog
			setHeroDialogOpen(false)
			setHeroSearchQuery("")
			return
		}

		newTeam[emptySlotIndex] = {
			...createEmptyMember(),
			hero,
		}
		setTeam(newTeam)
		updateURL(newTeam)

		// Check if all slots are now filled
		const nextEmptySlot = newTeam.findIndex((m) => m.hero === null)
		if (nextEmptySlot === -1) {
			// All slots filled, close dialog
			setHeroDialogOpen(false)
			setHeroSearchQuery("")
		}
		// Otherwise keep dialog open for more selections
	}

	// Remove hero from slot
	const removeHero = (slot: number) => {
		const newTeam = [...team]
		newTeam[slot] = createEmptyMember()
		setTeam(newTeam)
		updateURL(newTeam)
	}

	// Toggle UW
	const toggleUW = (slot: number) => {
		const newTeam = [...team]
		newTeam[slot] = {
			...newTeam[slot],
			uw: !newTeam[slot].uw,
		}
		setTeam(newTeam)
		updateURL(newTeam)
	}

	// Select UT
	const selectUT = (slot: number, ut: string | null) => {
		const newTeam = [...team]
		newTeam[slot] = {
			...newTeam[slot],
			ut: newTeam[slot].ut === ut ? null : ut,
		}
		setTeam(newTeam)
		updateURL(newTeam)
	}

	// Select Artifact
	const selectArtifact = (slot: number, artifact: ArtifactData | null) => {
		const newTeam = [...team]
		newTeam[slot] = {
			...newTeam[slot],
			artifact,
		}
		setTeam(newTeam)
		updateURL(newTeam)
	}

	// Update max points
	const updateMaxPoints = (slot: number, points: number) => {
		const newTeam = [...team]
		newTeam[slot] = {
			...newTeam[slot],
			maxPoints: Math.max(MIN_POINTS, Math.min(MAX_POINTS, points)),
		}
		setTeam(newTeam)
		updateURL(newTeam)
	}

	// Toggle perk
	const togglePerk = (slot: number, tier: "t1" | "t2" | "t3" | "t5", perkId: string, subType?: "light" | "dark") => {
		const newTeam = [...team]
		const member = newTeam[slot]
		const currentPerks = { ...member.perks }
		const usedPoints = calculateUsedPoints(currentPerks)
		const cost = PERK_COSTS[tier]

		if (tier === "t1") {
			const index = currentPerks.t1.indexOf(perkId)
			if (index >= 0) {
				currentPerks.t1 = currentPerks.t1.filter((p) => p !== perkId)
			} else if (usedPoints + cost <= member.maxPoints) {
				currentPerks.t1 = [...currentPerks.t1, perkId]
			}
		} else if (tier === "t2") {
			const index = currentPerks.t2.indexOf(perkId)
			if (index >= 0) {
				currentPerks.t2 = currentPerks.t2.filter((p) => p !== perkId)
			} else if (usedPoints + cost <= member.maxPoints) {
				currentPerks.t2 = [...currentPerks.t2, perkId]
			}
		} else if (tier === "t3" && subType) {
			const existing = currentPerks.t3.find((p) => p.skill === perkId && p.type === subType)
			if (existing) {
				currentPerks.t3 = currentPerks.t3.filter((p) => !(p.skill === perkId && p.type === subType))
			} else if (usedPoints + cost <= member.maxPoints) {
				// Remove opposite type if selected
				currentPerks.t3 = currentPerks.t3.filter((p) => p.skill !== perkId)
				currentPerks.t3 = [...currentPerks.t3, { skill: perkId, type: subType }]
			}
		} else if (tier === "t5" && subType) {
			const index = currentPerks.t5.indexOf(subType)
			if (index >= 0) {
				currentPerks.t5 = currentPerks.t5.filter((p) => p !== subType)
			} else if (usedPoints + cost <= member.maxPoints) {
				currentPerks.t5 = [...currentPerks.t5, subType]
			}
		}

		newTeam[slot] = {
			...member,
			perks: currentPerks,
		}
		setTeam(newTeam)
		updateURL(newTeam)
	}

	// Copy share link
	const copyShareLink = async () => {
		const url = window.location.href
		await navigator.clipboard.writeText(url)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	// Clear all
	const clearAll = () => {
		const newTeam = Array(teamSize)
			.fill(null)
			.map(() => createEmptyMember())
		setUserCleared(true) // Mark as user-initiated clear
		setTeam(newTeam)
		router.replace("/team-builder", { scroll: false })
	}

	// Get T1 perks (general)
	const t1Perks = classPerks.general.perks.t1 || {}

	// Get T2 perks for a hero's class
	const getT2Perks = (heroClass: string) => {
		const classData = classPerks.classes[heroClass.toLowerCase()]
		return classData?.perks.t2 || {}
	}

	// Get active team members count
	const activeCount = team.filter((m) => m.hero !== null).length

	// Drag and drop state
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

	// Handle drag start
	const handleDragStart = (index: number) => {
		setDraggedIndex(index)
	}

	// Handle drag over
	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault()
		if (draggedIndex !== null && draggedIndex !== index) {
			setDragOverIndex(index)
		}
	}

	// Handle drag leave
	const handleDragLeave = () => {
		setDragOverIndex(null)
	}

	// Handle drop - swap positions
	const handleDrop = (targetIndex: number) => {
		if (draggedIndex !== null && draggedIndex !== targetIndex) {
			const newTeam = [...team]
			// Swap the two positions
			const temp = newTeam[draggedIndex]
			newTeam[draggedIndex] = newTeam[targetIndex]
			newTeam[targetIndex] = temp
			setTeam(newTeam)
			updateURL(newTeam)
		}
		setDraggedIndex(null)
		setDragOverIndex(null)
	}

	// Handle drag end
	const handleDragEnd = () => {
		setDraggedIndex(null)
		setDragOverIndex(null)
	}

	// Handle hero dialog state
	const handleOpenHeroDialog = (slot: number) => {
		setSelectedSlot(slot)
		setHeroDialogOpen(true)
	}

	// Handle perks dialog state
	const handlePerksDialogChange = (open: boolean, slot: number) => {
		setPerksDialogOpen(open)
		if (open) setSelectedSlot(slot)
	}

	return (
		<TooltipProvider>
			<div>
				{/* Header */}
				<div className="space-y-4 mb-6">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div className="flex flex-row gap-4 items-center">
							<div className="text-xl font-bold"><Text messageKey="uiTeamBuilder" /></div>
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground text-sm">{activeCount} /</span>
								<Select
									value={teamSize.toString()}
									onValueChange={(val) => setTeamSize(parseInt(val, 10))}
								>
									<SelectTrigger className="w-25 h-8 text-sm">
										<SelectValue placeholder="Size" />
									</SelectTrigger>
									<SelectContent>
										{[...Array(8)].map((_, i) => (
											<SelectItem key={i + 1} value={(i + 1).toString()}>
												{i + 1} <Text messageKey="uiHeroes_8172f9d4" /></SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex gap-2 w-full sm:w-auto">
							<Button
								variant="outline"
								className="flex-1 sm:flex-none"
								onClick={copyShareLink}
								disabled={activeCount === 0}
							>
								{copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
								<Text>{copied ? "Copied!" : "Share"}</Text>
							</Button>
							<Button
								variant="destructive"
								className="flex-1 sm:flex-none"
								onClick={clearAll}
								disabled={activeCount === 0}
							>
								<Trash2 className="h-4 w-4" />
								<Text messageKey="uiClear" /></Button>
						</div>
					</div>
				</div>

				{/* Team Grid */}
				<div className="flex flex-wrap justify-center gap-4">
					{team.map((member, index) =>
						member.hero ? (
							<div
								key={index}
								className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] max-w-sm"
							>
								<HeroCard
									member={member}
									index={index}
									perksDialogOpen={perksDialogOpen}
									selectedSlot={selectedSlot}
									artifacts={artifacts}
									artifactReleaseOrder={artifactReleaseOrder}
									onRemove={removeHero}
									onToggleUW={toggleUW}
									onSelectUT={selectUT}
									onSelectArtifact={selectArtifact}
									onPerksDialogChange={handlePerksDialogChange}
									onPerkToggle={togglePerk}
									onMaxPointsUpdate={updateMaxPoints}
									t1Perks={t1Perks}
									getT2Perks={getT2Perks}
									isDragging={draggedIndex === index}
									isDragOver={dragOverIndex === index}
									onDragStart={handleDragStart}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
									onDragEnd={handleDragEnd}
								/>
							</div>
						) : (
							<div
								key={index}
								className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] max-w-sm"
							>
								<EmptySlot
									index={index}
									onOpenDialog={handleOpenHeroDialog}
									isDragOver={dragOverIndex === index}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
								/>
							</div>
						),
					)}
				</div>

				{/* Hero Select Dialog - rendered at parent level to persist across slot changes */}
				<HeroSelectDialog
					isOpen={heroDialogOpen}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					onOpenChange={(open: any) => {
						setHeroDialogOpen(open)
						if (!open) setHeroSearchQuery("")
					}}
					heroSearchQuery={heroSearchQuery}
					onSearchChange={setHeroSearchQuery}
					filteredHeroes={filteredHeroes}
					team={team}
					onSelectHero={selectHero}
					heroClasses={heroClasses}
					selectedClass={selectedClass}
					onClassChange={setSelectedClass}
					selectedDamageType={selectedDamageType}
					onDamageTypeChange={setSelectedDamageType}
					sortType={sortType}
					onSortTypeChange={setSortType}
					reverseSort={reverseSort}
					onReverseSortChange={setReverseSort}
				/>
			</div>
		</TooltipProvider>
	)
}

export default function TeamBuilderClient({
	heroesMap,
	artifacts,
	artifactReleaseOrder,
	classPerksMap,
	heroClasses,
	releaseOrderMap,
}: TeamBuilderClientProps) {
	return (
		<Suspense>
			<TeamBuilderContent
				heroesMap={heroesMap}
				artifacts={artifacts}
				artifactReleaseOrder={artifactReleaseOrder}
				classPerksMap={classPerksMap}
				heroClasses={heroClasses}
				releaseOrderMap={releaseOrderMap}
			/>
		</Suspense>
	)
}
