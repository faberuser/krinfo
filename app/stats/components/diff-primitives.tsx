"use client"

import { Text } from "@/components/i18n/language-provider"

import { useState } from "react"
import type { ReactNode } from "react"
import { ArrowRight, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { TextDiff, FieldChange } from "@/app/stats/types"

export function DiffText({ diff }: { diff: TextDiff }) {
	if (diff.unified) return <UnifiedDiffText text={diff.unified} />
	return (
		<div className="space-y-0.5 text-sm">
			<div className="text-red-600 dark:text-red-400 line-through leading-relaxed"><Text>{diff.from ?? "-"}</Text></div>
			<div className="text-green-600 dark:text-green-400 font-medium leading-relaxed"><Text>{diff.to ?? "-"}</Text></div>
		</div>
	)
}

/**
 * Renders LLM-generated unified description with [OLD->NEW], [(removed) X], and [(added) X]
 * markers as inline colour-coded spans.
 */
export function UnifiedDiffText({ text }: { text: string }) {
	// Split on [OLD->NEW], [(removed) ...], and [(added) ...] tokens
	const parts = text.split(/(\[\s*\((?:removed|added)\)[^\]]*\]|\[[^\]]*?->[^\]]*?\])/gi)
	return (
		<p className="text-sm leading-relaxed whitespace-pre-wrap">
			{parts.map((part, i) => {
				const changeMatch = part.match(/^\[([^\]]*?)->([^\]]*?)\]$/)
				if (changeMatch) {
					const [, from, to] = changeMatch
					return (
						<span key={i} className="inline-flex items-baseline gap-0.5 font-medium">
							<span className="text-red-600 dark:text-red-400 line-through"><Text>{from}</Text></span>
							<span className="text-muted-foreground text-[10px]">→</span>
							<span className="text-green-600 dark:text-green-400"><Text>{to}</Text></span>
						</span>
					)
				}
				const removedMatch = part.match(/^\[\s*\(removed\)\s*(.*?)\]$/i)
				if (removedMatch) {
					return (
						<span
							key={i}
							className="inline-flex items-baseline gap-1 font-medium text-red-600 dark:text-red-400"
						>
							<span className="line-through"><Text>{removedMatch[1]}</Text></span>
						</span>
					)
				}
				const addedMatch = part.match(/^\[\s*\(added\)\s*(.*?)\]$/i)
				if (addedMatch) {
					return (
						<span
							key={i}
							className="inline-flex items-baseline gap-1 font-medium text-green-600 dark:text-green-400"
						>
							<span><Text>{addedMatch[1]}</Text></span>
						</span>
					)
				}
				return <span key={i}><Text>{part}</Text></span>
			})}
		</p>
	)
}

export function NumericChange({ from, to }: { from: string | null | undefined; to: string | null | undefined }) {
	return (
		<span className="inline-flex items-baseline gap-1">
			<span className="text-red-600 dark:text-red-400 line-through"><Text>{from ?? "-"}</Text></span>
			<span className="text-muted-foreground text-[10px]">→</span>
			<span className="text-green-600 dark:text-green-400 font-medium"><Text>{to ?? "-"}</Text></span>
		</span>
	)
}

export function ValueRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex gap-2 text-sm py-0.5">
			<span className="text-muted-foreground shrink-0 w-35 whitespace-nowrap"><Text>{label}</Text></span>
			<span className="leading-relaxed min-w-0 wrap-break-word">{children}</span>
		</div>
	)
}

export function TierChange({ from, to }: { from: string | null | undefined; to: string | null | undefined }) {
	return (
		<span className="text-xs">
			<span className="text-red-600 dark:text-red-400 line-through"><Text>{from ?? "-"}</Text></span>
			<span className="text-muted-foreground mx-1 text-[10px]">→</span>
			<span className="text-green-600 dark:text-green-400 font-medium"><Text>{to ?? "-"}</Text></span>
		</span>
	)
}

export function DiffRow({ field, from, to }: { field: string; from: string | null; to: string | null }) {
	return (
		<div className="grid grid-cols-[120px_1fr_auto_1fr] gap-x-2 gap-y-1 items-start py-1.5 border-b last:border-0 text-xs">
			<span className="text-muted-foreground font-medium pt-0.5 shrink-0"><Text>{field}</Text></span>
			<div
				className={cn(
					"rounded px-2 py-1 whitespace-pre-wrap wrap-break-word min-w-0",
					from === null ? "text-muted-foreground italic" : "bg-red-500/10 text-red-700 dark:text-red-400",
				)}
			>
				<Text>{from ?? "-"}</Text>
			</div>
			<ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 mt-1.5" />
			<div
				className={cn(
					"rounded px-2 py-1 whitespace-pre-wrap wrap-break-word min-w-0",
					to === null ? "text-muted-foreground italic" : "bg-green-500/10 text-green-700 dark:text-green-400",
				)}
			>
				<Text>{to ?? "-"}</Text>
			</div>
		</div>
	)
}

export function ChangeGroup({ label, items }: { label: string; items: FieldChange[] }) {
	return (
		<div className="mb-3 last:mb-0">
			<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1"><Text>{label}</Text></div>
			<div className="space-y-0">
				{items.map((item, i) => (
					<DiffRow key={i} field={item.field} from={item.from} to={item.to} />
				))}
			</div>
		</div>
	)
}

export function SectionAccordion({
	title,
	count,
	defaultOpen = false,
	children,
}: {
	title: string
	count: number
	defaultOpen?: boolean
	children: ReactNode
}) {
	const [open, setOpen] = useState(defaultOpen)
	return (
		<Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg overflow-hidden">
			<CollapsibleTrigger className="flex items-center gap-2 w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors">
				<ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", !open && "-rotate-90")} />
				<span className="font-semibold text-sm"><Text>{title}</Text></span>
				<Badge variant="secondary" className="ml-auto text-xs">
					{count}
				</Badge>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="border-t px-4 py-3">{children}</div>
			</CollapsibleContent>
		</Collapsible>
	)
}
