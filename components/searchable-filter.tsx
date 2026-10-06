"use client"

import { Text, useTranslation } from "@/components/i18n/language-provider"
import { useState, type ReactNode } from "react"
import Image from "@/components/next-image"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"

interface SearchableFilterProps {
	label: string
	searchPlaceholder: string
	value: string
	onValueChange: (value: string) => void
	options: readonly { value: string; label: string; icon?: string }[]
	icon?: ReactNode
}

export function SearchableFilter({ label, searchPlaceholder, value, onValueChange, options, icon }: SearchableFilterProps) {
	const { t } = useTranslation()
	const [open, setOpen] = useState(false)
	const selectedOption = options.find((option) => option.value === value)
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-label={label}
					aria-expanded={open}
					className="w-full sm:w-64 min-w-0 justify-between font-normal"
				>
					<span className="flex min-w-0 items-center gap-2">
						{selectedOption?.icon ? (
							<Image
								src={selectedOption.icon}
								alt=""
								width={20}
								height={20}
								className="size-5 shrink-0 object-contain"
							/>
						) : icon}
						<span className="truncate">
							<Text>{selectedOption?.label ?? label}</Text>
						</span>
					</span>
					<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
				<Command>
					<CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>
							<Text messageKey="uiNoMatchingOptions" />
						</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.value}
									keywords={[option.label, t(option.label)]}
									onSelect={() => {
										onValueChange(option.value)
										setOpen(false)
									}}
								>
									<Check className={value === option.value ? "opacity-100" : "opacity-0"} />
									{option.icon ? (
										<Image
											src={option.icon}
											alt=""
											width={20}
											height={20}
											className="size-5 shrink-0 object-contain"
										/>
									) : null}
									<Text>{option.label}</Text>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
