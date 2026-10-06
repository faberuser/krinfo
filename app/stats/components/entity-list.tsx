"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Layers, RotateCw } from "lucide-react"
import { Text, useTranslation } from "@/components/i18n/language-provider"
import Image from "@/components/next-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { dataUrl, useResources } from "@/lib/stats/use-resources"
import { STAT_NAMES, type EntityChange, type EntityKind } from "@/lib/stats/comparison"
import { compareRuneOrder } from "@/lib/stats/rune-order"
import { cn } from "@/lib/utils"
import { ComparisonContent } from "./comparison-content"

type NamedRecord = { id: string; name: string; grade?: string; stats?: Record<string, string> }
type HeroNames = Record<string, NamedRecord>

export function ResourceStatus({ error, retry }: { error: boolean; retry: () => void }) {
	const { t } = useTranslation()
	return <div role={error ? "alert" : "status"} className="flex items-center justify-center gap-3 p-8 text-muted-foreground">
		<Text messageKey={error ? "uiComparisonDataUnavailable" : "uiLoading"} />
		{error && <Button variant="outline" size="icon" onClick={retry} aria-label={t("Refresh")}><RotateCw className="size-4" /></Button>}
	</div>
}

export function EntityList({ kind, changes, from, to, versionLabels }: {
	kind: EntityKind; changes: EntityChange[]; from: string; to: string; versionLabels: Record<string, string>
}) {
	const { locale, t } = useTranslation()
	const [search, setSearch] = useState("")
	const names = useResources<HeroNames | NamedRecord[]>(kind === "classes" || !changes.length ? []
		: [dataUrl(from, kind === "heroes" ? "hero-index.json" : "runes.json", locale), dataUrl(to, kind === "heroes" ? "hero-index.json" : "runes.json", locale)])
	// Retain hidden cards while labels load so expanded state survives a locale switch.
	const nameData = names.data ?? names.previousData
	const localizedNames = useMemo(() => (nameData ?? []).map(data => Array.isArray(data)
		? Object.fromEntries(data.map(row => [row.id, row.name]))
		: Object.fromEntries(Object.entries(data).map(([id, row]) => [id, row.name]))), [nameData])
	const runeKeywords = useMemo(() => Object.fromEntries((nameData ?? []).flatMap(data => Array.isArray(data)
		? data.map(row => [row.id, [t(row.grade ?? ""), ...Object.entries(row.stats ?? {}).flatMap(([stat, value]) => [t(STAT_NAMES[stat] ?? stat), value])].join(" ")]) : [])), [nameData, t])
	const runeRecords = useMemo(() => Object.fromEntries((nameData ?? []).flatMap(data => Array.isArray(data)
		? data.map(row => [row.id, row]) : [])), [nameData])
	const label = (change: EntityChange) => kind === "classes" ? t(change.id)
		: localizedNames[1]?.[change.id] ?? localizedNames[0]?.[change.id] ?? change.id
	const q = search.toLocaleLowerCase(locale)
	const filtered = changes.filter(change => !q || [label(change), localizedNames[0]?.[change.id], change.id, runeKeywords[change.id], t(change.to?.class ?? change.from?.class ?? "")]
		.some(value => value?.toLocaleLowerCase(locale).includes(q)))
	const cards = kind === "heroes" ? filtered.filter(change => change.status === "changed") : filtered
	if (kind === "classes") {
		cards.sort((a, b) => Number(b.id === "General") - Number(a.id === "General"))
	}
	if (kind === "runes") {
		cards.sort((a, b) => compareRuneOrder(runeRecords[a.id], runeRecords[b.id]) || a.id.localeCompare(b.id))
	}
	return <>
		{(names.loading || names.error) && <ResourceStatus error={names.error} retry={names.retry} />}
		<div hidden={names.loading || names.error} className="space-y-4">
		<Input aria-label={t("uiSearch_7f553822")} placeholder={t(kind === "heroes" ? "uiSearchHeroes" : kind === "classes" ? "uiSearchClasses" : "uiSearchRuneNameGradeOrStat")}
			value={search} onChange={event => setSearch(event.target.value)} className="max-w-sm" />
		{!filtered.length && <p className="text-center text-muted-foreground py-12"><Text messageKey={!changes.length ? "uiNoChangesInThisSegment" : "uiNoResultsFound"} /></p>}
		{cards.map(change => <EntityCard key={change.id} kind={kind} change={change} name={label(change)} from={from} to={to} versionLabels={versionLabels} />)}
		{kind === "heroes" && (["added", "removed"] as const).map(status => {
			const heroes = filtered.filter(change => change.status === status)
			return heroes.length > 0 && <section key={status} className="border rounded-lg p-4 space-y-3">
				<h2 className="font-semibold text-sm">
					<Text messageKey={status === "added" ? "uiAddedHeroes" : "uiRemovedHeroes"} /> ({heroes.length})
				</h2>
				<ul className="flex flex-wrap gap-2">
					{heroes.map(hero => {
						const thumbnail = hero.to?.thumbnail ?? hero.from?.thumbnail
						return <li key={hero.id} className="inline-flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm">
							{thumbnail && <Image src={`/kingsraid-data/assets/${thumbnail}`} alt="" width={24} height={24}
								style={{ width: 24, height: 24 }} className="rounded shrink-0 object-cover" />}
							<span>{label(hero)}</span>
						</li>
					})}
				</ul>
			</section>
		})}
		</div>
	</>
}

