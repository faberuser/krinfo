"use client"

import { Text, useTranslation, useLocalizedArtifacts } from "@/components/i18n/language-provider"

import { useState, useMemo } from "react"
import Image from "@/components/next-image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Plus, X, Search, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { ArtifactData } from "@/model/Artifact"
import { MobileTooltip } from "@/components/mobile-tooltip"
import Fuse from "fuse.js"
import { DialogDescription } from "@radix-ui/react-dialog"

interface ArtifactSelectDialogProps {
	artifacts: ArtifactData[]
	artifactReleaseOrder: Record<string, string>
	selectedArtifact: ArtifactData | null
	onSelect: (artifact: ArtifactData | null) => void
}

export function ArtifactSelectDialog({
	artifacts: sourceArtifacts,
	artifactReleaseOrder,
	selectedArtifact: sourceSelectedArtifact,
	onSelect,
}: ArtifactSelectDialogProps) {
	const { locale } = useTranslation()
	const artifacts = useLocalizedArtifacts(sourceArtifacts)
	const selectedArtifact = artifacts.find(record => record.id === sourceSelectedArtifact?.id) ?? sourceSelectedArtifact
	const [isOpen, setIsOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [sortType, setSortType] = useState<"alphabetical" | "release">("release")
	const [reverseSort, setReverseSort] = useState(true)

	// Fuse search for artifacts
	const fuse = useMemo(() => {
		return new Fuse(artifacts, {
				keys: ["name", "id", "description", "aliases"],
			threshold: 0.3,
		})
	}, [artifacts])

	const filteredArtifacts = useMemo(() => {
		let result = artifacts

		// Apply search filter
		if (searchQuery.trim()) {
			result = fuse.search(searchQuery).map((r) => r.item)
		}

		// Sort by selected sort type
		if (sortType === "release") {
			result = [...result].sort((a, b) => {
				const aOrder = parseInt(artifactReleaseOrder[a.id] ?? "9999", 10)
				const bOrder = parseInt(artifactReleaseOrder[b.id] ?? "9999", 10)
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
	}, [artifacts, searchQuery, fuse, sortType, reverseSort, artifactReleaseOrder, locale])

	const handleSelect = (artifact: ArtifactData) => {
		onSelect(artifact)
		setIsOpen(false)
		setSearchQuery("")
	}

	const handleClear = () => {
		onSelect(null)
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<div className="flex items-center gap-1">
				{selectedArtifact ? (
					<MobileTooltip
						content={
							<>
								<div className="font-bold"><Text>{selectedArtifact.name}</Text></div>
								<div className="text-xs mt-1"><Text>{selectedArtifact.descriptionByStar?.["0"] ?? selectedArtifact.description}</Text></div>
							</>
						}
					>
						<div className="relative">
							<DialogTrigger asChild>
								<button
									className={cn(
										"w-10 h-10 rounded border-2 overflow-hidden transition-all",
										"border-orange-500 ring-2 ring-orange-500/30",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/${selectedArtifact.thumbnail
											.split("/")
											.map(encodeURIComponent)
											.join("/")}`}
										alt={selectedArtifact.id}
										width={40}
										height={40}
										className="w-full h-full object-cover"
									/>
								</button>
							</DialogTrigger>
							<button
								onClick={(e) => {
									e.stopPropagation()
									handleClear()
								}}
								className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80"
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					</MobileTooltip>
				) : (
					<MobileTooltip content="Select Artifact">
						<DialogTrigger asChild>
							<button
								className={cn(
									"w-10 h-10 rounded border-2 border-dashed border-muted-foreground/50 overflow-hidden transition-all",
									"flex items-center justify-center hover:border-orange-500 hover:bg-orange-500/10",
								)}
							>
								<Plus className="h-5 w-5 text-muted-foreground" />
							</button>
						</DialogTrigger>
					</MobileTooltip>
				)}
			</div>

			<DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-hidden flex flex-col bg-background/70 backdrop-blur-sm">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-4">
						<span><Text messageKey="uiSelectArtifact" /></span>
						<span className="text-sm font-normal text-muted-foreground">
							{filteredArtifacts.length} <Text messageKey="uiArtifacts_0f50505c" /></span>
					</DialogTitle>
				</DialogHeader>
				<DialogDescription className="sr-only"><Text messageKey="uiSelectAnArtifactFromTheListBelow" /></DialogDescription>

				{/* Search and Sort Row */}
				<div className="flex flex-row gap-2 items-start sm:items-center justify-between">
					{/* Search Input */}
					<div className="w-full sm:max-w-sm relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search artifacts..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>

					{/* Sort Buttons */}
					<div className="flex flex-row gap-1">
						<Button
							variant={sortType === "alphabetical" ? "outline" : "ghost"}
							size="sm"
							onClick={() => {
								if (sortType === "alphabetical") {
									setReverseSort(!reverseSort)
								} else {
									setSortType("alphabetical")
									setReverseSort(false)
								}
							}}
						>
							{sortType === "alphabetical" && reverseSort && <ChevronDown className="h-4 w-4" />}
							{sortType === "alphabetical" && !reverseSort && <ChevronUp className="h-4 w-4" />}
							<Text>{sortType === "alphabetical" && reverseSort ? "Z → A" : "A → Z"}</Text>
						</Button>
						<Button
							variant={sortType === "release" ? "outline" : "ghost"}
							size="sm"
							onClick={() => {
								if (sortType === "release") {
									setReverseSort(!reverseSort)
								} else {
									setSortType("release")
									setReverseSort(true)
								}
							}}
						>
							{sortType === "release" && reverseSort && <ChevronUp className="h-4 w-4" />}
							{sortType === "release" && !reverseSort && <ChevronDown className="h-4 w-4" />}
							<Text messageKey="uiRelease" /></Button>
					</div>
				</div>

				{/* Artifacts Grid */}
				<div className="flex-1 overflow-y-auto custom-scrollbar mt-3">
					<div className="flex flex-wrap justify-center gap-3 px-2 py-1">
						{filteredArtifacts.map((artifact) => (
							<div
								key={artifact.id}
								className="relative w-[calc((100%-1.5rem)/3)] sm:w-[calc((100%-3rem)/5)] md:w-[calc((100%-4.5rem)/7)] lg:w-[calc((100%-6rem)/9)] aspect-square"
							>
								<MobileTooltip
									content={
										<>
											<div className="font-bold"><Text>{artifact.name}</Text></div>
											<div className="text-xs mt-1 max-w-50"><Text>{artifact.descriptionByStar?.["0"] ?? artifact.description}</Text></div>
										</>
									}
								>
									<button
										onClick={() => handleSelect(artifact)}
										className={cn(
											"absolute inset-0 rounded border overflow-hidden transition-all",
											selectedArtifact?.id === artifact.id
												? "ring-2 ring-orange-500"
												: "hover:ring-2 hover:ring-primary active:scale-95",
										)}
									>
										<Image
											src={`/kingsraid-data/assets/${artifact.thumbnail
												.split("/")
												.map(encodeURIComponent)
												.join("/")}`}
											alt={artifact.name}
											width="0"
											height="0"
											sizes="40vw md:20vw"
											className="w-full h-full object-cover"
										/>
										<div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-1.5 z-10">
											<div className="text-xs text-white truncate text-center font-medium">
												<Text>{artifact.name}</Text>
											</div>
										</div>
									</button>
								</MobileTooltip>
							</div>
						))}
					</div>
					{filteredArtifacts.length === 0 && (
						<div className="text-center text-muted-foreground py-8"><Text messageKey="uiNoArtifactsFound" /></div>
					)}
				</div>

				{/* Clear button */}
				{selectedArtifact && (
					<Button
						variant="outline"
						onClick={() => {
							handleClear()
							setIsOpen(false)
						}}
					>
						<Text messageKey="uiClearArtifact" /></Button>
				)}
			</DialogContent>
		</Dialog>
	)
}
