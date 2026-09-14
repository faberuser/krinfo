"use client"

import { useRef, useState, useEffect } from "react"
import type React from "react"
import { useFrame } from "@react-three/fiber"
import { FBXLoader } from "three-stdlib"
import * as THREE from "three"
import { ModelFile } from "@/model/Hero_Model"
import { weaponTypes } from "@/components/models/types"
import { loadBossOffsetConfig } from "@/components/models/bossOffsetConfig"
import { findNextInSequence, findSequenceStart } from "@/components/models/utils"
import { bindHeroSkeletons } from "@/components/models/bindHeroSkeletons"
import { getHeroWeaponConfig, createWeaponVisibilitySync } from "@/components/models/heroWeaponConfig"
import { loadFacialAnimation } from "@/components/models/facialAnimation"
import { modelTextureOverrides, modelTransformOverrides } from "@/components/models/modelConfig"
import { repairEyebrowTextures } from "./repairEyebrowTextures"
import { advanceAnimationFrame, type SequencePlayback } from "@/components/models/advanceAnimationFrame"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

function hasSceneAttachment(modelFile: ModelFile, modelType: ModelProps["modelType"]) {
	return modelType === "heroes" && getHeroWeaponConfig(modelFile)?.attachment === "scene"
}

type HeroModel = THREE.Group & {
	mixer?: THREE.AnimationMixer
	animations?: THREE.AnimationClip[]
	handPointR?: THREE.Object3D
	handPointL?: THREE.Object3D
	facial?: Awaited<ReturnType<typeof loadFacialAnimation>>
}

interface ModelProps {
	modelFiles: ModelFile[]
	visibleModels: Set<string>
	setVisibleModels?: React.Dispatch<React.SetStateAction<Set<string>>>
	selectedAnimation: string | null
	isPaused?: boolean
	setIsLoading?: (loading: boolean) => void
	setLoadingProgress?: (progress: number) => void
	onAnimationDurationChange?: (duration: number) => void
	modelType?: "heroes" | "bosses" | "artifacts"
	bossName?: string
	availableAnimations?: string[]
	onAnimationChange?: (animation: string) => void
}

