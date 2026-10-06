"use client"

import { Text } from "@/components/i18n/language-provider"
import { useSyncExternalStore, useCallback } from "react"
import { X } from "lucide-react"

// Change this ID whenever you update the notification text so it re-appears for users who dismissed the old one.
const NOTIFICATION_ID = "notification-v1"

function getSnapshot() {
	return localStorage.getItem(NOTIFICATION_ID) === null
}

function getServerSnapshot() {
	return false
}

function subscribe(callback: () => void) {
	window.addEventListener("storage", callback)
	return () => window.removeEventListener("storage", callback)
}

export default function Notification() {
	const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

	const dismiss = useCallback(() => {
		localStorage.setItem(NOTIFICATION_ID, "true")
		// Force a re-render since storage event only fires in other tabs
		window.dispatchEvent(new StorageEvent("storage", { key: NOTIFICATION_ID }))
	}, [])

	if (!visible) return null

	return (
		<div className="relative w-full border-b border-primary/30 px-4 py-2 text-sm text-center flex items-center justify-center gap-2">
			<span>
				<Text messageKey="uiWeHaveANewDomain" />
				<Text> </Text>
				<a
					href="https://krinfo.net/"
					target="_blank"
					rel="noopener noreferrer"
					className="underline font-semibold hover:opacity-80 transition-opacity"
				>
					<Text>krinfo.net</Text>
				</a>
				<Text> </Text>
				<Text messageKey="uiYouCanStillUseBothDomains" />
			</span>
			<button
				onClick={dismiss}
				aria-label="Dismiss notification"
				className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 hover:opacity-70 transition-opacity"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	)
}
