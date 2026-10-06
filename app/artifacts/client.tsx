"use client"

import { Text, useTranslation, useLocalizedArtifacts } from "@/components/i18n/language-provider"
import { useState, useEffect, useMemo, startTransition } from "react"
import Fuse from "fuse.js"
import { ListPageHeader, ListPageSearch, type ListSortType } from "@/components/list-page-header"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "@/components/next-image"
import { ArtifactData } from "@/model/Artifact"
import { Button } from "@/components/ui/button"
import { ChevronDown, Check, Sparkles } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Spinner } from "@/components/ui/spinner"
import { ArtifactEffectBadges } from "@/components/artifact-effect-badges"
import { ARTIFACT_EFFECT_TAGS, getArtifactEffectTags, type ArtifactEffectTag } from "@/lib/artifact-tags"

interface ArtifactsClientProps {
	artifacts: ArtifactData[]
	releaseOrder: Record<string, string>
}

export default function ArtifactsClient({ artifacts: sourceArtifacts, releaseOrder }: ArtifactsClientProps) {
	const { locale } = useTranslation()
	const artifacts = useLocalizedArtifacts(sourceArtifacts)
	const [searchQuery, setSearchQuery] = useState("")
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
	const [sortType, setSortType] = useState<ListSortType>(() => {
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
			keys: ["name", "id", "aliases", "effectTags"],
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
				const aOrder = parseInt(releaseOrder[a.id] ?? "9999", 10)
				const bOrder = parseInt(releaseOrder[b.id] ?? "9999", 10)
				return aOrder - bOrder
			})
		} else {
			result = [...result].sort((a, b) => a.name.localeCompare(b.name, locale))
		}

		// Reverse if needed
		if (reverseSort) {
			result = result.reverse()
		}

		return result
	}, [taggedArtifacts, searchQuery, fuse, sortType, reverseSort, releaseOrder, selectedEffect, locale])

	useEffect(() => {
		const slugs = filteredArtifacts.map((a) => a.id.toLowerCase().replace(/\s+/g, "-"))
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
			<ListPageHeader
				title={<Text messageKey="uiArtifacts" />}
				count={filteredArtifacts.length}
				countLabel={<Text messageKey="uiArtifacts_0f50505c" />}
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
						placeholder="Search names, aliases, or effects..."
						aria-label="Search artifacts"
					/>
				}
			>
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
								<span className="flex min-w-0 items-center gap-2">
									<Sparkles className="size-4" aria-hidden="true" />
									<span className="truncate">
										<Text>
											{selectedEffect === "all"
												? "All effects"
												: `${selectedEffect} (${effectCounts.get(selectedEffect) ?? 0})`}
										</Text>
									</span>
								</span>
								<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
							<Command>
								<CommandInput placeholder="Search effects..." aria-label="Search effects" />
								<CommandList>
									<CommandEmpty>
										<Text messageKey="uiNoEffectsFound" />
									</CommandEmpty>
									<CommandGroup>
										<CommandItem
											value="All effects"
											onSelect={() => {
												setSelectedEffect("all")
												setEffectFilterOpen(false)
											}}
										>
											<Check className={selectedEffect === "all" ? "opacity-100" : "opacity-0"} />
											<Text messageKey="uiAllEffects" />
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
												<Text>{tag}</Text>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			</ListPageHeader>
			{filteredArtifacts.length === 0 ? (
				<p role="status" className="py-12 text-center text-muted-foreground">
					<Text messageKey="uiNoArtifactsMatchTheseFiltersTryAnotherEffectOrClearTheFilters" />
				</p>
			) : null}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredArtifacts.map((artifact) => {
					const slug = artifact.id.toLowerCase().replace(/\s+/g, "-")
					return (
						<Link
							key={artifact.id}
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
													width={64}
													height={64}
													sizes="64px"
													className="w-full h-auto rounded"
												/>
											</div>
										)}
										<div className="flex-1">
											<CardTitle className="text-lg">
												<Text>{artifact.name}</Text>
											</CardTitle>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<ArtifactEffectBadges artifact={artifact} />
										{artifact.description && (
											<p className="text-sm text-muted-foreground line-clamp-3">
												<Text>{artifact.descriptionByStar?.["0"] ?? artifact.description}</Text>
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
