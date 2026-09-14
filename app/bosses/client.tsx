"use client"

import { useState, useEffect, useMemo, useRef, startTransition } from "react"
import Fuse from "fuse.js"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Image from "@/components/next-image"
import { BossData } from "@/model/Boss"
import { Button } from "@/components/ui/button"
import { Search, X, ChevronDown, ChevronUp } from "lucide-react"
import { SearchableFilter } from "@/components/searchable-filter"
import { Spinner } from "@/components/ui/spinner"

interface BossesClientProps {
	bosses: BossData[]
	bossTypeMap: Record<string, string>
	releaseOrder: Record<string, string>
}

export default function BossesClient({ bosses, bossTypeMap, releaseOrder }: BossesClientProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const searchInputRef = useRef<HTMLInputElement>(null)
	const [selectedType, setSelectedType] = useState("all")
	const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
	const pathname = usePathname()

	// Reset spinner if navigation is cancelled
	useEffect(() => {
		startTransition(() => setLoadingSlug(null))
	}, [pathname])

	// Lazy state initializers: read from localStorage only once
	const [sortType, setSortType] = useState<"alphabetical" | "release">(() => {
		if (typeof window === "undefined") return "release"
		const stored = localStorage.getItem("bossesSortType")
		return stored === "alphabetical" || stored === "release" ? stored : "release"
	})
	const [reverseSort, setReverseSort] = useState(() => {
		if (typeof window === "undefined") return true
		const stored = localStorage.getItem("bossesReverseSort")
		return stored !== null ? stored === "true" : true
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
			localStorage.setItem("bossesSortType", sortType)
			localStorage.setItem("bossesReverseSort", reverseSort.toString())
		}
	}, [sortType, reverseSort, mounted])

	// Configure Fuse.js for fuzzy search
	const fuse = useMemo(() => {
		return new Fuse(bosses, {
			keys: ["profile.name", "profile.title", "aliases"],
			threshold: 0.3,
			includeScore: true,
		})
	}, [bosses])

	// The data maps full names to codes; reverse it for filter labels.
	const bossTypeLabels = useMemo(
		() => Object.fromEntries(Object.entries(bossTypeMap).map(([label, code]) => [code, label])),
		[bossTypeMap],
	)

	// Get all boss types from data
	const bossTypes = useMemo(() => {
		const types = new Set<string>()
		bosses.forEach((boss) => {
			boss.profile.type?.forEach((t) => types.add(t))
		})
		// Sort by the order in bossTypeMap
		const typeOrder = Object.keys(bossTypeMap)
		return Array.from(types).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b))
	}, [bosses, bossTypeMap])

	// Filter and sort bosses
	const filteredBosses = useMemo(() => {
		let result = bosses

		// Apply search filter
		if (searchQuery.trim()) {
			const searchResults = fuse.search(searchQuery)
			result = searchResults.map((item) => item.item)
		}

		// Filter by type
		if (selectedType !== "all") {
			result = result.filter((boss) => boss.profile.type?.includes(selectedType))
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

		// Save the sorted/filtered list of boss slugs to sessionStorage for next/prev navigation
		if (typeof window !== "undefined") {
			const slugs = result.map((b) => b.profile.name.toLowerCase().replace(/\s+/g, "-"))
			sessionStorage.setItem("currentBossList", JSON.stringify(slugs))
		}

		return result
	}, [bosses, searchQuery, fuse, selectedType, sortType, reverseSort, releaseOrder])

	// Show loading spinner until hydrated
	if (!mounted) {
		return (
			<div className="flex items-center justify-center h-96">
				<Spinner className="h-8 w-8" />
			</div>
		)
	}

	// Show message when no bosses data available
	if (bosses.length === 0) {
		return (
			<div>
				<div className="space-y-2 mb-4">
					<div className="flex flex-row justify-between items-center">
						<div className="flex flex-row gap-2 items-baseline">
							<div className="text-xl font-bold">Bosses</div>
						</div>
					</div>
				</div>
				<div className="text-center py-12 text-muted-foreground">
					<p className="text-lg">No boss data available for this data version.</p>
					<p className="text-sm mt-2">Try switching to another version.</p>
				</div>
			</div>
		)
	}

	return (
		<div>
			<div className="space-y-2 mb-4">
				<div className="flex flex-row justify-between items-center">
					<div className="flex flex-row gap-2 items-baseline">
						<div className="text-xl font-bold">Bosses</div>
						<div className="text-muted-foreground text-sm">
							<span className="hidden sm:inline">Showing </span>
							{filteredBosses.length}
							<span> bosses</span>
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

				<div className="flex flex-col items-start sm:flex-row sm:items-center gap-2">
					{/* Search Input */}
					<div className="w-full sm:max-w-sm relative">
						<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
							<Search className="h-4 w-4" />
						</span>
						<Input
							ref={searchInputRef}
							type="text"
							placeholder="Search for bosses..."
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

					{/* Boss Type Filter */}
					<div className="w-full sm:w-auto">
						<SearchableFilter
							label="Filter by boss type"
							searchPlaceholder="Search boss types..."
							value={selectedType}
							onValueChange={setSelectedType}
							options={[
								{ value: "all", label: "All boss types" },
								...bossTypes.map((type) => ({ value: type, label: bossTypeLabels[type] ?? type })),
							]}
						/>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredBosses.map((boss) => {
					const slug = boss.profile.name.toLowerCase().replace(/\s+/g, "-")
					return (
						<Link
							key={boss.profile.name}
							href={`/bosses/${encodeURIComponent(slug)}`}
							className="hover:scale-105 transition-transform duration-300 grid-item-lazy"
							onClick={() => setLoadingSlug(slug)}
						>
							<Card className="hover:shadow-lg transition-shadow cursor-pointer h-full gap-2 relative">
								<CardHeader>
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 flex items-center justify-center">
											<Image
												src={`/kingsraid-data/assets/${boss.profile.thumbnail}`}
												alt={boss.profile.name}
												width="0"
												height="0"
												sizes="30vw md:10vw"
												className="w-full h-auto rounded"
											/>
										</div>
										<div className="flex-1">
											<CardTitle className="text-lg">{boss.profile.name}</CardTitle>
											<CardDescription className="text-sm">{boss.profile.title}</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<div className="flex flex-wrap gap-2">
											{boss.profile.type.map((type) => (
												<Badge key={type} variant="default">
													{type}
												</Badge>
											))}
											<Badge variant="secondary">{boss.profile.race}</Badge>
											<Badge
												variant="default"
												className={
													boss.profile.damage_type === "Physical"
														? "bg-red-300"
														: boss.profile.damage_type === "Magical"
															? "bg-blue-300"
															: "bg-yellow-400"
												}
											>
												{boss.profile.damage_type}
											</Badge>
										</div>
										<div className="text-sm text-muted-foreground line-clamp-3">
											{boss.profile.characteristics}
										</div>
									</div>
								</CardContent>
								{loadingSlug === slug && (
									<div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg z-10">
										<Spinner className="h-8 w-8 text-white" />
									</div>
								)}
							</Card>
						</Link>
					)
				})}
			</div>
		</div>
	)
}
