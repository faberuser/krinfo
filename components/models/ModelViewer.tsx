"use client"

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"
import { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Model } from "@/components/models/Model"
import { Scene } from "@/components/models/Scene"
import { ScreenshotHandler } from "@/components/models/ScreenshotHandler"
import { RecordingHandler } from "@/components/models/RecordingHandler"
import { ScreenshotDialog } from "@/components/models/ScreenshotDialog"
import { RecordingDialog } from "@/components/models/RecordingDialog"
import { ControlsPanel } from "@/components/models/ControlsPanel"
import { ActionControls } from "@/components/models/ActionControls"
import {
	ModelViewerProps,
	INITIAL_CAMERA_POSITION,
	INITIAL_CAMERA_TARGET,
	weaponTypes,
	VoiceLanguage,
} from "@/components/models/types"
import { findVoiceForAnimation } from "@/components/models/utils"

const HERO_NAME_REGEX = /^Hero_([A-Za-z]+)/

export function ModelViewer({
	modelFiles,
	availableAnimations,
	selectedAnimation,
	setSelectedAnimation,
	isLoading,
	setIsLoading,
	availableScenes = [],
	visibleModels: externalVisibleModels,
	setVisibleModels: externalSetVisibleModels,
	modelType = "heroes",
	bossName,
	voiceFiles,
}: ModelViewerProps) {
	const [internalVisibleModels, setInternalVisibleModels] = useState<Set<string>>(new Set())

	// Use external state if provided, otherwise use internal state
	const visibleModels = externalVisibleModels ?? internalVisibleModels
	const setVisibleModels = externalSetVisibleModels ?? setInternalVisibleModels
	const [isPaused, setIsPaused] = useState(false)
	const [loadingProgress, setLoadingProgress] = useState(0)
	const [isCollapsed, setIsCollapsed] = useState(false)
	const [selectedScene, setSelectedScene] = useState<string>("grid")
	const [screenshotDialog, setScreenshotDialog] = useState(false)
	const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
	const [captureCallback, setCaptureCallback] = useState<((dataUrl: string) => void) | null>(null)
	const [isRecording, setIsRecording] = useState(false)
	const [recordingDialog, setRecordingDialog] = useState(false)
	const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
	const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
	const [animationDuration, setAnimationDuration] = useState<number>(0)
	const [isExportingAnimation, setIsExportingAnimation] = useState(false)
	const [downloadFormat, setDownloadFormat] = useState<"webm" | "mp4" | "gif">("webm")
	const [isConverting, setIsConverting] = useState(false)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [isDownloading, setIsDownloading] = useState(false)
	const controlsRef = useRef<OrbitControlsImpl>(null)
	const cameraRef = useRef<THREE.PerspectiveCamera>(null)
	const viewerContainerRef = useRef<HTMLDivElement>(null)

	// Audio state
	const [isMuted, setIsMuted] = useState(true) // Muted by default
	const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>("en") // English by default
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const lastPlayedAnimationRef = useRef<string | null>(null)

	// Extract hero name from model files path
	// Path format: "Mitra/Hero_Mitra_Vari05_Body/Hero_Mitra_Vari05_Body.FBX"
	// We need to extract just "Mitra" from this
	const heroName = useMemo(() => {
		if (modelFiles.length === 0) return ""
		const folderName = modelFiles[0].path.split("/").at(-2) || "" // e.g., "Hero_Mitra_Vari05_Body"
		const match = folderName.match(HERO_NAME_REGEX)
		return match ? match[1] : ""
	}, [modelFiles])

	// Stop and cleanup audio
	const stopAudio = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause()
			audioRef.current.src = ""
			audioRef.current = null
		}
	}, [])

	// Play voice for animation
	const playVoiceForAnimation = useCallback(
		(animation: string | null) => {
			// Don't play if muted, no animation, or no voice files
			if (isMuted || !animation || !voiceFiles || modelType !== "heroes") {
				return
			}

			// Don't replay the same animation's voice (unless it's a new play request)
			if (lastPlayedAnimationRef.current === animation) {
				return
			}
			lastPlayedAnimationRef.current = animation

			const currentVoiceFiles = voiceFiles[voiceLanguage]
			if (!currentVoiceFiles || currentVoiceFiles.length === 0) {
				return
			}

			const voicePath = findVoiceForAnimation(animation, currentVoiceFiles, heroName)
			if (voicePath) {
				// Stop previous audio properly
				stopAudio()

				// Create and play new audio
				const audio = new Audio(voicePath)
				audioRef.current = audio

				// Use a small delay to ensure previous audio is fully stopped
				// This prevents the AbortError when rapidly switching animations
				const playPromise = audio.play()
				if (playPromise !== undefined) {
					playPromise.catch(() => {
						// Silently ignore AbortError - this happens when audio is interrupted
						// which is expected behavior when switching animations quickly
					})
				}
			}
		},
		[isMuted, voiceFiles, voiceLanguage, heroName, modelType, stopAudio],
	)

	// Play voice when animation, mute state, or language changes
	useEffect(() => {
		lastPlayedAnimationRef.current = null
		if (!isMuted && selectedAnimation) {
			playVoiceForAnimation(selectedAnimation)
		}
	}, [selectedAnimation, isMuted, voiceLanguage, playVoiceForAnimation])

	// Cleanup audio on unmount
	useEffect(() => {
		return () => {
			stopAudio()
		}
	}, [stopAudio])

	useEffect(() => {
		// Show non-weapons and weapons with defaultPosition === true by default
		// For bosses, also show all weapons by default
		if (modelFiles.length > 0) {
			setIsLoading(true)
			setLoadingProgress(0)
			const modelNames = modelFiles
				.filter(
					(m) =>
						!weaponTypes.includes(m.type) || // Non-weapons
						(weaponTypes.includes(m.type) && m.defaultPosition === true) || // Default position weapons
						(modelType === "bosses" && weaponTypes.includes(m.type)), // All boss weapons
				)
				.map((m) => m.name)

			setVisibleModels(new Set(modelNames))
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [modelFiles, modelType]) // Removed setIsLoading and setVisibleModels - they're stable functions

	const resetCamera = () => {
		if (cameraRef.current) {
			cameraRef.current.position.set(...INITIAL_CAMERA_POSITION)
			cameraRef.current.updateProjectionMatrix()
		}
		if (controlsRef.current) {
			controlsRef.current.target.set(...INITIAL_CAMERA_TARGET)
			controlsRef.current.update()
		}
	}

	const toggleModelVisibility = (modelName: string) => {
		setVisibleModels((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(modelName)) {
				newSet.delete(modelName)
			} else {
				newSet.add(modelName)
			}
			return newSet
		})
	}

	const captureScreenshot = () => {
		// Set the capture callback which will trigger the ScreenshotHandler
		setCaptureCallback(() => (dataUrl: string) => {
			setScreenshotUrl(dataUrl)
			setScreenshotDialog(true)
			setCaptureCallback(null) // Reset after capture
		})
	}

	const downloadScreenshot = () => {
		if (!screenshotUrl) return

		const link = document.createElement("a")
		link.download = `model-screenshot-${Date.now()}.png`
		link.href = screenshotUrl
		link.click()
		setScreenshotDialog(false)
	}

	const copyToClipboard = async () => {
		if (!screenshotUrl) return

		try {
			// Convert data URL to blob
			const response = await fetch(screenshotUrl)
			const blob = await response.blob()

			// Copy to clipboard
			await navigator.clipboard.write([
				new ClipboardItem({
					"image/png": blob,
				}),
			])

			setScreenshotDialog(false)
		} catch (error) {
			console.error("Failed to copy to clipboard:", error)
		}
	}

	const toggleRecording = () => {
		setIsRecording((prev) => !prev)
	}

	const handleRecordingComplete = (blob: Blob) => {
		setRecordingBlob(blob)
		const url = URL.createObjectURL(blob)
		setRecordingUrl(url)
		setRecordingDialog(true)
	}

	const downloadRecording = async () => {
		if (!recordingBlob) return

		setIsConverting(true)

		try {
			let downloadBlob = recordingBlob
			let extension = "webm"

			if (downloadFormat === "mp4") {
				// For MP4, we'll use the WebM directly but with mp4 extension
				// Modern browsers can handle WebM in MP4 container
				extension = "mp4"
			} else if (downloadFormat === "gif") {
				// Convert to GIF using canvas and gif.js approach
				const { convertToGif } = await import("@/components/models/gifConverter")
				downloadBlob = await convertToGif(recordingUrl!)
				extension = "gif"
			}

			const link = document.createElement("a")
			link.download = `model-animation-${Date.now()}.${extension}`
			link.href = URL.createObjectURL(downloadBlob)
			link.click()
			URL.revokeObjectURL(link.href)

			setRecordingDialog(false)
		} catch (error) {
			console.error("Failed to convert/download recording:", error)
			alert("Failed to convert video. Please try a different format.")
		} finally {
			setIsConverting(false)
		}
	}

	const closeRecordingDialog = () => {
		setRecordingDialog(false)
		if (recordingUrl) {
			URL.revokeObjectURL(recordingUrl)
			setRecordingUrl(null)
		}
		setRecordingBlob(null)
	}

	const exportAnimation = () => {
		if (!selectedAnimation || animationDuration === 0) {
			return
		}

		// Start recording
		setIsExportingAnimation(true)
		setIsRecording(true)

		// Stop recording after animation duration (plus a small buffer)
		setTimeout(
			() => {
				setIsRecording(false)
				setIsExportingAnimation(false)
			},
			(animationDuration + 0.1) * 1000,
		) // Add 100ms buffer
	}

	const toggleFullscreen = () => {
		setIsFullscreen((prev) => !prev)
	}

	const downloadModels = async () => {
		if (isDownloading) return

		setIsDownloading(true)
		const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
		const modelDir = `${basePath}/kingsraid-models/models/${modelType}`

		try {
			const { default: JSZip } = await import("jszip")
			const zip = new JSZip()
			const modelsFolder = zip.folder("models")

			// Create a README with scale information
			const scaleInfo = `King's Raid Model Pack
Downloaded: ${new Date().toLocaleString()}

BLENDER IMPORT INSTRUCTIONS:

The FBX files are VERY SMALL by default when exported from the game.

METHOD 1: Scale During Import
1. File > Import > FBX (.fbx) OR 
   Drag and Drop the FBX file into Blender
2. In the "Transform" section (right panel), set "Scale" to 1000
3. Click "Import FBX"

METHOD 2: Scale After Import
1. Import the FBX normally
2. Select all imported objects (press A)
3. Press S (scale), type 1000, then Enter

Downloaded Models:
`

			// Download ALL model files
			const allModelFiles = modelFiles

			// Add README
			modelsFolder?.file("README.txt", scaleInfo + allModelFiles.map((m) => `- ${m.name}`).join("\n"))

			for (const modelFile of allModelFiles) {
				try {
					// Get the folder path and base name
					const folderPath = modelFile.path.substring(0, modelFile.path.lastIndexOf("/"))
					const folderName = folderPath.split("/").pop() || modelFile.name

					const modelZipFolder = modelsFolder?.folder(folderName)

					// Get list of all files in the model directory
					const fileListResponse = await fetch(
						`/api/list-model-files?path=${encodeURIComponent(modelFile.path)}&type=${modelType}`,
					)

					if (fileListResponse.ok) {
						const { files } = await fileListResponse.json()

						// Download all files (FBX + textures)
						for (const fileName of files) {
							try {
								const fileResponse = await fetch(`${modelDir}/${folderPath}/${fileName}`)
								if (fileResponse.ok) {
									const blob = await fileResponse.blob()
									modelZipFolder?.file(fileName, blob)
								}
							} catch {
								console.error(`Failed to fetch ${fileName}`)
							}
						}
					} else {
						// Fallback: just download the FBX file
						const fbxFileName = modelFile.path.split("/").pop() || ""
						const fbxResponse = await fetch(`${modelDir}/${modelFile.path}`)
						if (fbxResponse.ok) {
							const blob = await fbxResponse.blob()
							modelZipFolder?.file(fbxFileName, blob)
						}
					}
				} catch (error) {
					console.error(`Failed to fetch ${modelFile.path}:`, error)
				}
			}

			// Generate and download the zip
			const content = await zip.generateAsync({ type: "blob" })
			const link = document.createElement("a")
			link.href = URL.createObjectURL(content)
			link.download = `kingsraid-models-${Date.now()}.zip`
			link.click()
			URL.revokeObjectURL(link.href)
		} catch (error) {
			console.error("Failed to download models:", error)
			alert("Failed to download models. Please try again.")
		} finally {
			setIsDownloading(false)
		}
	}

	// Listen for ESC key to exit fullscreen
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && isFullscreen) {
				setIsFullscreen(false)
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => {
			window.removeEventListener("keydown", handleKeyDown)
		}
	}, [isFullscreen])

	// Hide body scrollbar when in fullscreen
	useEffect(() => {
		if (isFullscreen) {
			document.body.style.overflow = "hidden"
		} else {
			document.body.style.overflow = ""
		}

		// Cleanup on unmount
		return () => {
			document.body.style.overflow = ""
		}
	}, [isFullscreen])

	const renderViewerContent = () => (
		<>
			{/* Sliding Controls Panel - slides in from left */}
			<ControlsPanel
				isCollapsed={isCollapsed}
				isLoading={isLoading}
				selectedScene={selectedScene}
				setSelectedScene={setSelectedScene}
				availableScenes={availableScenes}
				modelFiles={modelFiles}
				visibleModels={visibleModels}
				toggleModelVisibility={toggleModelVisibility}
				availableAnimations={availableAnimations}
				selectedAnimation={selectedAnimation}
				setSelectedAnimation={setSelectedAnimation}
				isPaused={isPaused}
				setIsPaused={setIsPaused}
			/>

			{/* Collapse Toggle Button - moves with the panel */}
			<CollapsibleTrigger asChild>
				<Button
					variant="secondary"
					size="sm"
					className="absolute top-1/2 -translate-y-1/2 z-20 h-16 w-6 p-0 shadow-lg rounded-l-none rounded-r-lg transition-all duration-300 ease-in-out"
					style={{
						left: isCollapsed ? "0px" : "208px",
					}}
					title={isCollapsed ? "Show controls" : "Hide controls"}
					disabled={isLoading}
				>
					{isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
				</Button>
			</CollapsibleTrigger>

			<Canvas shadows gl={{ toneMapping: THREE.NoToneMapping }} resize={{ polyfill: ResizeObserver }}>
				<PerspectiveCamera ref={cameraRef} makeDefault position={INITIAL_CAMERA_POSITION} />
				<OrbitControls
					ref={controlsRef}
					enablePan={true}
					enableZoom={true}
					enableRotate={true}
					maxDistance={20}
					minDistance={0}
					target={INITIAL_CAMERA_TARGET}
				/>
				{/* Lighting setup */}
				<ambientLight intensity={3} />
				<directionalLight
					position={[0, 10, 0]}
					intensity={1}
					castShadow
					shadow-mapSize={2048}
					shadow-camera-far={50}
					shadow-camera-left={-10}
					shadow-camera-right={10}
					shadow-camera-top={10}
					shadow-camera-bottom={-10}
				/>
				<Suspense fallback={null}>
					<Model
						modelFiles={modelFiles}
						visibleModels={visibleModels}
						setVisibleModels={setVisibleModels}
						selectedAnimation={selectedAnimation}
						isPaused={isPaused}
						setIsLoading={setIsLoading}
						setLoadingProgress={setLoadingProgress}
						onAnimationDurationChange={setAnimationDuration}
						modelType={modelType}
						bossName={bossName}
						availableAnimations={availableAnimations}
						onAnimationChange={setSelectedAnimation}
					/>
					{selectedScene === "grid" ? <gridHelper args={[10, 10]} /> : <Scene sceneName={selectedScene} />}
					<ScreenshotHandler onCapture={captureCallback} />
					<RecordingHandler isRecording={isRecording} onRecordingComplete={handleRecordingComplete} />
				</Suspense>
			</Canvas>

			{/* Camera Controls */}
			<ActionControls
				isLoading={isLoading}
				resetCamera={resetCamera}
				captureScreenshot={captureScreenshot}
				isRecording={isRecording}
				isExportingAnimation={isExportingAnimation}
				toggleRecording={toggleRecording}
				exportAnimation={exportAnimation}
				selectedAnimation={selectedAnimation}
				animationDuration={animationDuration}
				isFullscreen={isFullscreen}
				toggleFullscreen={toggleFullscreen}
				downloadModels={downloadModels}
				isDownloading={isDownloading}
				isMuted={isMuted}
				setIsMuted={setIsMuted}
				voiceLanguage={voiceLanguage}
				setVoiceLanguage={setVoiceLanguage}
				hasVoiceFiles={
					voiceFiles !== undefined &&
					(voiceFiles.en.length > 0 || voiceFiles.jp.length > 0 || voiceFiles.kr.length > 0)
				}
			/>

			{/* Loading overlay */}
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg min-w-72 max-w-md flex flex-row items-center gap-3">
						<Progress value={loadingProgress} className="h-2" />
						<div className="text-xs text-muted-foreground text-right mb-0.5">
							{Math.round(loadingProgress)}%
						</div>
					</div>
				</div>
			)}

			{/* Screenshot Dialog */}
			<ScreenshotDialog
				open={screenshotDialog}
				onOpenChange={setScreenshotDialog}
				screenshotUrl={screenshotUrl}
				onDownload={downloadScreenshot}
				onCopyToClipboard={copyToClipboard}
			/>

			{/* Recording Dialog */}
			<RecordingDialog
				open={recordingDialog}
				onOpenChange={closeRecordingDialog}
				recordingUrl={recordingUrl}
				downloadFormat={downloadFormat}
				setDownloadFormat={setDownloadFormat}
				onDownload={downloadRecording}
				isConverting={isConverting}
			/>
		</>
	)

	return (
		<Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
			<div className="space-y-4 flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-200 lg:max-h-200">
				<div
					ref={viewerContainerRef}
					// Clip the background and blurred controls together inside backdrop-filtered dialogs.
					style={{ clipPath: isFullscreen ? "inset(0)" : "inset(0 round var(--radius-lg))" }}
					className={`relative w-full bg-linear-to-b from-blue-100 to-blue-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden transition-all duration-300 ${
						isFullscreen
							? "fixed! inset-0 z-50 w-screen! h-screen! rounded-none!"
							: modelType === "artifacts"
								? "h-120 lg:h-auto rounded-lg"
								: "h-200 lg:h-auto rounded-lg"
					}`}
				>
					{renderViewerContent()}
				</div>
			</div>
		</Collapsible>
	)
}
