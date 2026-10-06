"use client"

import { useEffect, useState } from "react"
import { FBXLoader } from "three-stdlib"
import * as THREE from "three"
import { loadBossOffsetConfig } from "@/components/models/bossOffsetConfig"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

export function Scene({ sceneName }: { sceneName: string | null }) {
	const [sceneModel, setSceneModel] = useState<THREE.Group | null>(null)

	useEffect(() => {
		let active = true
		// Handle the case where there's no scene or it's grid
		if (!sceneName || sceneName === "grid") {
			// Use a microtask to avoid synchronous state update
			Promise.resolve().then(() => {
				if (active) setSceneModel(null)
			})
			return () => { active = false }
		}

		const loadScene = async () => {
			// Clear previous scene
			setSceneModel(null)

			const fbxLoader = new FBXLoader()

			// Determine if this is a boss battlefield scene or a regular scene
			let scenePath: string
			let bossName: string | null = null

			if (sceneName.startsWith("bosses/")) {
				// Boss battlefield - use the full path as provided
				const parts = sceneName.split("/")
				bossName = parts[1] // Get boss name (e.g., "Xanadus")
				scenePath = `${basePath}/kingsraid-models/models/${sceneName}/${
					sceneName.split("/").pop() || sceneName
				}.fbx`
			} else {
				// Regular scene from scenes folder
				scenePath = `${basePath}/kingsraid-models/scenes/${sceneName}/${
					sceneName.charAt(0).toUpperCase() + sceneName.slice(1)
				}.fbx`
			}

			try {
				const fbx = await new Promise<THREE.Group>((resolve, reject) => {
					fbxLoader.load(scenePath, resolve, undefined, reject)
				})
				if (!active) return

				// Load boss offset configuration if this is a boss scene
				if (bossName && sceneName.startsWith("bosses/")) {
					const config = await loadBossOffsetConfig(bossName)
					if (!active) return
					const sceneOffset = {
						...config?.scene,
						...config?.scenes?.[sceneName.split("/").pop() || sceneName],
					}

					// Apply scale (default 0.1 for boss scenes, or from config)
					const scaleValue = sceneOffset?.scale || { x: 0.1, y: 0.1, z: 0.1 }
					fbx.scale.set(scaleValue.x ?? 0.1, scaleValue.y ?? 0.1, scaleValue.z ?? 0.1)

					// Apply position offset if provided
					if (sceneOffset?.position) {
						fbx.position.set(
							sceneOffset.position.x ?? 0,
							sceneOffset.position.y ?? 0,
							sceneOffset.position.z ?? 0,
						)
					}

					// Apply rotation offset if provided (in radians)
					if (sceneOffset?.rotation) {
						fbx.rotation.set(
							sceneOffset.rotation.x ?? 0,
							sceneOffset.rotation.y ?? 0,
							sceneOffset.rotation.z ?? 0,
						)
					}
				}

				// Fix materials and textures
				fbx.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh
						if (mesh.material) {
							const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

							materials.forEach((material, index) => {
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

								const newMaterial = new THREE.MeshStandardMaterial({
									name: name,
									map: originalMap,
									...(originalMap ? {} : { color: color }),
									...(opacity < 1 ? { transparent: true, opacity: opacity } : {}),
									roughness: 1,
									metalness: 0.0,
								})

								if (Array.isArray(mesh.material)) {
									mesh.material[index] = newMaterial
								} else {
									mesh.material = newMaterial
								}
							})

							if (Array.isArray(mesh.material)) {
								mesh.material = [...mesh.material]
							}
						}
						mesh.castShadow = false
						mesh.receiveShadow = true
						mesh.frustumCulled = false
					}
				})

				setSceneModel(fbx)
			} catch (error) {
				if (!active) return
				console.error(`Failed to load scene ${sceneName}:`, error)
				setSceneModel(null)
			}
		}

		loadScene()
		return () => { active = false }
	}, [sceneName])

	if (!sceneModel) return null

	return <primitive object={sceneModel} />
}
