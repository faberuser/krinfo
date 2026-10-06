"use client"

import { Text, useTranslation, useSharedRecords } from "@/components/i18n/language-provider"
import { useState, useEffect, useMemo, startTransition } from "react"
import Fuse from "fuse.js"
import { Skull } from "lucide-react"
import { ListPageHeader, ListPageSearch, type ListSortType } from "@/components/list-page-header"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "@/components/next-image"
import { BossData } from "@/model/Boss"
import { SearchableFilter } from "@/components/searchable-filter"
import { Spinner } from "@/components/ui/spinner"

interface BossesClientProps {
	bosses: BossData[]
	bossTypeMap: Record<string, string>
	releaseOrder: Record<string, string>
}

export default function BossesClient({ bosses: sourceBosses, bossTypeMap, releaseOrder }: BossesClientProps) {
	const { locale } = useTranslation()
	const shared = useSharedRecords()
	const bosses = useMemo(
		() => sourceBosses.map((boss) => ({ ...boss, profile: shared.bosses?.[boss.id] ?? boss.profile })),
		[sourceBosses, shared.bosses],
	)
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedType, setSelectedType] = useState("all")
	const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
	const pathname = usePathname()

	// Reset spinner if navigation is cancelled
	useEffect(() => {
		startTransition(() => setLoadingSlug(null))
	}, [pathname])

	// Lazy state initializers: read from localStorage only once
	const [sortType, setSortType] = useState<ListSortType>(() => {
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
			keys: ["profile.name", "id", "profile.title", "aliases"],
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

		// Save the sorted/filtered list of boss slugs to sessionStorage for next/prev navigation
		if (typeof window !== "undefined") {
			const slugs = result.map((b) => b.id.toLowerCase().replace(/\s+/g, "-"))
			sessionStorage.setItem("currentBossList", JSON.stringify(slugs))
		}

		return result
	}, [bosses, searchQuery, fuse, selectedType, sortType, reverseSort, releaseOrder, locale])

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
							<div className="text-xl font-bold">
								<Text messageKey="uiBosses" />
							</div>
						</div>
					</div>
				</div>
				<div className="text-center py-12 text-muted-foreground">
					<p className="text-lg">
						<Text messageKey="uiNoBossDataAvailableForThisDataVersion" />
					</p>
					<p className="text-sm mt-2">
						<Text messageKey="uiTrySwitchingToAnotherVersion" />
					</p>
				</div>
			</div>
		)
	}

	return (
		<div>
			<ListPageHeader
				title={<Text messageKey="uiBosses" />}
				count={filteredBosses.length}
				countLabel={<Text messageKey="uiBosses_091dc8ec" />}
				sortType={sortType}
				reverseSort={reverseSort}
				onSortChange={(nextSortType, nextReverseSort) => {
					setSortType(nextSortType)
					setReverseSort(nextReverseSort)
				}}
				search={
					<ListPageSearch
						value={searchQuery}
						onValueChange={setSearchQuery}
						placeholder="Search for bosses..."
						aria-label="Search bosses"
					/>
				}
			>
				{/* Boss Type Filter */}
				<div className="w-full sm:w-auto">
					<SearchableFilter
						label="Filter by boss type"
						icon={<Skull className="size-4" aria-hidden="true" />}
						searchPlaceholder="Search boss types..."
						value={selectedType}
						onValueChange={setSelectedType}
						options={[
							{ value: "all", label: "All boss types" },
							...bossTypes.map((type) => ({ value: type, label: bossTypeLabels[type] ?? type })),
						]}
					/>
				</div>
			</ListPageHeader>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredBosses.map((boss) => {
					const slug = boss.id.toLowerCase().replace(/\s+/g, "-")
					return (
						<Link
							key={boss.id}
							href={`/bosses/${encodeURIComponent(slug)}`}
							className="hover:scale-105 transition-transform duration-300 grid-item-lazy"
							onClick={() => setLoadingSlug(slug)}
						>
							<Card className="hover:shadow-lg transition-shadow cursor-pointer h-full gap-2 relative">
								<CardHeader>
									<div className="flex items-center gap-4">
										<div className="relative w-16 h-16 shrink-0">
											<Image
												src={`/kingsraid-data/assets/${boss.profile.thumbnail}`}
												alt={boss.profile.name}
												fill
												sizes="64px"
												className="object-contain rounded"
											/>
										</div>
										<div className="min-w-0 flex-1">
											<CardTitle className="text-lg">
												<Text>{boss.profile.name}</Text>
											</CardTitle>
											<CardDescription className="text-sm">
												<Text>{boss.profile.title}</Text>
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<div className="flex flex-wrap gap-2">
											{boss.profile.type.map((type) => (
												<Badge key={type} variant="default">
													<Text>{type}</Text>
												</Badge>
											))}
											<Badge variant="secondary">
												<Text>{boss.profile.race}</Text>
											</Badge>
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
												<Text>{boss.profile.damage_type}</Text>
											</Badge>
										</div>
										<div className="text-sm text-muted-foreground line-clamp-3">
											<Text>{boss.profile.characteristics}</Text>
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
