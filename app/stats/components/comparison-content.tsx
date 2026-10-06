"use client"

import { useMemo } from "react"
import { useTranslation } from "@/components/i18n/language-provider"
import { displayValue, fieldValue, pathParts, STAT_NAMES, type EntityKind } from "@/lib/stats/comparison"
import { diffText } from "@/lib/stats/text-diff"

function ChangedText({ from, to }: { from: unknown; to: unknown }) {
	const { locale } = useTranslation()
	const a = displayValue(from), b = displayValue(to)
	const parts = useMemo(() => diffText(a, b, locale), [a, b, locale])
	return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{parts.map((part, index) =>
		part.kind === "removed" ? <del key={index} className="text-red-600 dark:text-red-400 bg-red-500/10">{part.text}</del>
			: part.kind === "added" ? <ins key={index} className="text-green-700 dark:text-green-400 bg-green-500/10 no-underline font-medium">{part.text}</ins>
				: <span key={index}>{part.text}</span>)}</p>
}

export function ComparisonContent({ kind, paths, from, to, fromLabel, toLabel }: {
	kind: EntityKind; paths: string[]; from: unknown; to: unknown; fromLabel: string; toLabel: string
}) {
	const { t } = useTranslation()
	const groups = new Map<string, string[]>()
	for (const path of paths) {
		const parts = pathParts(path)
		const count = kind === "classes" ? 3 : ["skills", "books", "uts", "perks"].includes(parts[0]) ? (parts[0] === "perks" && parts[1] === "t3" ? 3 : 2) : 1
		const group = parts.slice(0, count).map(part => part.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")
		groups.set(group, [...(groups.get(group) ?? []), path])
	}
	const localizedName = (parts: string[]) => {
		const path = parts.map(part => part.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")
		return displayValue(fieldValue(to, path) ?? fieldValue(from, path))
	}
	const title = (path: string) => {
		const p = pathParts(path)
		if (kind === "classes") return `${p[1].toUpperCase()} · ${localizedName(["perkNames", p[2]]) === "—" ? p[2] : localizedName(["perkNames", p[2]])}`
		if (kind === "runes") return t(p[0] === "stats" ? "Stats" : "Grade")
		if (p[0] === "skills" || p[0] === "books") return `${t(p[0] === "skills" ? "Skill" : "Books - Skill")} ${p[1]} · ${localizedName(["skills", p[1], "name"])}`
		if (p[0] === "perks") return `${p[1].toUpperCase()} · ${t("Perks")}${p[1] === "t3" ? ` ${p[2]}` : ""}`
		return `${t(p[0] === "uw" ? "Unique Weapon" : p[0] === "uts" ? "Unique Treasures" : "Soul Weapon")}${p[0] === "uts" ? ` ${p[1]}` : ""}`
	}
	const label = (path: string) => {
		const p = pathParts(path), last = p[p.length - 1]
		if (kind === "classes") return t("Description")
		if (kind === "runes") return t(STAT_NAMES[last] ?? (last === "grade" ? "Grade" : last))
		if (p.includes("descriptionByStar")) return `${t("Description")} · ★${last}`
		if (p.includes("value")) return `{${p[p.length - 2]}} · ★${last}`
		if (p.includes("advancement")) return `${t("Advancements")} ${last}`
		if (p[0] === "books") return t(`Rank ${last}`)
		if (p[0] === "perks") return t(p[p.length - 2] === "light" ? "Light" : "Dark")
		return t(({ name: "Name", cost: "Mana Cost", cooldown: "Cooldown", description: "Description", uses: "Uses", requirement: "Requirement" } as Record<string, string>)[last] ?? last)
	}
	return <div className="space-y-4">
		<p className="text-xs text-muted-foreground">{fromLabel} → {toLabel}</p>
		{[...groups.entries()].map(([key, fields]) => <section key={key} className="border rounded-md p-3 space-y-3">
			<h3 className="font-semibold text-sm">{title(fields[0])}</h3>
			{fields.map(path => <div key={path} className="space-y-1">
				<div className="text-xs text-muted-foreground">{label(path)}</div>
				<ChangedText from={fieldValue(from, path)} to={fieldValue(to, path)} />
			</div>)}
		</section>)}
	</div>
}
