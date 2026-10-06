"use client"

import { Text } from "@/components/i18n/language-provider"

import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Download } from "lucide-react"

interface RecordingDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	recordingUrl: string | null
	downloadFormat: "webm" | "mp4" | "gif"
	setDownloadFormat: (format: "webm" | "mp4" | "gif") => void
	onDownload: () => void
	isConverting: boolean
}

export function RecordingDialog({
	open,
	onOpenChange,
	recordingUrl,
	downloadFormat,
	setDownloadFormat,
	onDownload,
	isConverting,
}: RecordingDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] flex flex-col">
				<DialogHeader className="shrink-0">
					<DialogTitle><Text messageKey="uiRecordingComplete" /></DialogTitle>
					<DialogDescription><Text messageKey="uiChooseYourPreferredFormatAndDownloadTheAnimation" /></DialogDescription>
				</DialogHeader>
				<div className="overflow-y-auto flex-1 min-h-0 space-y-4">
					{recordingUrl && (
						<div className="flex justify-center">
							<video
								src={recordingUrl}
								controls
								autoPlay
								loop
								className="max-w-full max-h-[40vh] rounded-lg border object-contain"
							/>
						</div>
					)}
					<div className="space-y-2">
						<label className="text-sm font-medium"><Text messageKey="uiDownloadFormat" /></label>
						<RadioGroup
							value={downloadFormat}
							onValueChange={(value: "webm" | "mp4" | "gif") => setDownloadFormat(value)}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="webm" id="webm" />
								<label htmlFor="webm" className="text-sm cursor-pointer">
									<Text messageKey="uiWebmBestQualitySmallestFileModernBrowsers" /></label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="mp4" id="mp4" />
								<label htmlFor="mp4" className="text-sm cursor-pointer">
									<Text messageKey="uiMp4MostCompatibleWorksEverywhere" /></label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="gif" id="gif" />
								<label htmlFor="gif" className="text-sm cursor-pointer">
									<Text messageKey="uiGifAnimatedImageMayHaveQualityLimitations" /></label>
							</div>
						</RadioGroup>
						{downloadFormat === "gif" && (
							<p className="text-xs text-muted-foreground">
								<Text messageKey="uiNoteGifMayResultInLargerFileSizesReducedQualityAndLongerConversionTimes" /></p>
						)}
					</div>
				</div>
				<DialogFooter className="flex gap-2 shrink-0">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConverting}>
						<Text messageKey="uiClose" /></Button>
					<Button onClick={onDownload} disabled={isConverting}>
						<Download className="h-4 w-4" />
						<Text>{isConverting ? "Converting..." : `Download as ${downloadFormat.toUpperCase()}`}</Text>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
