"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import type { SearchData } from "@/lib/list-data"

const SearchDialog = dynamic(() => import("@/components/sidebar/search-dialog"))

interface GlobalSearchProps {
	searchData: SearchData
	state: "collapsed" | "expanded"
}

export default function GlobalSearch({ searchData, state }: GlobalSearchProps) {
	const [open, setOpen] = useState(false)
	const pendingResultRef = useRef<{ url: string; listPath: string } | null>(null)
	const pathname = usePathname()
	const router = useRouter()

	// Wait for the list route to commit so its modal slot can intercept the detail navigation.
	useEffect(() => {
		const pendingResult = pendingResultRef.current
		if (!pendingResult || pathname !== pendingResult.listPath) return

		pendingResultRef.current = null
		router.push(pendingResult.url, { scroll: false })
	}, [pathname, router])

	// Handle keyboard shortcut
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen((open) => !open)
			}
		}

		document.addEventListener("keydown", down)
		return () => document.removeEventListener("keydown", down)
	}, [])

	const handleSelect = (url: string) => {
		setOpen(false)
		const listPath = `/${url.split("/")[1]}`
		if (pathname === listPath) {
			pendingResultRef.current = null
			router.push(url, { scroll: false })
			return
		}
		pendingResultRef.current = { url, listPath }
		router.push(listPath)
	}

	return (
		<>
			<Button
				variant={state === "collapsed" ? null : "outline"}
				className={
					"w-full justify-start text-sm text-muted-foreground " +
					(state === "collapsed" ? "p-1.75 has-[>svg]:px-1.75" : "")
				}
				onClick={() => setOpen(true)}
			>
				<Search className={`mr-1 h-4 w-4 ${state === "collapsed" ? "text-white" : "text-muted-foreground"}`} />
				{state === "collapsed" ? null : (
					<>
						Search...
						<KbdGroup className="ml-auto">
							<Kbd>Ctrl + K</Kbd>
						</KbdGroup>
					</>
				)}
			</Button>

			{open && (
				<SearchDialog searchData={searchData} open={open} onOpenChange={setOpen} onSelect={handleSelect} />
			)}
		</>
	)
}
