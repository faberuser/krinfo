"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { items } from "@/components/sidebar/client-sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ModeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import Image from "@/components/next-image"
import { useTheme } from "next-themes"

export default function MobileMenu() {
	const pathname = usePathname()
	const { resolvedTheme } = useTheme()
	const [open, setOpen] = useState(false)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		const timer = setTimeout(() => setMounted(true), 0)
		return () => clearTimeout(timer)
	}, [])

	const githubSrc =
		mounted && resolvedTheme === "dark"
			? "/images/GitHub_Invertocat_White.svg"
			: "/images/GitHub_Invertocat_Black.svg"

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger className="relative w-8 h-8 flex items-center justify-center">
				<span
					className={`absolute transition-all duration-200 ease-in-out ${
						open ? "opacity-0 rotate-90" : "opacity-100 rotate-0"
					}`}
				>
					<Menu />
				</span>
				<span
					className={`absolute transition-all duration-200 ease-in-out ${
						open ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
					}`}
				>
					<X />
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="flex flex-col justify-between h-screen w-screen bg-background border-0">
				<div>
					{items.map((item) => {
						const isActive =
							item.url === "/"
								? pathname === "/" // Home should only match exact "/"
								: pathname.startsWith(item.url)

						return (
							<DropdownMenuItem
								key={item.title}
								asChild
								className="hover:bg-accent hover:text-accent-foreground"
							>
								<Link
									href={item.url}
									className={`flex items-center space-x-2 pl-5 py-4 rounded-md transition-colors ${
										isActive
											? "bg-gray-200 dark:bg-gray-800"
											: "hover:bg-gray-100 dark:hover:bg-gray-700"
									}`}
								>
									<item.icon />
									<div className="text-xl">{item.title}</div>
								</Link>
							</DropdownMenuItem>
						)
					})}
				</div>
				<div className="flex flex-row justify-between px-5 py-3 border-t items-center">
					<DropdownMenuItem asChild>
						<ModeToggle />
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link target="_blank" rel="noreferrer" href="https://github.com/faberuser/krinfo">
							<Button variant="outline" size="icon" className="bg-background">
								{mounted && (
									<Image
										src={githubSrc}
										alt="GitHub Logo"
										width={20}
										height={20}
										className="h-[1.2rem] w-[1.2rem]"
									/>
								)}
								<div className="sr-only">GitHub</div>
							</Button>
						</Link>
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
