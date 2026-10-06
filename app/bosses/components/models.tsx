"use client"

import { Text } from "@/components/i18n/language-provider"
import { useState, useEffect, useRef } from "react"
import { FBXLoader } from "three-stdlib"
import { AnimationClip, Group } from "three"
import { Card, CardContent } from "@/components/ui/card"
import { ModelViewer } from "@/components/models/ModelViewer"
import { ModelFile } from "@/model/Hero_Model"
import { formatAnimationName } from "@/components/models/utils"
import { ModelSelector } from "@/components/models/ModelSelector"
import { formatModelName } from "@/components/models/utils"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

function findIdleAnimation(animations: string[]) {
	return (
		animations.find((name) => /@Idle(?:UI)?_/i.test(name)) ||
		animations.find((name) => /idle/i.test(name)) || animations[0] || null
	)
}

// Boss models are now organized by variant (similar to hero costumes)
type BossModelData = Record<string, ModelFile[]>

interface BossModelsProps {
	bossModels: BossModelData
	bossScenes?: Array<{ value: string; label: string }>
	bossName: string
}

export default function BossModels({ bossModels, bossScenes = [], bossName }: BossModelsProps) {
	const modelOptions = Object.keys(bossModels).sort()

	const [selectedModel, setSelectedModel] = useState<string>("")
	const [availableAnimations, setAvailableAnimations] = useState<string[]>([])
	const [selectedAnimation, setSelectedAnimation] = useState<string | null>(null)
	const [isLoadingModels, setIsLoadingModels] = useState(false)
	const animationsCacheRef = useRef<Map<string, string[]>>(new Map()) // Cache animations per model variant

	// Load animations for the selected model variant
	useEffect(() => {
		if (!selectedModel) return

		// Check if we already have animations cached for this model variant
		if (animationsCacheRef.current.has(selectedModel)) {
			const cachedAnimations = animationsCacheRef.current.get(selectedModel)!
			setAvailableAnimations(cachedAnimations)
			// Set first animation or idle as default
			const defaultAnimation = findIdleAnimation(cachedAnimations)
			setSelectedAnimation(defaultAnimation)
			return
		}

		// Clear animations when switching to uncached model variant
		setAvailableAnimations([])
		setSelectedAnimation(null)

		const loadAnimations = async () => {
			const fbxLoader = new FBXLoader()
			const modelDir = `${basePath}/kingsraid-models/models/bosses`

			// Load from the current model variant
			const modelVariantFiles = bossModels[selectedModel]
			if (!modelVariantFiles || modelVariantFiles.length === 0) {
				return
			}

			// Use the first model file (should be the body)
			const firstModel = modelVariantFiles[0]
			const modelPath = `${modelDir}/${firstModel.path}`

			try {
				const fbx = await new Promise<Group>((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(new Error(`Timeout loading ${firstModel.path}`))
					}, 60000) // 60 second timeout

					fbxLoader.load(
						modelPath,
						(loadedFbx) => {
							clearTimeout(timeout)
							resolve(loadedFbx)
						},
						undefined, // onProgress callback
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

					if (animNames.length > 0) {
						// Sort animations before caching and selecting
						const sortedAnimNames = [...animNames].sort((a, b) => {
							return formatAnimationName(a).localeCompare(formatAnimationName(b))
						})

						// Move idle animation to the top if it exists
						const idleAnimation = findIdleAnimation(sortedAnimNames)
						const idleIndex = idleAnimation ? sortedAnimNames.indexOf(idleAnimation) : -1
						if (idleIndex > 0) {
							const idle = sortedAnimNames.splice(idleIndex, 1)[0]
							sortedAnimNames.unshift(idle)
						}

						// Use a microtask to ensure state updates are batched properly
						Promise.resolve().then(() => {
							// Cache the sorted animations for this model variant
							animationsCacheRef.current.set(selectedModel, sortedAnimNames)
							setAvailableAnimations(sortedAnimNames)
							// Set idle or first animation as default
							const defaultAnimation = findIdleAnimation(sortedAnimNames)
							setSelectedAnimation(defaultAnimation)
						})
					} else {
						// Cache empty array for model variants with no animations
						animationsCacheRef.current.set(selectedModel, [])
					}
				} else {
					// Cache empty array for model variants with no animations
					animationsCacheRef.current.set(selectedModel, [])
				}
			} catch (error) {
				console.error(`Failed to load animations for boss model ${selectedModel}:`, error)
				// Cache empty array on error to avoid repeated failed loads
				animationsCacheRef.current.set(selectedModel, [])
			}
		}

		loadAnimations()
	}, [selectedModel, bossModels])

	const currentModels = selectedModel ? bossModels[selectedModel] || [] : []

	if (modelOptions.length === 0) {
		return (
			<Card>
				<CardContent>
					<div className="text-center text-muted-foreground py-8">
						<Text messageKey="uiNo3dModelsAvailableForThisBoss" />
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Main content */}
			{!selectedModel ? (
				<div className="justify-center items-center flex text-muted-foreground lg:h-200 lg:max-h-200 border rounded-lg">
					<Text messageKey="uiSelectAModelFromTheListToViewThe3dModel" />
				</div>
			) : currentModels.length > 0 ? (
				<ModelViewer
					key="boss-model-viewer-stable"
					modelFiles={currentModels}
					availableAnimations={availableAnimations}
					selectedAnimation={selectedAnimation}
					setSelectedAnimation={setSelectedAnimation}
					isLoading={isLoadingModels}
					setIsLoading={setIsLoadingModels}
					availableScenes={bossScenes}
					modelType="bosses"
					bossName={bossName}
				/>
			) : (
				<div className="justify-center items-center flex text-muted-foreground lg:h-200 lg:max-h-200 border rounded-lg">
					<Text messageKey="uiNoModelsAvailableForThisVariant" />
				</div>
			)}

			{/* Model selection panel below */}
			<ModelSelector
				modelOptions={modelOptions}
				selectedModel={selectedModel}
				setSelectedModel={setSelectedModel}
				models={bossModels}
				isLoadingModels={isLoadingModels}
				isOpen={true}
				formatName={formatModelName}
			/>
		</div>
	)
}
