"use client"

import { Text, useTranslation } from "@/components/i18n/language-provider"
import { Children, cloneElement, isValidElement, useId, useState, type ReactNode } from "react"
import { renderColoredText } from "@/lib/i18n/colored-text"
import { getEnhancementDescription, type EnhancementValues } from "@/lib/gear-enhancement"

interface GearEnhancementProps {
	name: string
	description: string
	values?: EnhancementValues
	fieldKey?: string
}

export default function GearEnhancement({
	name,
	description,
	values,
	fieldKey,
}: GearEnhancementProps) {
	const { t, field } = useTranslation()
	const [level, setLevel] = useState("0")
	const groupName = useId()
	const hasValues = values && Object.keys(values).length > 0
	const { text: currentDescription, highlights } = getEnhancementDescription(
		description,
		values,
		level,
	)
	// Parse colors first so enhancement highlights also work inside colored text.
	const highlightValues = (nodes: ReactNode): ReactNode =>
		Children.map(nodes, (node) => {
			if (typeof node === "string") {
				return node.split(/(\{enhancement:\d+\})/g).map((part, index) => {
					const highlightIndex = /^\{enhancement:(\d+)\}$/.exec(part)?.[1]
					const value = highlightIndex === undefined ? undefined : highlights[Number(highlightIndex)]
					if (value === undefined) return part
					return (
						<mark
							key={index}
							className="rounded bg-amber-100 px-1 font-bold tabular-nums text-amber-950 dark:bg-amber-400/20 dark:text-amber-200"
						>
							<Text>{value}</Text>
						</mark>
					)
				})
			}
			if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
				return cloneElement(node, undefined, highlightValues(node.props.children))
			}
			return node
		})

	return (
		<div className="mb-3 space-y-3">
			{hasValues && (
				<fieldset>
					<legend className="mb-2 text-sm font-medium text-muted-foreground">
						<Text messageKey="uiEnhancement" />
						<span className="sr-only">
							{" "}
							<Text messageKey="uiFor_10c22bcf" suffix=" " />
							<Text>{name}</Text>
						</span>
					</legend>
					<div className="flex flex-wrap gap-1">
						{[0, 1, 2, 3, 4, 5].map((star) => (
							<label key={star} className="cursor-pointer">
								<input
									type="radio"
									name={groupName}
									value={star}
									checked={level === String(star)}
									onChange={(event) => setLevel(event.target.value)}
									aria-label={`${star} stars`}
									className="peer sr-only"
								/>
								<span className="flex h-9 min-w-10 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:hover:bg-primary/90 peer-checked:hover:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
									{star}★
								</span>
							</label>
						))}
					</div>
				</fieldset>
			)}
			<div aria-live="polite" aria-atomic="true">
				{highlightValues(
					renderColoredText(fieldKey ? field(currentDescription, fieldKey) : t(currentDescription)),
				)}
			</div>
		</div>
	)
}
