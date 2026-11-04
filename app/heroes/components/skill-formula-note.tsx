"use client"

import { useId, useState } from "react"
import { useDictionary, useGameVersion, useTranslation } from "@/components/i18n/language-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import english from "@/public/kingsraid-data/table-data/sprk/en/skill-formula.json"
import { level_scaling } from "@/public/kingsraid-data/table-data/sprk/formula-scaling.json"

const levelScaling: Record<string, number> = level_scaling["5"]

export default function SkillFormulaNote() {
	const version = useGameVersion()
	const { locale } = useTranslation()
	const sliderId = useId()
	const inputId = useId()
	const resultId = useId()
	const [skillLevel, setSkillLevel] = useState(100)
	const [levelInput, setLevelInput] = useState("100")
	function selectLevel(level: number) {
		setSkillLevel(level)
		setLevelInput(String(level))
	}
	function commitLevelInput() {
		const number = levelInput.trim() === "" ? skillLevel : Number(levelInput)
		selectLevel(Number.isFinite(number) ? Math.max(1, Math.min(100, Math.round(number))) : skillLevel)
	}
	const { data } = useDictionary<typeof english>(
		version === "sprk" && locale !== "en" ? `/kingsraid-data/table-data/sprk/${locale}/skill-formula.json` : null,
	)
	if (version !== "sprk") return null
	const notes = data.entries ? data : english
	return (
		<Card>
			<CardContent className="space-y-3">
				<div className="space-y-2 text-sm">
					{notes.entries.map((entry) => (
						<div key={entry.id} className="flex items-center gap-2">
							{entry.id === "level-scaling" ? (
								<output
									id={resultId}
									htmlFor={`${sliderId} ${inputId}`}
									aria-live="polite"
									className="tabular-nums"
								>
									<span className="font-medium">
										{entry.label}({skillLevel})
									</span>{" "}
									= {levelScaling[skillLevel]}
								</output>
							) : entry.id === "skill-level" ? (
								<label htmlFor={sliderId} className="shrink-0 font-medium">
									{entry.label}:
								</label>
							) : (
								<span>
									<span className="font-medium">{entry.label}:</span>{" "}
									<span className="tabular-nums">{"value" in entry ? entry.value : ""}</span>
								</span>
							)}
							{entry.id === "skill-level" && (
								<>
									<input
										id={sliderId}
										type="range"
										min={1}
										max={100}
										step={1}
										value={skillLevel}
										onChange={(event) => selectLevel(Number(event.target.value))}
										aria-describedby={resultId}
										className="h-6 w-full min-w-0 max-w-xs cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
									/>
									<Input
										id={inputId}
										type="number"
										min={1}
										max={100}
										step={1}
										inputMode="numeric"
										value={levelInput}
										aria-label={entry.label}
										aria-describedby={resultId}
										onChange={(event) => {
											const text = event.target.value
											setLevelInput(text)
											const level = Number(text)
											if (text !== "" && Number.isInteger(level) && level >= 1 && level <= 100)
												setSkillLevel(level)
										}}
										onBlur={commitLevelInput}
										onKeyDown={(event) => {
											if (event.key === "Enter") {
												event.preventDefault()
												event.currentTarget.blur()
											}
										}}
										className="h-8 w-16 shrink-0 px-2 text-sm tabular-nums"
									/>
								</>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
