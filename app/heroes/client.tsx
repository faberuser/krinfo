"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Fuse from "fuse.js"
import { SearchableFilter } from "@/components/searchable-filter"
import { Input } from "@/components/ui/input"
import { HeroData } from "@/model/Hero"
import { Button } from "@/components/ui/button"
import { Search, X, ChevronDown, ChevronUp, Image as ImageIcon, Grid2x2 } from "lucide-react"
import HeroCard, { ViewMode } from "@/app/heroes/components/card"
import { Spinner } from "@/components/ui/spinner"

// Hoisted static constants outside component to avoid re-creation each render
const damageTypes = [
	{ value: "all", name: "All" },
	{ value: "magical", name: "Magical" },
	{ value: "physical", name: "Physical" },
] as const

// Hoisted RegExp to avoid re-creation in loops
const SLUG_REGEXP = /\s+/g

interface HeroesClientProps {
	heroes: HeroData[]
	heroClasses: readonly {
		readonly value: string
		readonly name: string
		readonly icon: string
	}[]
	releaseOrder: Record<string, string>
	saReverse: string[]
	// blurDataURLMap: Record<string, string>
}

export default function HeroesClient({
	heroes,
	heroClasses,
	releaseOrder,
	saReverse,
	// blurDataURLMap,
}: HeroesClientProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const searchInputRef = useRef<HTMLInputElement>(null)
	const [selectedClass, setSelectedClass] = useState("all")
	const [selectedDamageType, setSelectedDamageType] = useState("all")
	// Lazy state initializers: read from localStorage only once
	const [sortType, setSortType] = useState<"alphabetical" | "release">(() => {
		if (typeof window === "undefined") return "release"
		const stored = localStorage.getItem("heroesSortType")
		return stored === "alphabetical" || stored === "release" ? stored : "release"
	})
	const [reverseSort, setReverseSort] = useState(() => {
		if (typeof window === "undefined") return true
		const stored = localStorage.getItem("heroesReverseSort")
		return stored !== null ? stored === "true" : true
	})
	const [viewMode, setViewMode] = useState<ViewMode>(() => {
		if (typeof window === "undefined") return "splashart"
		const stored = localStorage.getItem("heroesViewMode")
		return stored === "splashart" || stored === "icon" ? stored : "splashart"
	})
	const [mounted, setMounted] = useState(false)

	// Signal hydration complete
	useEffect(() => {
		// eslint-disable-next-line
		setMounted(true)
	}, [])

	// Save sort state to localStorage when changed
	useEffect(() => {
		if (mounted) {
			localStorage.setItem("heroesSortType", sortType)
			localStorage.setItem("heroesReverseSort", reverseSort.toString())
			localStorage.setItem("heroesViewMode", viewMode)
		}
	}, [sortType, reverseSort, viewMode, mounted])

	// Configure Fuse.js for fuzzy search
	const fuse = useMemo(() => {
		return new Fuse(
			heroes.filter((hero) => hero.splashart),
			{
				keys: ["profile.name", "profile.title", "aliases"],
				threshold: 0.3,
				includeScore: true,
			},
		)
	}, [heroes])

	// Filter heroes by search query and class
	const filteredHeroes = useMemo(() => {
		let result = heroes

		// Filter out heroes without splashart
		result = result.filter((hero) => hero.splashart)

		// Apply search filter
		if (searchQuery.trim()) {
			const searchResults = fuse.search(searchQuery)
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
				const aOrder = parseInt(releaseOrder[a.profile.name] ?? "9999", 10)
				const bOrder = parseInt(releaseOrder[b.profile.name] ?? "9999", 10)
				return aOrder - bOrder
			})
		} else {
			result = [...result].sort((a, b) => a.profile.name.localeCompare(b.profile.name))
		}

		// Reverse if needed
		if (reverseSort) {
			result = result.reverse()
		}

		// Save the sorted/filtered list of hero slugs to sessionStorage for next/prev navigation
		if (typeof window !== "undefined") {
			const slugs = result.map((h) => h.profile.name.toLowerCase().replace(SLUG_REGEXP, "-"))
			sessionStorage.setItem("currentHeroList", JSON.stringify(slugs))
		}

		return result
	}, [heroes, searchQuery, fuse, selectedClass, selectedDamageType, sortType, reverseSort, releaseOrder])

	// Show loading spinner until hydrated
	if (!mounted) {
		return (
			<div className="flex items-center justify-center h-96">
				<Spinner className="h-8 w-8" />
			</div>
		)
	}

	return (
		<div>
			<div className="space-y-2 mb-4">
				<div className="flex flex-row justify-between items-center">
					<div className="flex flex-row gap-2 items-baseline">
						<div className="text-xl font-bold">Heroes</div>
						<div className="text-muted-foreground text-sm">
							<span className="hidden sm:inline">Showing </span>
							{filteredHeroes.length}
							<span> heroes</span>
						</div>
					</div>
					<div className="flex flex-row">
						{/* Alphabetical Sort */}
						<Button
							variant={`${sortType === "alphabetical" ? "outline" : "ghost"}`}
							onClick={() => {
								if (sortType === "alphabetical") {
									setReverseSort((prev) => !prev)
								} else {
									setSortType("alphabetical")
									setReverseSort(false)
								}
							}}
						>
							{sortType === "alphabetical" && reverseSort && <ChevronDown />}
							{sortType === "alphabetical" && !reverseSort && <ChevronUp />}
							{sortType === "alphabetical" && reverseSort ? "Z → A" : "A → Z"}
						</Button>

						{/* Release Sort */}
						<Button
							variant={`${sortType === "release" ? "outline" : "ghost"}`}
							onClick={() => {
								if (sortType === "release") {
									setReverseSort((prev) => !prev)
								} else {
									setSortType("release")
									setReverseSort(true)
								}
							}}
						>
							{sortType === "release" && reverseSort && <ChevronUp />}
							{sortType === "release" && !reverseSort && <ChevronDown />}
							Release
						</Button>
					</div>
				</div>

				<div className="flex flex-col items-center justify-between xl:flex-row">
					<div className="flex flex-wrap items-center gap-2 w-full">
						{/* Search Input */}
						<div className="w-full sm:max-w-sm relative">
							<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
								<Search className="h-4 w-4" />
							</span>
							<Input
								ref={searchInputRef}
								type="text"
								placeholder="Search for heroes..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-10"
							/>
							{searchQuery.length > 0 ? (
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
									aria-label="Clear search"
									onClick={() => {
										setSearchQuery("")
										searchInputRef.current?.focus()
									}}
								>
									<X className="h-4 w-4" aria-hidden="true" />
								</Button>
							) : null}
						</div>

						<div className="flex w-full sm:w-auto items-center gap-2">
							<div className="min-w-0 flex-1 sm:flex-none">
								{/* Class Filter */}
								<SearchableFilter
									label="Filter by class"
									searchPlaceholder="Search classes..."
									value={selectedClass}
									onValueChange={setSelectedClass}
									options={heroClasses.map((heroClass) => ({
										value: heroClass.value,
										label: heroClass.value === "all" ? "All classes" : heroClass.name,
										icon: heroClass.value === "all" ? undefined : heroClass.icon,
									}))}
								/>
							</div>

							<div className="contents sm:flex sm:items-center sm:gap-2">
								{/* Damage Type Filter */}
								<div className="min-w-0 flex-1 sm:flex-none">
									<SearchableFilter
										label="Filter by damage type"
										searchPlaceholder="Search damage types..."
										value={selectedDamageType}
										onValueChange={setSelectedDamageType}
										options={damageTypes.map((type) => ({
											value: type.value,
											label: type.value === "all" ? "All damage types" : type.name,
										}))}
									/>
								</div>

								{/* View Mode Toggle (mobile) */}
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setViewMode(viewMode === "splashart" ? "icon" : "splashart")}
									title={
										viewMode === "splashart" ? "Switch to icon view" : "Switch to splashart view"
									}
									className="inline-flex shrink-0 xl:hidden"
								>
									{viewMode === "splashart" ? (
										<Grid2x2 className="h-4 w-4" />
									) : (
										<ImageIcon className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>
					</div>

					{/* View Mode Toggle */}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setViewMode(viewMode === "splashart" ? "icon" : "splashart")}
						title={viewMode === "splashart" ? "Switch to icon view" : "Switch to splashart view"}
						className="hidden xl:inline-flex"
					>
						{viewMode === "splashart" ? <Grid2x2 className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
					</Button>
				</div>
			</div>

			<div className="flex flex-row gap-2 sm:gap-4 flex-wrap w-full justify-center mt-4">
				{filteredHeroes.map(
					(hero) =>
						hero.splashart && (
							<HeroCard
								key={hero.profile.name}
								name={hero.profile.name}
								splashart={hero.splashart}
								reverseSA={saReverse.includes(hero.profile.name)}
								viewMode={viewMode}
								// blurDataURLMap={blurDataURLMap}
							/>
						),
				)}
			</div>

			{/* No results message */}
			{filteredHeroes.length === 0 && (
				<div className="text-center text-muted-foreground mt-8">No heroes found matching your criteria.</div>
			)}
		</div>
	)
}