function EntityCard({ kind, change, name, from, to, versionLabels }: {
	kind: EntityKind; change: EntityChange; name: string; from: string; to: string; versionLabels: Record<string, string>
}) {
	const [open, setOpen] = useState(false)
	const thumbnail = change.to?.thumbnail ?? change.from?.thumbnail
	return <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg overflow-hidden">
		<CollapsibleTrigger className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors">
			<ChevronDown className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")} />
			{kind === "classes" && change.id === "General"
				? <Layers className="size-8 shrink-0 text-muted-foreground" aria-hidden="true" />
				: thumbnail && <Image src={`/kingsraid-data/assets/${thumbnail}`} alt={name} width={32} height={32}
					style={{ width: 32, height: 32 }} className="rounded shrink-0 object-cover" />}
			<span className="flex flex-col min-w-0">
				<span className="font-semibold text-sm">{name}</span>
				{kind === "heroes" && <span className="text-xs text-muted-foreground"><Text>{change.to?.class ?? change.from?.class}</Text></span>}
			</span>
			<Badge variant="secondary" className="ml-auto shrink-0">
				{change.status === "changed" ? <>{change.paths.length} <Text messageKey="uiChanges_d0b4ba23" /></>
					: <><Text messageKey={change.status === "added" ? "uiAddedIn" : "uiRemovedIn"} suffix=" " />{versionLabels[to]}</>}
			</Badge>
		</CollapsibleTrigger>
		<CollapsibleContent>
			{open && <EntityDetails kind={kind} change={change} from={from} to={to} versionLabels={versionLabels} />}
		</CollapsibleContent>
	</Collapsible>
}

function EntityDetails({ kind, change, from, to, versionLabels }: {
	kind: EntityKind; change: EntityChange; from: string; to: string; versionLabels: Record<string, string>
}) {
	const { locale } = useTranslation()
	const sides = [{ version: from, entry: change.from }, { version: to, entry: change.to }].filter(side => side.entry)
	const resources = useResources<unknown>(sides.map(side => dataUrl(side.version,
		kind === "runes" ? "runes.json" : `${kind}/${encodeURIComponent(side.entry!.file)}`, locale)))
	if (resources.loading || resources.error || !resources.data) return <ResourceStatus error={resources.error} retry={resources.retry} />
	const records = Object.fromEntries(sides.map((side, index) => {
		const data = resources.data![index]
		return [side.version, kind === "runes" && Array.isArray(data) ? data.find((record: NamedRecord) => record.id === change.id) : data]
	}))
	if (sides.some(side => !records[side.version])) return <ResourceStatus error retry={resources.retry} />
	return <div className="border-t p-4"><ComparisonContent kind={kind} paths={change.paths}
		from={change.from ? records[from] : null} to={change.to ? records[to] : null}
		fromLabel={versionLabels[from]} toLabel={versionLabels[to]} /></div>
}
