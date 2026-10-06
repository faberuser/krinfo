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
import { Copy, Download } from "lucide-react"
import Image from "@/components/image"

interface ScreenshotDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	screenshotUrl: string | null
	onDownload: () => void
	onCopyToClipboard: () => void
}

export function ScreenshotDialog({
	open,
	onOpenChange,
	screenshotUrl,
	onDownload,
	onCopyToClipboard,
}: ScreenshotDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>
						<Text messageKey="uiScreenshotCaptured" />
					</DialogTitle>
					<DialogDescription>
						<Text messageKey="uiChooseHowYouWantToSaveYourScreenshot" />
					</DialogDescription>
				</DialogHeader>
				{screenshotUrl && (
					<div className="flex justify-center overflow-y-auto flex-1 min-h-0">
						<Image
							src={screenshotUrl}
							alt="Screenshot preview"
							className="max-w-full h-auto rounded-lg border object-contain"
						/>
					</div>
				)}
				<DialogFooter className="flex gap-2">
					<Button variant="outline" onClick={onCopyToClipboard}>
						<Copy className="h-4 w-4" />
						<Text messageKey="uiCopyToClipboard" />
					</Button>
					<Button onClick={onDownload}>
						<Download className="h-4 w-4" />
						<Text messageKey="uiDownload" />
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
