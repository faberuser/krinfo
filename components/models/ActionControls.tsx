"use client"

import { Text } from "@/components/i18n/language-provider"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Kbd } from "@/components/ui/kbd"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
	RotateCcw,
	Info,
	Camera,
	Video,
	Square,
	Film,
	Maximize,
	Minimize,
	Download,
	ChevronDown,
	ChevronUp,
	Volume2,
	VolumeX,
} from "lucide-react"
import { VoiceLanguage } from "@/components/models/types"

interface ActionControlsProps {
	isLoading: boolean
	resetCamera: () => void
	captureScreenshot: () => void
	isRecording: boolean
	isExportingAnimation: boolean
	toggleRecording: () => void
	exportAnimation: () => void
	selectedAnimation: string | null
	animationDuration: number
	isFullscreen: boolean
	toggleFullscreen: () => void
	downloadModels: () => void
	isDownloading: boolean
	// Audio controls
	isMuted?: boolean
	setIsMuted?: (muted: boolean) => void
	voiceLanguage?: VoiceLanguage
	setVoiceLanguage?: (lang: VoiceLanguage) => void
	hasVoiceFiles?: boolean
}

export function ActionControls({
	isLoading,
	resetCamera,
	captureScreenshot,
	isRecording,
	isExportingAnimation,
	toggleRecording,
	exportAnimation,
	selectedAnimation,
	animationDuration,
	isFullscreen,
	toggleFullscreen,
	downloadModels,
	isDownloading,
	isMuted = true,
	setIsMuted,
	voiceLanguage = "jp",
	setVoiceLanguage,
	hasVoiceFiles = false,
}: ActionControlsProps) {
	const [isOpen, setIsOpen] = useState(true)

	const languageLabels: Record<VoiceLanguage, string> = {
		en: "EN",
		jp: "JP",
		kr: "KR",
	}

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className="absolute top-4 right-4">
			<div className="flex flex-col gap-2">
				<CollapsibleTrigger asChild>
					<Button size="sm" variant="secondary" className="w-10">
						{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="flex flex-col gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="sm" variant="secondary" disabled={isLoading}>
								<Info className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent className="space-y-1">
							<div>
								<Kbd>
									<Text messageKey="uiLeftClick" />
								</Kbd>{" "}
								<Text messageKey="uiRotate" />
							</div>
							<div>
								<Kbd>
									<Text messageKey="uiRightClick" />
								</Kbd>{" "}
								<Text messageKey="uiMove" />
							</div>
							<div>
								<Kbd>
									<Text messageKey="uiScroll" />
								</Kbd>{" "}
								<Text messageKey="uiZoom" />
							</div>
							<div>
								<Kbd>
									<Text messageKey="uiSpace" />
								</Kbd>{" "}
								<Text messageKey="uiPlayPauseAnimation" />
							</div>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="sm" variant="secondary" onClick={toggleFullscreen} disabled={isLoading}>
								{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<div>
								<Text>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</Text>
							</div>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="sm" variant="secondary" onClick={resetCamera} disabled={isLoading}>
								<RotateCcw className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<div>
								<Text messageKey="uiResetCamera" />
							</div>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="sm"
								variant="secondary"
								onClick={downloadModels}
								disabled={isLoading || isDownloading}
							>
								<Download className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<div>
								<Text>{isDownloading ? "Downloading..." : "Download Models"}</Text>
							</div>
						</TooltipContent>
					</Tooltip>

					{/* Audio Controls - only show if voice files are available */}
					{hasVoiceFiles && setIsMuted && setVoiceLanguage && (
						<>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="sm"
										variant={isMuted ? "secondary" : "default"}
										onClick={() => setIsMuted(!isMuted)}
										disabled={isLoading}
									>
										{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<div>
										<Text>{isMuted ? "Unmute Voice" : "Mute Voice"}</Text>
									</div>
								</TooltipContent>
							</Tooltip>

							{!isMuted && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Select
											value={voiceLanguage}
											onValueChange={(value) => setVoiceLanguage(value as VoiceLanguage)}
											disabled={isLoading}
										>
											<SelectTrigger className="w-10 h-9 px-0 justify-center text-xs font-medium bg-secondary! hover:bg-secondary/80! border-0 [&>svg]:hidden">
												<SelectValue>
													<Text>{languageLabels[voiceLanguage]}</Text>
												</SelectValue>
											</SelectTrigger>
											<SelectContent align="center">
												<SelectItem value="en">
													<Text messageKey="uiEnglish" />
												</SelectItem>
												<SelectItem value="jp">
													<Text messageKey="uiJapanese" />
												</SelectItem>
												<SelectItem value="kr">
													<Text messageKey="uiKorean" />
												</SelectItem>
											</SelectContent>
										</Select>
									</TooltipTrigger>
									<TooltipContent>
										<div>
											<Text messageKey="uiSelectVoiceLanguage" />
										</div>
									</TooltipContent>
								</Tooltip>
							)}
						</>
					)}

					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="sm" variant="secondary" onClick={captureScreenshot} disabled={isLoading}>
								<Camera className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<div>
								<Text messageKey="uiTakeScreenshot" />
							</div>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="sm"
								variant={isRecording && !isExportingAnimation ? "destructive" : "secondary"}
								onClick={toggleRecording}
								disabled={isLoading || isExportingAnimation}
							>
								{isRecording && !isExportingAnimation ? (
									<Square className="h-4 w-4" />
								) : (
									<Video className="h-4 w-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<div>
								<Text>{isRecording && !isExportingAnimation ? "Stop Recording" : "Record Video"}</Text>
							</div>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="sm"
								variant={isExportingAnimation ? "destructive" : "secondary"}
								onClick={exportAnimation}
								disabled={isLoading || !selectedAnimation || isRecording}
							>
								<Film className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<div>
								<Text>
									{isExportingAnimation
										? "Exporting..."
										: selectedAnimation
											? `Export Animation (${animationDuration.toFixed(1)}s)`
											: "Select an animation first"}
								</Text>
							</div>
						</TooltipContent>
					</Tooltip>
				</CollapsibleContent>
			</div>
		</Collapsible>
	)
}
