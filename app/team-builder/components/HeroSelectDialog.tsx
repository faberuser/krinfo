"use client"

import { Text } from "@/components/i18n/language-provider"
import { HeroData } from "@/model/Hero"
import Image from "@/components/next-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Check, Search, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamMember } from "@/model/Team_Builder"

interface HeroClass {
	value: string
	name: string
	icon: string
}

interface HeroSelectDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	heroSearchQuery: string
	onSearchChange: (query: string) => void
	filteredHeroes: HeroData[]
	team: TeamMember[]
	onSelectHero: (hero: HeroData) => void
	// Filter/sort props
	heroClasses: readonly HeroClass[]
	selectedClass: string
	onClassChange: (value: string) => void
	selectedDamageType: string
	onDamageTypeChange: (value: string) => void
	sortType: "alphabetical" | "release"
	onSortTypeChange: (value: "alphabetical" | "release") => void
	reverseSort: boolean
	onReverseSortChange: (value: boolean) => void
}

const damageTypes = [
	{ value: "all", name: "All" },
	{ value: "magical", name: "Magical" },
	{ value: "physical", name: "Physical" },
]

export function HeroSelectDialog({
	isOpen,
	onOpenChange,
	heroSearchQuery,
	onSearchChange,
	filteredHeroes,
	team,
	onSelectHero,
	heroClasses,
	selectedClass,
	onClassChange,
	selectedDamageType,
	onDamageTypeChange,
	sortType,
	onSortTypeChange,
	reverseSort,
	onReverseSortChange,
}: HeroSelectDialogProps) {
	const availableSlots = 8 - team.filter((m) => m.hero !== null).length
	const allSlotsFilled = availableSlots === 0

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				onOpenChange(open)
				if (!open) onSearchChange("")
			}}
		>
			<DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-hidden flex flex-col bg-background/70 backdrop-blur-sm">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-4">
						<span>
							<Text messageKey="uiSelectHeroes" />
						</span>
						<span className="text-sm font-normal text-muted-foreground">
							{availableSlots} <Text>{availableSlots === 1 ? "slot" : "slots"}</Text>{" "}
							<Text messageKey="uiAvailable_ddd9818a" />
						</span>
					</DialogTitle>
				</DialogHeader>
				<DialogDescription className="sr-only">
					<Text messageKey="uiSelectAHeroFromTheListBelow" />
				</DialogDescription>

				{/* Filters and Search */}
				<div className="space-y-3">
					{/* Search and Sort Row */}
					<div className="flex flex-row gap-2 items-start sm:items-center justify-between">
						{/* Search Input */}
						<div className="w-full sm:max-w-sm relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search heroes..."
								value={heroSearchQuery}
								onChange={(e) => onSearchChange(e.target.value)}
								className="pl-10"
							/>
						</div>

						{/* Sort Buttons */}
						<div className="flex flex-row gap-1">
							<Button
								variant={sortType === "alphabetical" ? "outline" : "ghost"}
								size="sm"
								onClick={() => {
									if (sortType === "alphabetical") {
										onReverseSortChange(!reverseSort)
									} else {
										onSortTypeChange("alphabetical")
										onReverseSortChange(false)
									}
								}}
							>
								{sortType === "alphabetical" && reverseSort && <ChevronDown className="h-4 w-4" />}
								{sortType === "alphabetical" && !reverseSort && <ChevronUp className="h-4 w-4" />}
								<Text>{sortType === "alphabetical" && reverseSort ? "Z → A" : "A → Z"}</Text>
							</Button>
							<Button
								variant={sortType === "release" ? "outline" : "ghost"}
								size="sm"
								onClick={() => {
									if (sortType === "release") {
										onReverseSortChange(!reverseSort)
									} else {
										onSortTypeChange("release")
										onReverseSortChange(true)
									}
								}}
							>
								{sortType === "release" && reverseSort && <ChevronUp className="h-4 w-4" />}
								{sortType === "release" && !reverseSort && <ChevronDown className="h-4 w-4" />}
								<Text messageKey="uiRelease" />
							</Button>
						</div>
					</div>

					{/* Class and Damage Type Filters */}
					<div className="flex flex-col sm:flex-row gap-4 items-center">
						{/* Class Filter */}
						<RadioGroup
							value={selectedClass}
							onValueChange={onClassChange}
							className="flex flex-row flex-wrap justify-center space-x-1 md:space-x-2"
						>
							{heroClasses.map((heroClass) => (
								<label
									key={heroClass.value}
									htmlFor={`dialog-class-${heroClass.value}`}
									className="flex items-center space-x-1 md:space-x-2 cursor-pointer"
								>
									<RadioGroupItem value={heroClass.value} id={`dialog-class-${heroClass.value}`} />
									{heroClass.value !== "all" ? (
										<Image
											src={heroClass.icon}
											alt={heroClass.name}
											width={20}
											height={20}
											className="object-cover"
										/>
									) : (
										<span className="text-xs font-medium">
											<Text messageKey="uiAll" />
										</span>
									)}
								</label>
							))}
						</RadioGroup>

						{/* Damage Type Filter */}
						<RadioGroup
							value={selectedDamageType}
							onValueChange={onDamageTypeChange}
							className="flex flex-row flex-wrap justify-center space-x-1 md:space-x-2"
						>
							{damageTypes.map((damageType) => (
								<label
									key={damageType.value}
									htmlFor={`dialog-dmg-${damageType.value}`}
									className="flex items-center space-x-1 md:space-x-2 cursor-pointer"
								>
									<RadioGroupItem value={damageType.value} id={`dialog-dmg-${damageType.value}`} />
									<span className="text-xs">
										<Text>{damageType.name}</Text>
									</span>
								</label>
							))}
						</RadioGroup>

						{/* Results count */}
						<div className="hidden md:block text-sm text-muted-foreground ml-auto">
							{filteredHeroes.length} <Text messageKey="uiHeroes_8172f9d4" />
						</div>
					</div>
				</div>

				{/* Hero Grid */}
				<div className="flex-1 overflow-y-auto custom-scrollbar">
					<div className="flex flex-wrap justify-center gap-3 px-2 py-1">
						{filteredHeroes.map((hero) => {
							if (!hero.profile.thumbnail) return null
							const alreadyInTeam = team.some((m) => m.hero?.id === hero.id)
							return (
								<button
									key={hero.id}
									onClick={() => onSelectHero(hero)}
									disabled={!alreadyInTeam && allSlotsFilled}
									className={cn(
										"relative rounded border overflow-hidden transition-all aspect-square w-[calc((100%-1.5rem)/3)] sm:w-[calc((100%-3rem)/5)] md:w-[calc((100%-4.5rem)/7)] lg:w-[calc((100%-6rem)/9)]",
										alreadyInTeam
											? "ring-2 ring-primary hover:ring-destructive opacity-40 hover:opacity-80 cursor-pointer"
											: allSlotsFilled
												? "opacity-40 cursor-not-allowed"
												: "hover:ring-2 hover:ring-primary active:scale-95",
									)}
									title={alreadyInTeam ? "Click to remove from team" : "Click to add to team"}
								>
									<Image
										src={`/kingsraid-data/assets/${hero.profile.thumbnail}`}
										alt={hero.profile.name}
										width="0"
										height="0"
										sizes="40vw md:20vw"
										className="w-full h-full object-cover"
									/>
									<div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-1.5">
										<div className="text-xs text-white truncate text-center font-medium">
											<Text>{hero.profile.name}</Text>
										</div>
									</div>
									{alreadyInTeam && (
										<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
											<Check className="h-8 w-8 text-white" />
										</div>
									)}
								</button>
							)
						})}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
