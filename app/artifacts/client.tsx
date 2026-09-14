"use client"

import { useState, useEffect, useMemo, useRef, startTransition } from "react"
import Fuse from "fuse.js"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Image from "@/components/next-image"
import { ArtifactData } from "@/model/Artifact"
import { Button } from "@/components/ui/button"
import { Search, X, ChevronDown, ChevronUp, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Spinner } from "@/components/ui/spinner"
import { ArtifactEffectBadges } from "@/components/artifact-effect-badges"
import { ARTIFACT_EFFECT_TAGS, getArtifactEffectTags, type ArtifactEffectTag } from "@/lib/artifact-tags"

interface ArtifactsClientProps {
	artifacts: ArtifactData[]
	releaseOrder: Record<string, string>
}

export default function ArtifactsClient({ artifacts, releaseOrder }: ArtifactsClientProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const searchInputRef = useRef<HTMLInputElement>(null)
	const [effectFilterOpen, setEffectFilterOpen] = useState(false)
	const [selectedEffect, setSelectedEffect] = useState<ArtifactEffectTag | "all">("all")
	const taggedArtifacts = useMemo(
		() => artifacts.map((artifact) => ({ ...artifact, effectTags: getArtifactEffectTags(artifact) })),
		[artifacts],
	)
	const effectCounts = useMemo(() => {
		const counts = new Map<ArtifactEffectTag, number>()
		for (const artifact of taggedArtifacts) {
			for (const tag of artifact.effectTags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
		}
		return counts
	}, [taggedArtifacts])
	const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
	const pathname = usePathname()

	// Reset spinner if navigation is cancelled
	useEffect(() => {
		startTransition(() => setLoadingSlug(null))
	}, [pathname])

	// Lazy state initializers: read from localStorage only once
	const [sortType, setSortType] = useState<"alphabetical" | "release">(() => {
		if (typeof window === "undefined") return "release"
		const stored = localStorage.getItem("artifactsSortType")
		return stored === "alphabetical" || stored === "release" ? stored : "release"
	})
	const [reverseSort, setReverseSort] = useState(() => {
		if (typeof window === "undefined") return true
		const stored = localStorage.getItem("artifactsReverseSort")
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
			localStorage.setItem("artifactsSortType", sortType)
			localStorage.setItem("artifactsReverseSort", reverseSort.toString())
		}
	}, [sortType, reverseSort, mounted])

	// Configure Fuse.js for fuzzy search
	const fuse = useMemo(() => {
		return new Fuse(taggedArtifacts, {
			keys: ["name", "aliases", "effectTags"],
			threshold: 0.3,
			includeScore: true,
		})
	}, [taggedArtifacts])

	// Filter and sort artifacts
	const filteredArtifacts = useMemo(() => {
		let result = taggedArtifacts

		// Apply search filter
		if (searchQuery.trim()) {
			const searchResults = fuse.search(searchQuery)
			result = searchResults.map((item) => item.item)
		}
		if (selectedEffect !== "all") {
			result = result.filter((artifact) => artifact.effectTags.includes(selectedEffect))
		}

		// Sort by selected sort type
		if (sortType === "release") {
			result = [...result].sort((a, b) => {
				const aOrder = parseInt(releaseOrder[a.name] ?? "9999", 10)
				const bOrder = parseInt(releaseOrder[b.name] ?? "9999", 10)
				return aOrder - bOrder
			})
		} else {
			result = [...result].sort((a, b) => a.name.localeCompare(b.name))
		}

		// Reverse if needed
		if (reverseSort) {
			result = result.reverse()
		}

		return result
	}, [taggedArtifacts, searchQuery, fuse, sortType, reverseSort, releaseOrder, selectedEffect])

	useEffect(() => {
		const slugs = filteredArtifacts.map((a) => a.name.toLowerCase().replace(/\s+/g, "-"))
		sessionStorage.setItem("currentArtifactList", JSON.stringify(slugs))
	}, [filteredArtifacts])

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
						<div className="text-xl font-bold">Artifacts</div>
						<div className="text-muted-foreground text-sm">
							<span className="hidden sm:inline">Showing </span>
							{filteredArtifacts.length}
							<span> artifacts</span>
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
							placeholder="Search names, aliases, or effects..."
							aria-label="Search artifacts"
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
					<div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
						<Popover open={effectFilterOpen} onOpenChange={setEffectFilterOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-label="Filter by effect"
									aria-expanded={effectFilterOpen}
									className="w-full sm:w-64 min-w-0 justify-between font-normal"
								>
									<span className="truncate">
										{selectedEffect === "all"
											? "All effects"
											: `${selectedEffect} (${effectCounts.get(selectedEffect) ?? 0})`}
									</span>
									<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
								<Command>
									<CommandInput placeholder="Search effects..." aria-label="Search effects" />
									<CommandList>
										<CommandEmpty>No effects found.</CommandEmpty>
										<CommandGroup>
											<CommandItem
												value="All effects"
												onSelect={() => {
													setSelectedEffect("all")
													setEffectFilterOpen(false)
												}}
											>
												<Check
													className={selectedEffect === "all" ? "opacity-100" : "opacity-0"}
												/>
												All effects
											</CommandItem>
											{ARTIFACT_EFFECT_TAGS.filter(
												(tag) => effectCounts.has(tag) || tag === selectedEffect,
											).map((tag) => (
												<CommandItem
													key={tag}
													value={tag}
													onSelect={() => {
														setSelectedEffect(tag)
														setEffectFilterOpen(false)
													}}
												>
													<Check
														className={selectedEffect === tag ? "opacity-100" : "opacity-0"}
													/>
													{tag} ({effectCounts.get(tag) ?? 0})
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			</div>
			{filteredArtifacts.length === 0 ? (
				<p role="status" className="py-12 text-center text-muted-foreground">
					No artifacts match these filters. Try another effect or clear the filters.
				</p>
			) : null}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredArtifacts.map((artifact) => {
					const slug = artifact.name.toLowerCase().replace(/\s+/g, "-")
					return (
						<Link
							key={artifact.name}
							href={`/artifacts/${encodeURIComponent(slug)}`}
							className="hover:scale-105 transition-transform duration-300 grid-item-lazy"
							onClick={() => setLoadingSlug(slug)}
						>
							<Card className="hover:shadow-lg transition-shadow cursor-pointer h-full gap-2 relative">
								<CardHeader>
									<div className="flex items-center gap-4">
										{artifact.thumbnail && (
											<div className="w-16 h-16 flex items-center justify-center">
												<Image
													src={`/kingsraid-data/assets/${artifact.thumbnail
														.split("/")
														.map(encodeURIComponent)
														.join("/")}`}
													alt={artifact.name}
													width="0"
													height="0"
													sizes="30vw md:10vw"
													className="w-full h-auto rounded"
												/>
											</div>
										)}
										<div className="flex-1">
											<CardTitle className="text-lg">{artifact.name}</CardTitle>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<ArtifactEffectBadges artifact={artifact} />
										{artifact.description && (
											<p className="text-sm text-muted-foreground line-clamp-3">
												{artifact.description}
											</p>
										)}
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
