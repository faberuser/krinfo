"use client"

import { Text } from "@/components/i18n/language-provider"

import { useState, useEffect, useRef } from "react"
import { FBXLoader } from "three-stdlib"
import { AnimationClip, Group } from "three"
import { Card, CardContent } from "@/components/ui/card"
import { ModelViewer } from "@/components/models/ModelViewer"
import { ModelsProps } from "@/components/models/types"
import { formatAnimationName } from "@/components/models/utils"
import { ModelSelector } from "@/components/models/ModelSelector"
import { formatCostumeName } from "@/components/models/utils"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

export default function Models({ heroModels, availableScenes = [], voiceFiles }: ModelsProps) {
	const [selectedCostume, setSelectedCostume] = useState<string>("")
	const [availableAnimations, setAvailableAnimations] = useState<string[]>([])
	const [selectedAnimation, setSelectedAnimation] = useState<string | null>(null)
	const [isLoadingModels, setIsLoadingModels] = useState(false)
	const animationsCacheRef = useRef<Map<string, string[]>>(new Map()) // Cache animations per costume

	// Load animations for the selected costume
	useEffect(() => {
		if (!selectedCostume) return

		// Check if we already have animations cached for this costume
		if (animationsCacheRef.current.has(selectedCostume)) {
			const cachedAnimations = animationsCacheRef.current.get(selectedCostume)!
			setAvailableAnimations(cachedAnimations)
			// Set animation containing "InnIdle" as default if it exists, otherwise use first animation
			const defaultAnimation =
				cachedAnimations.find((name) => name.includes("InnIdle")) || cachedAnimations[0] || null
			setSelectedAnimation(defaultAnimation)
			return
		}

		// Clear animations when switching to uncached costume
		setAvailableAnimations([])
		setSelectedAnimation(null)

		const loadAnimations = async () => {
			const fbxLoader = new FBXLoader()
			const modelDir = `${basePath}/kingsraid-models/models/heroes`

			// Load from the current costume's models - prioritize body, then first available
			const costumeModels = heroModels[selectedCostume]
			if (!costumeModels || costumeModels.length === 0) {
				return
			}

			// Try to find body model first, as it typically has the most complete animation set
			const bodyModel = costumeModels.find((m) => m.type === "body")
			const firstModel = bodyModel || costumeModels[0]

			try {
				const fbx = await new Promise<Group>((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(new Error(`Timeout loading ${firstModel.path}`))
					}, 60000) // 60 second timeout

					fbxLoader.load(
						`${modelDir}/${firstModel.path}`,
						(loadedFbx) => {
							clearTimeout(timeout)
							resolve(loadedFbx)
						},
						undefined,
						(error) => {
							clearTimeout(timeout)
							reject(error)
						},
					)
				})
				if (fbx.animations && fbx.animations.length > 0) {
					const animNames = fbx.animations
						.map((clip: AnimationClip) => clip.name)
						.filter((name: string) => !name.includes("Extra"))
						.filter((name: string) => !name.includes("_Weapon@"))
						.filter((name: string) => !name.includes("_Weapon_Facial@"))
					// Hide weapon animations from UI

					if (animNames.length > 0) {
						// Sort animations before caching and selecting
						const sortedAnimNames = [...animNames].sort((a, b) => {
							return formatAnimationName(a).localeCompare(formatAnimationName(b))
						})

						// Move animation containing "InnIdle" to the top if it exists
						const innIdleIndex = sortedAnimNames.findIndex((name) => name.includes("InnIdle"))
						if (innIdleIndex > 0) {
							const innIdle = sortedAnimNames.splice(innIdleIndex, 1)[0]
							sortedAnimNames.unshift(innIdle)
						}

						// Use a microtask to ensure state updates are batched properly
						Promise.resolve().then(() => {
							// Cache the sorted animations for this costume
							animationsCacheRef.current.set(selectedCostume, sortedAnimNames)
							setAvailableAnimations(sortedAnimNames)
							// Set animation containing "InnIdle" as default if it exists, otherwise use first animation
							const defaultAnimation =
								sortedAnimNames.find((name) => name.includes("InnIdle")) || sortedAnimNames[0]
							setSelectedAnimation(defaultAnimation)
						})
					} else {
						// Cache empty array for costumes with no animations
						animationsCacheRef.current.set(selectedCostume, [])
					}
				} else {
					// Cache empty array for costumes with no animations
					animationsCacheRef.current.set(selectedCostume, [])
				}
			} catch (error) {
				console.error(`Failed to load animations for costume ${selectedCostume}:`, error)
				// Cache empty array on error to avoid repeated failed loads
				animationsCacheRef.current.set(selectedCostume, [])
			}
		}

		loadAnimations()
	}, [selectedCostume, heroModels])

	const costumeOptions = Object.keys(heroModels).sort()
	const currentModels = selectedCostume ? heroModels[selectedCostume] || [] : []

	if (costumeOptions.length === 0) {
		return (
			<Card>
				<CardContent>
					<div className="text-center text-muted-foreground py-8"><Text messageKey="uiNo3dModelsAvailableForThisHero" /></div>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Main content */}
			{!selectedCostume ? (
				<div className="justify-center items-center flex text-muted-foreground h-10 max-h-10 lg:h-200 lg:max-h-200 border rounded-lg">
					<Text messageKey="uiSelectACostumeFromTheListToView3dModel" /></div>
			) : currentModels.length > 0 ? (
				<ModelViewer
					key="model-viewer-stable"
					modelFiles={currentModels}
					availableAnimations={availableAnimations}
					selectedAnimation={selectedAnimation}
					setSelectedAnimation={setSelectedAnimation}
					isLoading={isLoadingModels}
					setIsLoading={setIsLoadingModels}
					availableScenes={availableScenes}
					voiceFiles={voiceFiles}
				/>
			) : (
				<div className="justify-center items-center flex text-muted-foreground lg:h-200 lg:max-h-200 border rounded-lg">
					<Text messageKey="uiNoModelsAvailableForThisCostume" /></div>
			)}

			{/* Costume selection panel below */}
			<ModelSelector
				modelOptions={costumeOptions}
				selectedModel={selectedCostume}
				setSelectedModel={setSelectedCostume}
				models={heroModels}
				isLoadingModels={isLoadingModels}
				isOpen={true}
				formatName={formatCostumeName}
			/>
		</div>
	)
}
