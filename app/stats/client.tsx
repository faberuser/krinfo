"use client"

import { useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Text, useTranslation } from "@/components/i18n/language-provider"
import { DATA_VERSIONS, type DataVersion } from "@/lib/constants"
import { compareEntities, type ComparisonIndex, type EntityKind } from "@/lib/stats/comparison"
import { dataUrl, useResources } from "@/lib/stats/use-resources"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EntityList, ResourceStatus } from "./components/entity-list"

export default function StatsClient({ versionLabels }: { versionLabels: Record<string, string> }) {
	const [from, setFrom] = useState<DataVersion>("legacy")
	const [to, setTo] = useState<DataVersion>(DATA_VERSIONS[0])
	const indexes = useResources<ComparisonIndex>([dataUrl(from, "comparison-index.json"), dataUrl(to, "comparison-index.json")])
	const { t } = useTranslation()
	const changes = useMemo(() => {
		if (!indexes.data || indexes.data.some(index => index.schemaVersion !== 1)) return null
		return Object.fromEntries((["heroes", "classes", "runes"] as const).map(kind => [kind,
			compareEntities(indexes.data![0][kind], indexes.data![1][kind])])) as Record<EntityKind, ReturnType<typeof compareEntities>>
	}, [indexes.data])
	const invalidSchema = Boolean(indexes.data && !changes)
	return <div className="space-y-4">
		<h1 className="text-xl font-bold"><Text messageKey="uiVersionStats" /></h1>
		<div className="border rounded-lg bg-muted/30 p-4 space-y-3">
			<div className="flex flex-wrap items-center gap-3">
				{([{ value: from, set: setFrom, label: "From" }, { value: to, set: setTo, label: "To" }] as const).map((selector, i) =>
					<div key={selector.label} className="flex items-center gap-3">
						{i === 1 && <ArrowRight className="size-4 mt-5 text-muted-foreground" />}
						<div className="space-y-1">
							<label htmlFor={`stats-${selector.label}`} className="text-xs font-medium"><Text>{selector.label}</Text></label>
							<Select value={selector.value} onValueChange={value => selector.set(value as DataVersion)}>
								<SelectTrigger id={`stats-${selector.label}`} className="w-40"><SelectValue /></SelectTrigger>
								<SelectContent>{DATA_VERSIONS.map(version => <SelectItem key={version} value={version}>{versionLabels[version]}</SelectItem>)}</SelectContent>
							</Select>
						</div>
					</div>)}
			</div>
			{changes && from !== to && <div className="flex gap-2 flex-wrap">
				<Badge variant="outline">{changes.heroes.filter(change => change.status === "changed").length} <Text messageKey="uiHeroChanges" /></Badge>
				{(["added", "removed"] as const).map(status => {
					const count = changes.heroes.filter(change => change.status === status).length
					return count > 0 && <Badge key={status} variant="outline">{count} <Text messageKey={status === "added" ? "uiAddedHeroes" : "uiRemovedHeroes"} /></Badge>
				})}
				<Badge variant="outline">{changes.classes.reduce((count, change) => count + change.paths.length, 0) + changes.runes.length} <Text messageKey="uiGeneralChanges" /></Badge>
			</div>}
		</div>
		{from === to ? <p className="text-muted-foreground text-center py-12"><Text messageKey="uiEachStepMustBeADifferentVersionThanTheOneBeforeIt" /></p>
			: indexes.error || indexes.loading || invalidSchema ? <ResourceStatus error={indexes.error || invalidSchema} retry={indexes.retry} />
				: changes && <Tabs defaultValue="heroes">
					<TabsList>
						<TabsTrigger value="heroes">{t("Heroes")} ({changes.heroes.length})</TabsTrigger>
						<TabsTrigger value="classes">{t("Class Perks")} ({changes.classes.reduce((count, change) => count + change.paths.length, 0)})</TabsTrigger>
						<TabsTrigger value="runes">{t("Runes")} ({changes.runes.length})</TabsTrigger>
					</TabsList>
					{(["heroes", "classes", "runes"] as const).map(kind => <TabsContent key={kind} value={kind} className="space-y-4 mt-4">
						<EntityList kind={kind} changes={changes[kind]} from={from} to={to} versionLabels={versionLabels} />
					</TabsContent>)}
				</Tabs>}
	</div>
}
