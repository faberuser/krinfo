import { ChangeGroup } from "./diff-primitives"
import type { HeroChangeSection, FieldChange } from "@/app/stats/types"

export function FallbackDiff({ heroChanges }: { heroChanges: HeroChangeSection[] }) {
	const groups: { label: string; items: FieldChange[] }[] = []
	for (const change of heroChanges) {
		if (change.section === "skills")
			groups.push({ label: `Skill ${change.skillSlot}: ${change.skillName}`, items: change.items })
		else if (change.section === "books")
			groups.push({ label: `Books - Skill ${change.bookSlot}: ${change.skillName}`, items: change.items })
		else if (change.section === "perks-t3")
			groups.push({ label: `Perks T3 - Slot ${change.slot}`, items: change.items })
		else if (change.section === "perks-t5") groups.push({ label: "Perks T5", items: change.items })
		else if (change.section === "uw") groups.push({ label: `Unique Weapon: ${change.uwName}`, items: change.items })
		else if (change.section === "uts")
			groups.push({ label: `UT ${change.utSlot}: ${change.utName}`, items: change.items })
		else if (change.section === "sw") groups.push({ label: "Soul Weapon", items: change.items })
	}
	return (
		<div className="space-y-3">
			{groups.map((group, i) => (
				<ChangeGroup key={i} label={group.label} items={group.items} />
			))}
		</div>
	)
}
