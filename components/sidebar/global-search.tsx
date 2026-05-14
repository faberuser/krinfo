"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Search, UserRound, Amphora, ShieldHalf } from "lucide-react"
import { DialogTitle } from "@/components/ui/dialog"
import { ArtifactData } from "@/model/Artifact"
import { HeroData } from "@/model/Hero"
import { BossData } from "@/model/Boss"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

// Types for search data
interface SearchItem {
	id: string
	title: string
	description?: string
	type: "page" | "hero" | "artifact" | "boss"
	url: string
	icon?: React.ComponentType<{ className?: string }>
	aliases?: string[] | null
}

interface GlobalSearchProps {
	searchData?: {
		heroes?: HeroData[]
		artifacts?: ArtifactData[]
		bosses?: BossData[]
	}
	state: "collapsed" | "expanded"
}

export default function GlobalSearch({ searchData, state }: GlobalSearchProps) {
	const [open, setOpen] = useState(false)
	const [searchValue, setSearchValue] = useState("")
	const router = useRouter()
	const listRef = useRef<HTMLDivElement>(null)

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

	// Compute search items from searchData using useMemo
	const searchItems = useMemo(() => {
		const items: SearchItem[] = []

		if (searchData?.heroes) {
			searchData.heroes.forEach((hero, index) => {
				items.push({
					id: `hero-${index}`,
					title: hero.profile.name,
					description: hero.profile.title,
					type: "hero",
					url: `/heroes/${encodeURIComponent(hero.profile.name.toLowerCase().replace(/\s+/g, "-"))}`,
					icon: UserRound,
					aliases: hero.aliases || null,
				})
			})
		}

		if (searchData?.artifacts) {
			searchData.artifacts.forEach((artifact, index) => {
				items.push({
					id: `artifact-${index}`,
					title: artifact.name,
					description: artifact.description,
					type: "artifact",
					url: `/artifacts/${encodeURIComponent(artifact.name.toLowerCase().replace(/\s+/g, "-"))}`,
					icon: Amphora,
					aliases: artifact.aliases || null,
				})
			})
		}

		if (searchData?.bosses) {
			searchData.bosses.forEach((boss, index) => {
				items.push({
					id: `boss-${index}`,
					title: boss.profile.name,
					description: boss.profile.title,
					type: "boss",
					url: `/bosses/${encodeURIComponent(boss.profile.name.toLowerCase().replace(/\s+/g, "-"))}`,
					icon: ShieldHalf,
					aliases: boss.aliases || null,
				})
			})
		}

		return items
	}, [searchData])

	// Reset scroll position when search value changes
	useEffect(() => {
		if (open) {
			const timer = setTimeout(() => {
				const commandList = document.querySelector("[cmdk-list]") as HTMLElement
				if (commandList) {
					commandList.scrollTop = 0
				}
				if (listRef.current) {
					listRef.current.scrollTop = 0
				}
			}, 10)
			return () => clearTimeout(timer)
		}
	}, [searchValue, open])

	const handleSelect = (url: string) => {
		setOpen(false)
		setSearchValue("")
		router.push(url)
	}

	const getGroupTitle = (type: string) => {
		switch (type) {
			case "page":
				return "Pages"
			case "hero":
				return "Heroes"
			case "artifact":
				return "Artifacts"
			case "boss":
				return "Bosses"
			default:
				return "Results"
		}
	}

	// Group items by type
	const groupedItems = searchItems.reduce(
		(acc, item) => {
			if (!acc[item.type]) {
				acc[item.type] = []
			}
			acc[item.type].push(item)
			return acc
		},
		{} as Record<string, SearchItem[]>,
	)

	// Handle dialog open/close
	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (!newOpen) {
			setSearchValue("")
		}
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

			<CommandDialog open={open} onOpenChange={handleOpenChange}>
				<DialogTitle className="sr-only">Global Search</DialogTitle>
				<CommandInput placeholder="Search globally..." value={searchValue} onValueChange={setSearchValue} />
				<CommandList ref={listRef} className="max-h-[400px] overflow-y-auto custom-scrollbar">
					<CommandEmpty>No results found.</CommandEmpty>

					{Object.entries(groupedItems).map(([type, items]) => (
						<CommandGroup key={type} heading={getGroupTitle(type)}>
							{items.map((item) => {
								const Icon = item.icon
								return (
									<CommandItem
										key={item.id}
										value={`${item.title} ${item.description} ${
											item.aliases ? item.aliases.join(" ") : ""
										}`}
										onSelect={() => handleSelect(item.url)}
										className="flex items-center gap-2 px-2 py-1.5"
									>
										{Icon && <Icon className="h-4 w-4" />}
										<div className="flex flex-col">
											<span className="font-medium">{item.title}</span>
											{item.description && (
												<span className="text-xs text-muted-foreground">
													{item.description}
												</span>
											)}
										</div>
									</CommandItem>
								)
							})}
						</CommandGroup>
					))}
				</CommandList>
			</CommandDialog>
		</>
	)
}
