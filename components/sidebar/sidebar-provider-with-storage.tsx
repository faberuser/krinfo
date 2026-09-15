"use client"

import { SidebarProvider } from "@/components/ui/sidebar"
import { useState, useEffect } from "react"

const SIDEBAR_STORAGE_KEY = "sidebar:state"

function getInitialState(): boolean {
	if (typeof window === "undefined") return true
	const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
	return stored !== null ? stored === "true" : true
}

export default function SidebarProviderWithStorage({ children }: { children: React.ReactNode }) {
	// Render the shell on the server and use the same state during hydration.
	const [open, setOpen] = useState(true)

	// Restore the browser preference without withholding the entire page from SSR.
	useEffect(() => {
		const timer = setTimeout(() => setOpen(getInitialState()), 0)
		return () => clearTimeout(timer)
	}, [])

	// Save to localStorage whenever state changes
	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newOpen))
	}

	return (
		<SidebarProvider open={open} onOpenChange={handleOpenChange}>
			{children}
		</SidebarProvider>
	)
}
