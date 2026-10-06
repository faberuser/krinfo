import { useRef, type ReactNode } from "react"
import { ChevronDown, ChevronUp, Search, X } from "lucide-react"
import { Text } from "@/components/i18n/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ListSortType = "alphabetical" | "release"

interface ListPageHeaderProps {
	title: ReactNode
	count: number
	countLabel: ReactNode
	sortType: ListSortType
	reverseSort: boolean
	onSortChange: (sortType: ListSortType, reverseSort: boolean) => void
	actions?: ReactNode
	search: ReactNode
	children: ReactNode
}

// Used within the pages' client boundary; each page composes its own filter row.
export function ListPageHeader({
	title,
	count,
	countLabel,
	sortType,
	reverseSort,
	onSortChange,
	actions,
	search,
	children,
}: ListPageHeaderProps) {
	function selectSort(nextSortType: ListSortType) {
		onSortChange(nextSortType, nextSortType === sortType ? !reverseSort : nextSortType === "release")
	}

	return (
		<div className="space-y-2 mb-4">
			<div className="flex min-h-9 flex-row justify-between items-center">
				<div className="flex flex-row gap-2 items-baseline">
					<div className="text-xl font-bold">{title}</div>
					<div className="text-muted-foreground text-sm">
						<span className="hidden sm:inline"><Text messageKey="uiShowing" suffix=" " /></span>
						{count}
						<span> {countLabel}</span>
					</div>
				</div>
				{actions}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{search}
				<div className="order-2 flex shrink-0 flex-row sm:order-3 sm:ml-auto">
					<Button
						type="button"
						variant={sortType === "alphabetical" ? "outline" : "ghost"}
						onClick={() => selectSort("alphabetical")}
					>
						{sortType === "alphabetical" ? (reverseSort ? <ChevronDown /> : <ChevronUp />) : null}
						<Text>{sortType === "alphabetical" && reverseSort ? "Z → A" : "A → Z"}</Text>
					</Button>
					<Button
						type="button"
						variant={sortType === "release" ? "outline" : "ghost"}
						onClick={() => selectSort("release")}
					>
						{sortType === "release" ? (reverseSort ? <ChevronUp /> : <ChevronDown />) : null}
						<Text messageKey="uiRelease" />
					</Button>
				</div>
				<div className="order-3 w-full sm:order-2 sm:w-auto">
					{children}
				</div>
			</div>
		</div>
	)
}

interface ListPageSearchProps {
	value: string
	onValueChange: (value: string) => void
	placeholder: string
	"aria-label"?: string
}

export function ListPageSearch({ value, onValueChange, placeholder, "aria-label": ariaLabel }: ListPageSearchProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	return (
		<div className="relative min-w-0 flex-1 sm:w-full sm:max-w-sm sm:flex-none">
			<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
				<Search className="h-4 w-4" />
			</span>
			<Input
				ref={inputRef}
				type="text"
				placeholder={placeholder}
				aria-label={ariaLabel}
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				className="w-full pl-10 pr-10"
			/>
			{value.length > 0 ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
					aria-label="Clear search"
					onClick={() => {
						onValueChange("")
						inputRef.current?.focus()
					}}
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</Button>
			) : null}
		</div>
	)
}