export function Model({
	modelFiles,
	visibleModels,
	setVisibleModels,
	selectedAnimation,
	isPaused,
	setIsLoading,
	setLoadingProgress,
	onAnimationDurationChange,
	modelType = "heroes",
	bossName,
	availableAnimations = [],
	onAnimationChange,
}: ModelProps) {
	const groupRef = useRef<THREE.Group>(null)
	const [loadedModels, setLoadedModels] = useState<Map<string, HeroModel>>(new Map())
	useEffect(() => {
		if (modelType !== "heroes") return
		const bodies: THREE.Object3D[] = []
		const hairs: THREE.Object3D[] = []
		for (const file of modelFiles) {
			const model = loadedModels.get(file.name)
			if (!model) continue
			if (file.type === "body") bodies.push(model)
			if (file.type === "hair") hairs.push(model)
		}
		repairEyebrowTextures(bodies, hairs)
	}, [loadedModels, modelFiles, modelType])
	const mixersRef = useRef<Map<string, THREE.AnimationMixer>>(new Map())
	const activeActionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map())
	const sharedAnimationsRef = useRef<THREE.AnimationClip[]>([])
	const sequencePlaybackRef = useRef<SequencePlayback | null>(null)
	const playingAnimationRef = useRef<string | null>(null)
	const weaponVisibilitySyncRef = useRef<ReturnType<typeof createWeaponVisibilitySync>>(null)
	const currentProgressRef = useRef<number>(0)
	const isLoadingRef = useRef<boolean>(false)
	const previousModelFilesRef = useRef<ModelFile[]>([])
	const loadGenerationRef = useRef(0)
	const [bossConfig, setBossConfig] = useState<Awaited<ReturnType<typeof loadBossOffsetConfig>>>(null)
	const attachedWeaponsRef = useRef<Set<string>>(new Set()) // Track which weapons have been attached
	const frameCountRef = useRef<number>(0) // Count frames to wait for skeleton stability

	useEffect(() => {
		weaponVisibilitySyncRef.current = modelType === "heroes"
			? createWeaponVisibilitySync(modelFiles, loadedModels)
			: null
		return () => { weaponVisibilitySyncRef.current = null }
	}, [modelFiles, loadedModels, modelType])

	// Load boss offset config for boss models
	useEffect(() => {
		if (modelType === "bosses" && bossName) {
			loadBossOffsetConfig(bossName).then((config) => {
				setBossConfig(config)
			})
		}
	}, [modelType, bossName])

	useEffect(() => {
		// Check if modelFiles have changed (costume switch)
		const modelFilesChanged =
			previousModelFilesRef.current.length !== modelFiles.length ||
			previousModelFilesRef.current.some((prev, idx) => prev.path !== modelFiles[idx]?.path)

		if (modelFilesChanged) {
			loadGenerationRef.current++
			// Reset everything when switching costumes
			currentProgressRef.current = 0
			isLoadingRef.current = false
			setLoadedModels(new Map())
			mixersRef.current.clear()
			activeActionsRef.current.clear()
			sequencePlaybackRef.current = null
			playingAnimationRef.current = null
			sharedAnimationsRef.current = []
			attachedWeaponsRef.current.clear() // Reset attached weapons tracking
			frameCountRef.current = 0 // Reset frame counter for weapon attachment
			previousModelFilesRef.current = [...modelFiles]
		}
		const loadGeneration = loadGenerationRef.current

		const loadModel = async (modelFile: ModelFile, modelIndex: number, totalModels: number) => {
			if (loadedModels.has(modelFile.name)) return
			const modelDir = `${basePath}/kingsraid-models/models/${modelType}`

			try {
				const fbxLoader = new FBXLoader()

				// Load FBX model with progress tracking
				const fbx = await new Promise<THREE.Group>((resolve, reject) => {
					fbxLoader.load(
						`${modelDir}/${modelFile.path}`,
						resolve,
						(xhr) => {
							// Calculate progress for this individual model
							const modelProgress = xhr.total > 0 ? xhr.loaded / xhr.total : 0
							// Calculate overall progress considering all models
							const previousModelsProgress = modelIndex / totalModels
							const currentModelContribution = 1 / totalModels
							const totalProgress =
								(previousModelsProgress + modelProgress * currentModelContribution) * 100

							// Ensure progress never goes backwards
							if (totalProgress > currentProgressRef.current) {
								currentProgressRef.current = totalProgress
								if (setLoadingProgress) {
									setLoadingProgress(totalProgress)
								}
							}
						},
						reject,
					)
				})

				const modelWithAnimations = fbx as HeroModel
				if (loadGeneration !== loadGenerationRef.current) return
				modelWithAnimations.animations = fbx.animations || []
				if (modelType === "heroes" && modelFile.facialMetadataPath) {
					try {
						modelWithAnimations.facial = await loadFacialAnimation(
							fbx,
							modelFile.path,
							`${basePath}${modelFile.facialMetadataPath}`,
							modelDir,
						)
					} catch (error) {
						console.warn(`Facial animation unavailable for ${modelFile.name}`, error)
					}
				}

				// Find hand attachment points for weapon attachment
				if (loadGeneration !== loadGenerationRef.current) return
				fbx.traverse((child) => {
					const childNameLower = child.name.toLowerCase()
					// Look for Point_hand_R/L (proper attachment points)
					// Also try variations like Point_Hand_R, point_Hand_R, etc.
					if (
						childNameLower.includes("point") &&
						childNameLower.includes("hand") &&
						childNameLower.includes("r")
					) {
						modelWithAnimations.handPointR = child
					} else if (
						childNameLower.includes("point") &&
						childNameLower.includes("hand") &&
						childNameLower.includes("l")
					) {
						modelWithAnimations.handPointL = child
					}
				})

				// Bind skeleton for skinned meshes (crucial for AssetStudio FBX files)
				if (modelType === "heroes") {
					bindHeroSkeletons(fbx, getHeroWeaponConfig(modelFile)?.recalculateBoneInverses)
				} else {
					fbx.traverse((child) => {
						if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
							const skinnedMesh = child as THREE.SkinnedMesh
							if (skinnedMesh.skeleton) {
								skinnedMesh.bind(skinnedMesh.skeleton)
							}
						}
					})
				}

				// Correct export axes after binding in the original coordinate system.
				const transformOverride = modelType === "heroes" ? modelTransformOverrides[modelFile.path] : undefined
				if (transformOverride?.rotationDegrees) {
					const { x, y, z } = transformOverride.rotationDegrees
					fbx.rotation.set(THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z))
					fbx.updateMatrixWorld(true)
				}
				// Some body exports duplicate a separately toggleable hair/accessory mesh.
				for (const name of transformOverride?.hiddenMeshes ?? []) {
					const mesh = fbx.getObjectByName(name)
					if (mesh instanceof THREE.Mesh) mesh.visible = false
				}

				// Repair missing material maps using model-specific exported textures.
				const textureOverrides = modelType === "heroes" ? modelTextureOverrides[modelFile.path] : undefined
				if (textureOverrides) {
					const textures = new Map(await Promise.all(Object.entries(textureOverrides).map(async ([name, texturePath]) => {
						const texture = await new THREE.TextureLoader().loadAsync(`${modelDir}/${texturePath}`)
						return [name, texture] as const
					})))
					fbx.traverse((child) => {
						if (!(child instanceof THREE.Mesh)) return
						for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
							const texture = textures.get(material.name)
							if (texture && "map" in material) material.map = texture
						}
					})
				}

				// Fix materials
				fbx.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh
						if (mesh.material) {
							const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

							materials.forEach((material, index) => {
								// Type guard to check if material has map property
								let name = "unknown"
								let originalMap = null
								let color = new THREE.Color(0xcccccc)
								let opacity = 1.0

								if (
									material instanceof THREE.MeshStandardMaterial ||
									material instanceof THREE.MeshPhongMaterial ||
									material instanceof THREE.MeshLambertMaterial ||
									material instanceof THREE.MeshBasicMaterial ||
									material instanceof THREE.MeshToonMaterial
								) {
									name = material.name || "unnamed"
									originalMap = material.map
									color = material.color || new THREE.Color(0xcccccc)
									opacity = material.opacity
								}

								if (opacity === 0) {
									// Use appropriate material with transparency for invisible materials
									const transparentMaterial = new THREE.MeshBasicMaterial({
										name: name,
										transparent: true,
										opacity: 0,
										visible: false,
									})

									if (Array.isArray(mesh.material)) {
										mesh.material[index] = transparentMaterial
									} else {
										mesh.material = transparentMaterial
									}
								} else {
									const newMaterial = new THREE.MeshBasicMaterial({
										name: name,
										map: originalMap,
										...(originalMap ? {} : { color: color }),
										...(opacity < 1 ? { transparent: true, opacity: opacity } : {}),
									})

									if (Array.isArray(mesh.material)) {
										mesh.material[index] = newMaterial
									} else {
										mesh.material = newMaterial
									}
								}
							})

							// Update material if it's an array
							if (Array.isArray(mesh.material)) {
								mesh.material = [...mesh.material]
							}
						}
						mesh.castShadow = true
						mesh.receiveShadow = true
						mesh.frustumCulled = false
					}
				})

				if (
					modelFile.type === "body" ||
					modelFile.type === "arms" ||
					modelFile.type === "arm" ||
					modelFile.type === "hair" ||
					modelFile.type === "mask"
				) {
					fbx.position.set(0, 0, 0)

					// Apply boss model offsets if available
					if (modelType === "bosses" && bossName) {
						const config = await loadBossOffsetConfig(bossName)
						const modelOffset = config?.model

						// Apply scale (default 1 for boss models, or from config)
						const scaleValue = modelOffset?.scale || { x: 1, y: 1, z: 1 }
						fbx.scale.set(scaleValue.x ?? 1, scaleValue.y ?? 1, scaleValue.z ?? 1)

						// Apply position offset if provided
						if (modelOffset?.position) {
							fbx.position.set(
								modelOffset.position.x ?? 0,
								modelOffset.position.y ?? 0,
								modelOffset.position.z ?? 0,
							)
						}

						// Apply rotation offset if provided (in radians)
						if (modelOffset?.rotation) {
							fbx.rotation.set(
								modelOffset.rotation.x ?? 0,
								modelOffset.rotation.y ?? 0,
								modelOffset.rotation.z ?? 0,
							)
						}
					} else if (modelType === "bosses") {
						// Default scale for bosses if no config
						fbx.scale.set(1, 1, 1)
					}
				} else if (weaponTypes.includes(modelFile.type)) {
					// Apply boss transformations to weapons
					if (modelType === "bosses" && bossName) {
						// Check if weapon has defaultPosition set (from getBossModels)
						if (modelFile.defaultPosition) {
							// Apply the same scale as the body model from offset.json
							const config = await loadBossOffsetConfig(bossName)
							const modelOffset = config?.model
							const scaleValue = modelOffset?.scale || { x: 1, y: 1, z: 1 }

							// Apply body's scale to weapon so they match
							fbx.scale.set(scaleValue.x ?? 1, scaleValue.y ?? 1, scaleValue.z ?? 1)

							// Apply weapon rotation correction from offset.json if provided
							const weaponOffset = config?.weapon
							if (weaponOffset?.rotation) {
								fbx.rotation.set(
									weaponOffset.rotation.x ?? fbx.rotation.x,
									weaponOffset.rotation.y ?? fbx.rotation.y,
									weaponOffset.rotation.z ?? fbx.rotation.z,
								)
							}

							// Keep FBX's original position
							fbx.updateMatrixWorld(true)
						} else {
							// Weapon needs hand attachment - start invisible until attached
							fbx.visible = false

							// Load config for weapons that need hand attachment
							const config = await loadBossOffsetConfig(bossName)
							const modelOffset = config?.model
							const scaleValue = modelOffset?.scale || { x: 1, y: 1, z: 1 }
							fbx.scale.set(scaleValue.x ?? 1, scaleValue.y ?? 1, scaleValue.z ?? 1)
							// Keep at origin for hand attachment
							fbx.position.set(0, 0, 0)
						}
					} else if (modelType === "bosses") {
						// Boss weapon without config - needs hand attachment, start invisible
						if (!modelFile.defaultPosition) {
							fbx.visible = false
						}

						fbx.scale.set(1, 1, 1)
						fbx.position.set(0, 0, 0)

						// Force matrix update
						fbx.updateMatrix()
						fbx.updateMatrixWorld(true)
					} else {
						// Hero weapons will be attached to hand points later - start invisible
						if (!modelFile.defaultPosition) {
							fbx.visible = false
						}

						// Keep independently animated weapons in their exported scene position.
						if (!hasSceneAttachment(modelFile, modelType)) fbx.position.set(0, 0, 0)
					}
				} else {
					// Default positioning for unknown types
					fbx.position.set(0, 0, 0)
				}

				// Frame standalone items consistently in the shared viewer's camera.
				if (modelType === "artifacts") {
					fbx.updateMatrixWorld(true)
					const bounds = new THREE.Box3().setFromObject(fbx)
					const size = bounds.getSize(new THREE.Vector3())
					const extent = Math.max(size.x, size.y, size.z)
					if (Number.isFinite(extent) && extent > 0) {
						fbx.scale.multiplyScalar(1.5 / extent)
						fbx.updateMatrixWorld(true)
						const center = new THREE.Box3().setFromObject(fbx).getCenter(new THREE.Vector3())
						fbx.position.sub(center).add(new THREE.Vector3(0, 1, 0))
					}
				}

				// Store shared animations from the first model that has them
				if (loadGeneration !== loadGenerationRef.current) return
				if (modelWithAnimations.animations.length > 0 && sharedAnimationsRef.current.length === 0) {
					sharedAnimationsRef.current = modelWithAnimations.animations
				}

				// Always create a mixer for every model
				const mixer = new THREE.AnimationMixer(modelWithAnimations)
				modelWithAnimations.mixer = mixer
				mixersRef.current.set(modelFile.name, mixer)

				setLoadedModels((prev) => new Map(prev).set(modelFile.name, modelWithAnimations))
			} catch (error) {
				console.error(`Failed to load model ${modelFile.name}:`, error)
			}
		}

		// Load models sequentially: body first to ensure animations are available
		const loadModelsSequentially = async () => {
			// Prevent multiple simultaneous loads
			if (isLoadingRef.current) return

			// Reset progress tracking at the start
			currentProgressRef.current = 0
			isLoadingRef.current = true

			if (setIsLoading) setIsLoading(true)
			if (setLoadingProgress) setLoadingProgress(0)

			// Sort models to load body first (most important for animations), then others
			const sortedModels = [...modelFiles].sort((a, b) => {
				if (a.type === "body") return -1
				if (b.type === "body") return 1
				// Also prioritize arms/hair after body as they may contain animations
				if (a.type === "arms" || a.type === "arm") return -1
				if (b.type === "arms" || b.type === "arm") return 1
				return 0
			})

			// Load visible models AND all weapon models (even if hidden, we need them to check for animations)
			const modelsToLoad = sortedModels.filter((m) => visibleModels.has(m.name) || weaponTypes.includes(m.type) ||
				(modelType === "heroes" && m.type === "hair"))
			const totalModels = modelsToLoad.length

			for (let i = 0; i < modelsToLoad.length; i++) {
				await loadModel(modelsToLoad[i], i, totalModels)
				if (loadGeneration !== loadGenerationRef.current) return
			}

			// Ensure we reach 100% at the end
			currentProgressRef.current = 100
			if (setLoadingProgress) setLoadingProgress(100)

			if (setIsLoading) setIsLoading(false)
			isLoadingRef.current = false
		}

		loadModelsSequentially()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [modelFiles, visibleModels, setIsLoading, setLoadingProgress])

	// Ensure weapons are hidden on initial load (only run once after initial load)
	useEffect(() => {
		if (loadedModels.size === 0 || !setVisibleModels) return

		// Hide weapons initially for both heroes and bosses (user toggles them on manually)
		const weaponsToHide = new Set<string>()
		modelFiles.forEach((modelFile) => {
			if (
				weaponTypes.includes(modelFile.type) &&
				!modelFile.defaultPosition &&
				loadedModels.has(modelFile.name)
			) {
				weaponsToHide.add(modelFile.name)
				const weaponModel = loadedModels.get(modelFile.name)
				if (weaponModel) {
					weaponModel.visible = false
				}
			}
		})

		if (weaponsToHide.size > 0) {
			setVisibleModels((prev) => {
				const newSet = new Set(prev)
				weaponsToHide.forEach((name) => newSet.delete(name))
				return newSet
			})
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loadedModels.size]) // Only run when models finish loading

	// Parent weapons with defaultPosition to body model so they inherit transforms
	useEffect(() => {
		if (modelType !== "bosses") return

		const bodyEntry = Array.from(loadedModels.entries()).find(([name]) => {
			const modelFile = modelFiles.find((m) => m.name === name)
			return modelFile?.type === "body"
		})

		if (bodyEntry) {
			const [, bodyModel] = bodyEntry

			loadedModels.forEach((weaponModel, weaponName) => {
				const modelFile = modelFiles.find((m) => m.name === weaponName)
				if (!modelFile || !weaponTypes.includes(modelFile.type) || !modelFile.defaultPosition) return

				if (weaponModel.parent !== bodyModel) {
					// Convert weapon's world position to be relative to body
					const weaponWorldPos = weaponModel.position.clone()
					const weaponWorldRot = weaponModel.rotation.clone()
					const weaponWorldScale = weaponModel.scale.clone()

					bodyModel.add(weaponModel)

					// Restore world transforms as local transforms relative to body
					weaponModel.position.copy(weaponWorldPos)
					weaponModel.rotation.copy(weaponWorldRot)
					weaponModel.scale.copy(weaponWorldScale)
					weaponModel.updateMatrix()
				}
			})
		}
	}, [loadedModels, modelFiles, modelType])

	// Sync weapon visibility when visibleModels changes (from ControlsPanel toggles)
	useEffect(() => {
		loadedModels.forEach((model, modelName) => {
			const modelFile = modelFiles.find((m) => m.name === modelName)
			const isWeapon = modelFile && weaponTypes.includes(modelFile.type)

			if (isWeapon && !modelFile.defaultPosition) {
				const shouldBeVisible = visibleModels.has(modelName)

				// Don't make weapon visible if it hasn't been attached yet
				if (shouldBeVisible && !hasSceneAttachment(modelFile, modelType) && !attachedWeaponsRef.current.has(modelName)) {
					return
				}

				if (model.visible !== shouldBeVisible) {
					model.visible = shouldBeVisible
				}
			}
		})
	}, [visibleModels, loadedModels, modelFiles, modelType])

	// Handle animation switching - preserve weapon visibility state (user controls it manually)
	useEffect(() => {
		function playAnimation(animationName: string | null, continuous = false) {
			const alreadyPlaying = playingAnimationRef.current === animationName && !continuous
			sequencePlaybackRef.current = null
			// Check if current animation has a next in sequence
			const nextAnimation = animationName ? findNextInSequence(animationName, availableAnimations) : null
			// Check if current animation is part of a sequence (has a -N suffix)
			const sequenceStart = animationName ? findSequenceStart(animationName, availableAnimations) : null
			const isPartOfSequence = nextAnimation !== null || sequenceStart !== null

			loadedModels.forEach((model, modelName) => {
				const mixer = mixersRef.current.get(modelName)
				if (!mixer) return

				const currentAction = activeActionsRef.current.get(modelName)
				if (continuous) {
					mixer.stopAllAction()
					activeActionsRef.current.delete(modelName)
				} else if (currentAction && !alreadyPlaying) {
					currentAction.fadeOut(0.3)
				}

				// Play selected animation
				if (animationName) {
					const modelFile = modelFiles.find((m) => m.name === modelName)
					const isWeapon = modelFile && weaponTypes.includes(modelFile.type)

					// For weapons, try to find matching weapon animation
					let animationToPlay = animationName

					// Some independent weapon rigs use body clip names instead of _Weapon names.
					const usesBodyClipNames =
						modelFile && modelType === "heroes" && getHeroWeaponConfig(modelFile)?.animationNaming === "body"
					if (isWeapon && !modelFile.defaultPosition && !usesBodyClipNames) {
						// Convert body animation to weapon animation
						// Handle two cases:
						// 1. Regular: "Hero_Aisha@Astand_Astand" -> "Hero_Aisha_Weapon@Astand_Astand"
						// 2. Facial: "Hero_Isaiah_Facial@Aimsword_Aimsword" -> "Hero_Isaiah_Weapon_Facial@Aimsword_Aimsword"
						let weaponAnimName: string
						const naming = modelType === "heroes" ? getHeroWeaponConfig(modelFile)?.animationNaming : undefined
						if (
							naming === "weaponPen" || naming === "weaponRight"
						) {
							weaponAnimName = animationName.replace(/(?:_Facial)?@/, naming === "weaponPen" ? "_WeaponPen@" : "_WeaponR@")
						} else if (
							animationName.includes("_Facial@") &&
							!(modelType === "heroes" && getHeroWeaponConfig(modelFile)?.animationNaming === "facialWeapon")
						) {
							weaponAnimName = animationName.replace(/_Facial@/, "_Weapon_Facial@")
						} else {
							weaponAnimName = animationName.replace(/@/, "_Weapon@")
						}

						// Check if weapon animation exists in model's animations or shared animations
						const animations =
							model.animations && model.animations.length > 0
								? model.animations
								: sharedAnimationsRef.current

						const weaponClip = animations.find((c) => c.name === weaponAnimName)
						if (weaponClip) {
							animationToPlay = weaponAnimName
						} else {
							// No weapon animation found, skip playing animation for this weapon
							// but DON'T change visibility - preserve user's toggle state
							return
						}
					}

					// Try to find animation in model's animations first, then in shared animations
					const animations =
						model.animations && model.animations.length > 0 ? model.animations : sharedAnimationsRef.current

					const clip = animations.find((c) => c.name === animationToPlay)
					if (clip) {
						const action = mixer.clipAction(clip)
						// React echoes automatic selection changes back through this effect.
						// Keep already-started actions at their current time on that render.
						if (!alreadyPlaying || currentAction !== action) {
							action.reset()
							if (continuous) action.setEffectiveWeight(1)
							else action.fadeIn(0.3)
							action.play()
							model.facial?.play(action)
						}

						// If part of a sequence, play once without looping
						if (isPartOfSequence) {
							action.setLoop(THREE.LoopOnce, 1)
							action.clampWhenFinished = true
						} else {
							action.setLoop(THREE.LoopRepeat, Infinity)
							action.clampWhenFinished = false
						}
						activeActionsRef.current.set(modelName, action)

						// Report animation duration (only from body/non-weapon models)
						if (onAnimationDurationChange && !isWeapon) {
							onAnimationDurationChange(clip.duration)
						}

						// Only the body controls sequence timing; hair/weapon clips can differ.
						const followingAnimation = nextAnimation || sequenceStart
						if (modelFile?.type === "body" && followingAnimation && clip.duration > 0 && onAnimationChange) {
							sequencePlaybackRef.current = {
								action,
								advance: () => {
									playAnimation(followingAnimation, true)
									onAnimationChange(followingAnimation)
								},
							}
						}
					}
				}
			})

			playingAnimationRef.current = animationName
		}

		// Loading state already triggers this effect as each model becomes available.
		playAnimation(selectedAnimation)
		return () => {
			sequencePlaybackRef.current = null
		}
	}, [selectedAnimation, loadedModels, onAnimationDurationChange, modelFiles, availableAnimations, onAnimationChange, modelType])

	useFrame((state, delta) => {
		// UPDATE ANIMATION MIXERS FIRST before weapon attachment
		// This ensures hand bones are in animated pose, not bind pose
		if (!isPaused) {
			advanceAnimationFrame(mixersRef.current.values(), delta, () => sequencePlaybackRef.current)
			loadedModels.forEach((model) => model.facial?.update())
		}

		// Reattach weapons to hand points for the first 10 frames to ensure skeleton stability
		const FRAMES_TO_REATTACH = 10

		const bodyEntry = Array.from(loadedModels.entries()).find(([name]) => {
			const modelFile = modelFiles.find((m) => m.name === name)
			return modelFile?.type === "body"
		})

		if (bodyEntry && frameCountRef.current < FRAMES_TO_REATTACH) {
			const [, bodyModel] = bodyEntry

			// Check if an animation is actually playing on the body
			const bodyMixer = mixersRef.current.get(bodyEntry[0])
			const hasActiveAnimation = bodyMixer && activeActionsRef.current.size > 0

			// Only attach weapons if animation is playing (hand bone in correct pose)
			if (!hasActiveAnimation) {
				// Animation not started yet, skip this frame
				return
			}

			// Some heroes use a dedicated weapon socket instead of hand points.
			const hasConfiguredSocket = modelType === "heroes" && modelFiles.some((file) => {
				const socket = getHeroWeaponConfig(file)?.socket
				return socket && bodyModel.getObjectByName(socket)
			})
			if (bodyModel.handPointR || bodyModel.handPointL || hasConfiguredSocket) {
				const weaponsNeedingAttachment = modelFiles.filter(
					(mf) => weaponTypes.includes(mf.type) && !mf.defaultPosition && !hasSceneAttachment(mf, modelType),
				)
				const allWeaponsLoaded = weaponsNeedingAttachment.every((mf) => loadedModels.has(mf.name))

				if (allWeaponsLoaded && weaponsNeedingAttachment.length > 0) {
					frameCountRef.current++

					// Reattach weapons every frame for first FRAMES_TO_REATTACH frames
					loadedModels.forEach((weaponModel, weaponName) => {
						const modelFile = modelFiles.find((m) => m.name === weaponName)
						if (
							!modelFile ||
							!weaponTypes.includes(modelFile.type) ||
							modelFile.defaultPosition ||
							hasSceneAttachment(modelFile, modelType)
						) return

						const heroWeaponConfig = modelType === "heroes" ? getHeroWeaponConfig(modelFile) : undefined
						const isLeftHand = heroWeaponConfig?.hand
							? heroWeaponConfig.hand === "left"
							: modelFile.type === "shield" ||
								modelFile.type === "weapon_l" ||
								modelFile.type === "weaponl" ||
								modelFile.type === "weapon02"

						let handPoint = heroWeaponConfig?.socket
							? bodyModel.getObjectByName(heroWeaponConfig.socket)
							: isLeftHand ? bodyModel.handPointL : bodyModel.handPointR
						if (!handPoint && !heroWeaponConfig?.socket) {
							handPoint = isLeftHand ? bodyModel.handPointR : bodyModel.handPointL
						}

						if (handPoint) {
							// Remove from current parent if attached
							if (weaponModel.parent) {
								weaponModel.parent.remove(weaponModel)
							}

							// Use the hero or boss weapon correction, otherwise default to 90 degrees.
							const weaponRotation =
								(modelType === "heroes" ? heroWeaponConfig?.rotation : bossConfig?.weapon?.rotation) ||
								{ x: Math.PI / 2, y: 0, z: 0 }

							weaponModel.position.set(0, 0, 0)
							weaponModel.scale.set(1, 1, 1)
							weaponModel.rotation.set(
								weaponRotation.x ?? Math.PI / 2,
								weaponRotation.y ?? 0,
								weaponRotation.z ?? 0,
							)
							weaponModel.updateMatrix()

							handPoint.add(weaponModel)
							attachedWeaponsRef.current.add(weaponName)
							// Respect visibleModels state - don't force visible to true
							weaponModel.visible = visibleModels.has(weaponName)
						}
					})
				}
			}
		}
		// Resolve sword/sheath handoffs after animation sampling and attachment,
		// including paused frames where the user changes a Parts toggle.
		weaponVisibilitySyncRef.current?.(visibleModels, attachedWeaponsRef.current)
	})

	useEffect(() => {
		const mixers = mixersRef.current
		return () => {
			mixers.forEach((mixer) => mixer.stopAllAction())
			mixers.clear()
		}
	}, [])

	return (
		<group ref={groupRef}>
			{Array.from(loadedModels.entries()).map(([name, model]) => {
				const modelFile = modelFiles.find((m) => m.name === name)
				const isWeapon = modelFile && weaponTypes.includes(modelFile.type)

				// For weapons without defaultPosition, always render them (so they stay attached to hand points)
				// but visibility is controlled by model.visible property
				// For weapons with defaultPosition and non-weapons, only render if in visibleModels
				if (isWeapon && !modelFile.defaultPosition) {
					return <primitive key={name} object={model} />
				}

				const isVisible = visibleModels.has(name)
				return isVisible ? <primitive key={name} object={model} /> : null
			})}
		</group>
	)
}
