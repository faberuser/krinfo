"use client"

import { Text } from "@/components/i18n/language-provider"
import { ArrowLeft, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import MobileMenu from "@/components/mobile-menu"
import { SidebarInset } from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"
import { useDataVersion, DataVersionLabels, DataVersionDescriptions } from "@/hooks/use-data-version"
import { DataVersion } from "@/lib/constants"
import { useHeroToggle } from "@/contexts/version-toggle-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CompareToggle from "@/components/compare/compare-toggle"
import { useCompareMode } from "@/hooks/use-compare-mode"
import Notification from "@/components/notification"

export default function SidebarInsetClient({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const pathname = usePathname()
	const { version, setVersion } = useDataVersion()
	const { showToggle, availableVersions } = useHeroToggle()
	const { isCompareMode } = useCompareMode()

	// Use full width when in compare mode, otherwise use container
	const containerClass = isCompareMode ? "p-4 pt-2 sm:p-6 sm:pt-4" : "container mx-auto p-4 pt-2 sm:p-8 sm:pt-4"

	return (
		<SidebarInset>
			<Notification />
			<div className={pathname !== "/" ? containerClass : undefined}>
				{/* Back Button */}
				<div
					className={`mb-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:flex md:flex-row md:flex-wrap ${
						pathname === "/" ? "p-4 pt-2.5 justify-end md:hidden" : "justify-between"
					}`}
				>
					{pathname !== "/" && (
						<Button
							variant="ghost"
							className="col-start-1 row-start-1 justify-self-start gap-2"
							onClick={() => router.back()}
						>
							<ArrowLeft className="h-4 w-4" />
							<Text messageKey="uiBack" />
						</Button>
					)}
					<div className="col-start-2 row-start-1 flex items-center gap-2 flex-wrap justify-center md:ml-auto md:justify-end">
						{showToggle && availableVersions.length > 0 && (
							<div className="flex items-center gap-2 flex-wrap">
								{/* Compare Toggle - show when multiple versions available */}
								{availableVersions.length > 1 && (
									<CompareToggle availableVersions={availableVersions} />
								)}

								{/* Version Selector - hide when in compare mode */}
								{!isCompareMode && (
									<>
										<Select
											key={availableVersions.join(",")}
											value={version}
											onValueChange={(value) => setVersion(value as DataVersion)}
										>
											<SelectTrigger>
												<Layers className="size-4" aria-hidden="true" />
												<SelectValue placeholder="Version" />
											</SelectTrigger>
											<SelectContent>
												{availableVersions.map((opt) => (
													<SelectItem key={opt} value={opt}>
														<Text>{DataVersionLabels[opt]}</Text>
													</SelectItem>
												))}
												<div className="mt-1 flex max-w-xs items-start gap-2 border-t px-2 py-2 text-xs text-muted-foreground">
													<div>{DataVersionDescriptions[version]}</div>
												</div>
											</SelectContent>
										</Select>
									</>
								)}
							</div>
						)}
					</div>
					<div className="col-start-3 row-start-1 justify-self-end md:hidden">
						<MobileMenu />
					</div>
				</div>
				<main className="w-full">{children}</main>
			</div>
		</SidebarInset>
	)
}
