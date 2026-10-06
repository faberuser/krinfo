"use client"

import { Text } from "@/components/i18n/language-provider"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Play, Pause, Search, X } from "lucide-react"
import { ModelFile } from "@/model/Hero_Model"
import { formatAnimationName } from "@/components/models/utils"
import Fuse from "fuse.js"

interface ControlsPanelProps {
	isCollapsed: boolean
	isLoading: boolean
	selectedScene: string
	setSelectedScene: (scene: string) => void
	availableScenes: Array<{ value: string; label: string }>
	modelFiles: ModelFile[]
	visibleModels: Set<string>
	toggleModelVisibility: (modelName: string) => void
	availableAnimations: string[]
	selectedAnimation: string | null
	setSelectedAnimation: (animation: string | null) => void
	isPaused: boolean
	setIsPaused: (paused: boolean) => void
}

export function ControlsPanel({
	isCollapsed,
	isLoading,
	selectedScene,
	setSelectedScene,
	availableScenes,
	modelFiles,
	visibleModels,
	toggleModelVisibility,
	availableAnimations,
	selectedAnimation,
	setSelectedAnimation,
	isPaused,
	setIsPaused,
}: ControlsPanelProps) {
	const [searchQuery, setSearchQuery] = useState("")

	// Configure Fuse.js for fuzzy searching
	const fuse = useMemo(
		() =>
			new Fuse(availableAnimations, {
				threshold: 0.4,
				keys: [""],
				includeScore: true,
			}),
		[availableAnimations],
	)

	// Filter animations based on search query
	const filteredAnimations = useMemo(() => {
		if (!searchQuery.trim()) {
			return availableAnimations
		}
		const results = fuse.search(searchQuery)
		return results.map((result) => result.item)
	}, [searchQuery, availableAnimations, fuse])

	// Handle spacebar to pause/play animation (like YouTube)
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			// Only toggle if spacebar is pressed and not focused on an input/button/select
			if (
				e.code === "Space" &&
				!isLoading &&
				availableAnimations.length > 0 &&
				document.activeElement?.tagName !== "INPUT" &&
				document.activeElement?.tagName !== "BUTTON" &&
				document.activeElement?.tagName !== "SELECT" &&
				document.activeElement?.tagName !== "TEXTAREA"
			) {
				e.preventDefault()
				setIsPaused(!isPaused)
			}
		}

		window.addEventListener("keydown", handleKeyPress)
		return () => window.removeEventListener("keydown", handleKeyPress)
	}, [isPaused, setIsPaused, isLoading, availableAnimations.length])

	return (
		<div
			className="absolute top-0 h-full z-10 bg-background/70 backdrop-blur-sm border-r p-4 overflow-y-auto flex flex-col gap-4 w-52 transition-all duration-300 ease-in-out"
			style={{
				left: isCollapsed ? "-208px" : "0px",
			}}
		>
			{/* Scene Selection */}
			<div className="space-y-2">
				<div className="text-sm font-semibold"><Text messageKey="uiScene" /></div>
				<Select value={selectedScene} onValueChange={setSelectedScene} disabled={isLoading}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select Scene" />
					</SelectTrigger>
					<SelectContent>
						{availableScenes.map((scene) => (
							<SelectItem key={scene.value} value={scene.value}>
								<Text>{scene.label}</Text>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Separator />

			{/* Individual Model Toggles */}
			<div className="space-y-2">
				<div className="text-sm font-semibold"><Text messageKey="uiParts_4d1038ae" />{modelFiles.length})</div>
				<div className="flex flex-col items-center gap-2">
					{Array.from(new Map(modelFiles.map((model) => [model.name, model])).values())
						.sort((a, b) => a.name.localeCompare(b.name))
						.map((model) => (
							<Button
								key={model.name}
								size="sm"
								variant={visibleModels.has(model.name) ? "default" : "outline"}
								onClick={() => toggleModelVisibility(model.name)}
								className="flex items-center gap-2 w-full"
								disabled={isLoading}
							>
								{visibleModels.has(model.name) ? (
									<Eye className="h-3 w-3" />
								) : (
									<EyeOff className="h-3 w-3" />
								)}
								<span className="capitalize"><Text>{model.type}</Text></span>
							</Button>
						))}
				</div>
			</div>

			{/* Animation Selection */}
			{availableAnimations.length > 0 && (
				<>
					<Separator />

					<div className="space-y-2 w-full flex-1 min-h-0 overflow-hidden flex flex-col">
						<div className="flex items-center justify-between">
							<div className="text-sm font-semibold"><Text messageKey="uiAnimations_cb5a7ed1" />{availableAnimations.length})</div>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setIsPaused(!isPaused)}
								className="h-6 w-6 p-0"
								title={isPaused ? "Play animation" : "Pause animation"}
								disabled={isLoading}
							>
								{isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
							</Button>
						</div>

						{/* Search Box */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8 pb-1.5 h-8 text-xs"
								disabled={isLoading}
							/>
							{searchQuery && (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setSearchQuery("")}
									className="absolute right-0 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
									title="Clear search"
								>
									<X className="h-3 w-3" />
								</Button>
							)}
						</div>

						{/* Animation List */}
						<div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">
							{filteredAnimations.length > 0 ? (
								filteredAnimations.map((animName) => (
									<Button
										key={animName}
										size="sm"
										variant={selectedAnimation === animName ? "default" : "outline"}
										onClick={() => setSelectedAnimation(animName)}
										title={animName}
										disabled={isLoading}
									>
										<span className="text-start text-xs truncate w-full">
											<Text>{formatAnimationName(animName)}</Text>
										</span>
									</Button>
								))
							) : (
								<div className="text-xs text-muted-foreground text-center py-4">
									<Text messageKey="uiNoAnimationsFound" /></div>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	)
}
