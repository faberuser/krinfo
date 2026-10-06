"use client"

import { Text } from "@/components/i18n/language-provider"

import { HeroData } from "@/model/Hero"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface VoicesProps {
	heroData: HeroData
	voiceFiles: VoiceFiles
}

export interface VoiceFiles {
	en: VoiceFile[]
	jp: VoiceFile[]
	kr: VoiceFile[]
}

export interface VoiceFile {
	name: string
	path: string
	displayName: string
}

export default function Voices({ heroData, voiceFiles }: VoicesProps) {
	const [currentPlaying, setCurrentPlaying] = useState<string | null>(null)
	const [currentLanguage, setCurrentLanguage] = useState<"en" | "jp" | "kr">("en")
	const audioRef = useRef<HTMLAudioElement | null>(null)

	useEffect(() => {
		// Cleanup audio when component unmounts
		return () => {
			if (audioRef.current) {
				audioRef.current.pause()
				audioRef.current = null
			}
		}
	}, [])

	const handlePlay = (voicePath: string) => {
		if (currentPlaying === voicePath) {
			// Pause if same file is playing
			audioRef.current?.pause()
			setCurrentPlaying(null)
		} else {
			// Stop previous audio
			if (audioRef.current) {
				audioRef.current.pause()
			}

			// Create and play new audio
			const audio = new Audio(voicePath)
			audioRef.current = audio

			audio.play().catch((error) => {
				console.error("Error playing audio:", error)
			})

			audio.onended = () => {
				setCurrentPlaying(null)
			}

			setCurrentPlaying(voicePath)
		}
	}

	const formatVoiceName = (name: string) => {
		// Remove hero name prefix and file extension
		const heroName = heroData.id
		let displayName = name.replace(`${heroName}-`, "").replace(/\.(wav|mp3|ogg)$/i, "")

		// Format the voice type
		displayName = displayName
			.replace(/Vox_/g, "")
			.replace(/[_\s]+(Jp|Kr|En)[_\s]*/gi, " ") // Remove language prefix anywhere in the string
			.replace(/_/g, " ")
			.trim()
			.replace(/\b\w/g, (char) => char.toUpperCase())

		return displayName
	}

	const renderVoiceList = (voices: VoiceFile[]) => {
		if (voices.length === 0) {
			return (
				<div className="text-center py-8 text-muted-foreground"><Text messageKey="uiNoVoiceFilesAvailableForThisLanguage" /></div>
			)
		}

		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
				{voices.map((voice) => (
					<Card key={voice.path} className="overflow-hidden">
						<CardContent>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-3 flex-1 min-w-0">
									<Button
										size="icon"
										variant={currentPlaying === voice.path ? "default" : "outline"}
										onClick={() => handlePlay(voice.path)}
										className="shrink-0"
									>
										{currentPlaying === voice.path ? (
											<Pause className="h-4 w-4" />
										) : (
											<Play className="h-4 w-4" />
										)}
									</Button>
									<div className="flex items-center gap-2 min-w-0">
										<Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
										<span className="text-sm font-medium truncate">
											<Text>{formatVoiceName(voice.name)}</Text>
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		)
	}

	const availableLanguages = Object.entries(voiceFiles).filter(([, files]) => files.length > 0)

	if (availableLanguages.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle><Text messageKey="uiVoiceLines" /></CardTitle>
					<CardDescription><Text messageKey="uiHeroVoiceLinesAreNotAvailable" /></CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Text messageKey="uiVoiceLines" /><Text>{" "}</Text>
					{voiceFiles[currentLanguage].length > 0 && (
						<span>
							({voiceFiles[currentLanguage].length} <Text>{currentLanguage.toUpperCase()}</Text>)
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Tabs
					defaultValue={availableLanguages[0][0]}
					onValueChange={(value) => setCurrentLanguage(value as "en" | "jp" | "kr")}
				>
					<TabsList className="w-full mb-4">
						{voiceFiles.en.length > 0 && <TabsTrigger value="en"><Text messageKey="uiEnglish" /></TabsTrigger>}
						{voiceFiles.jp.length > 0 && <TabsTrigger value="jp"><Text messageKey="uiJapanese" /></TabsTrigger>}
						{voiceFiles.kr.length > 0 && <TabsTrigger value="kr"><Text messageKey="uiKorean" /></TabsTrigger>}
					</TabsList>

					<TabsContent value="en" className="mt-0 max-h-180 overflow-y-auto custom-scrollbar pr-1">
						{renderVoiceList(voiceFiles.en)}
					</TabsContent>

					<TabsContent value="jp" className="mt-0 max-h-180 overflow-y-auto custom-scrollbar pr-1">
						{renderVoiceList(voiceFiles.jp)}
					</TabsContent>

					<TabsContent value="kr" className="mt-0 max-h-180 overflow-y-auto custom-scrollbar pr-1">
						{renderVoiceList(voiceFiles.kr)}
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	)
}
