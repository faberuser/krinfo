import Image from "@/components/next-image"
import { DiffText, NumericChange, ValueRow, TierChange } from "./diff-primitives"
import type { HeroComparison } from "@/app/stats/types"

function HeroIcon({ src, alt, size = 24 }: { src: string; alt: string; size?: number }) {
	return (
		<Image
			src={src}
			alt={alt}
			width={size}
			height={size}
			className="rounded shrink-0 object-contain"
			onError={(e) => {
				;(e.currentTarget as HTMLImageElement).style.display = "none"
			}}
		/>
	)
}

export function ComparisonContent({ comparison }: { comparison: HeroComparison }) {
	const sections: React.ReactNode[] = []
	const heroAssetBase = `/kingsraid-data/assets/heroes/${comparison.heroName}`

	// Skills
	for (const [slot, skillData] of Object.entries(comparison.skills)) {
		if (!skillData.hasChanges) continue
		sections.push(
			<div key={`skill-${slot}`} className="border rounded-md p-3 space-y-1">
				<div className="flex items-center gap-2 font-medium text-sm mb-2">
					<HeroIcon src={`${heroAssetBase}/skills/${slot}.png`} alt={`Skill ${slot}`} />
					<span>
						Skill {slot}
						{skillData.name ? (
							<>
								:
								<span className="text-red-600 dark:text-red-400 line-through ml-1">
									{skillData.name.from}
								</span>
								<span className="text-muted-foreground mx-1 text-[10px]">→</span>
								<span className="text-green-600 dark:text-green-400">{skillData.name.to}</span>
							</>
						) : null}
					</span>
				</div>
				{skillData.cooldown && (
					<ValueRow label="Cooldown">
						<NumericChange from={skillData.cooldown.from} to={skillData.cooldown.to} />
					</ValueRow>
				)}
				{skillData.mana_cost && (
					<ValueRow label="Mana Cost">
						<NumericChange from={skillData.mana_cost.from} to={skillData.mana_cost.to} />
					</ValueRow>
				)}
				{skillData.description && (
					<ValueRow label="Description">
						<DiffText diff={skillData.description} />
					</ValueRow>
				)}
			</div>,
		)
	}

	// Books
	for (const [slot, bookData] of Object.entries(comparison.books)) {
		if (!bookData.hasChanges) continue
		sections.push(
			<div key={`book-${slot}`} className="border rounded-md p-3 space-y-1">
				<div className="flex items-center gap-2 font-medium text-sm mb-2">
					<HeroIcon src={`${heroAssetBase}/skills/${slot}.png`} alt={`Skill ${slot}`} />
					<span>
						Books - Skill {slot}: {bookData.skillName}
					</span>
				</div>
				{bookData.II && (
					<ValueRow label="Rank II">
						<DiffText diff={bookData.II} />
					</ValueRow>
				)}
				{bookData.III && (
					<ValueRow label="Rank III">
						<DiffText diff={bookData.III} />
					</ValueRow>
				)}
				{bookData.IV && (
					<ValueRow label="Rank IV">
						<DiffText diff={bookData.IV} />
					</ValueRow>
				)}
			</div>,
		)
	}

	// Perks T3
	for (const [slot, perkData] of Object.entries(comparison.perks_t3)) {
		if (!perkData.hasChanges) continue
		sections.push(
			<div key={`t3-${slot}`} className="border rounded-md p-3 space-y-1">
				<div className="flex items-center gap-2 font-medium text-sm mb-2">
					{perkData.light && (
						<HeroIcon src={`${heroAssetBase}/perks/s${slot}l.png`} alt={`T3 Skill ${slot} Light`} />
					)}
					{perkData.dark && (
						<HeroIcon src={`${heroAssetBase}/perks/s${slot}d.png`} alt={`T3 Skill ${slot} Dark`} />
					)}
					<span>T3 Perk - Skill {slot}</span>
				</div>
				{perkData.light && (
					<ValueRow label="Light">
						<DiffText diff={perkData.light} />
					</ValueRow>
				)}
				{perkData.dark && (
					<ValueRow label="Dark">
						<DiffText diff={perkData.dark} />
					</ValueRow>
				)}
			</div>,
		)
	}

	// Perks T5
	if (comparison.perks_t5?.hasChanges) {
		sections.push(
			<div key="t5" className="border rounded-md p-3 space-y-1">
				<div className="flex items-center gap-2 font-medium text-sm mb-2">
					{comparison.perks_t5.light && <HeroIcon src={`${heroAssetBase}/perks/light.png`} alt="T5 Light" />}
					{comparison.perks_t5.dark && <HeroIcon src={`${heroAssetBase}/perks/dark.png`} alt="T5 Dark" />}
					<span>T5 Perk</span>
				</div>
				{comparison.perks_t5.light && (
					<ValueRow label="Light">
						<DiffText diff={comparison.perks_t5.light} />
					</ValueRow>
				)}
				{comparison.perks_t5.dark && (
					<ValueRow label="Dark">
						<DiffText diff={comparison.perks_t5.dark} />
					</ValueRow>
				)}
			</div>,
		)
	}

	// UW
	if (comparison.uw?.hasChanges) {
		sections.push(
			<div key="uw" className="border rounded-md p-3 space-y-1">
				<div className="flex items-center gap-2 font-medium text-sm mb-2">
					<HeroIcon src={`${heroAssetBase}/uw.png`} alt="Unique Weapon" />
					<span>Unique Weapon</span>
				</div>
				{comparison.uw.description && (
					<ValueRow label="Description">
						<DiffText diff={comparison.uw.description} />
					</ValueRow>
				)}
				{Object.entries(comparison.uw.values).map(([param, val]) => (
					<ValueRow key={param} label={`{${param}}`}>
						<TierChange from={val.from} to={val.to} />
					</ValueRow>
				))}
			</div>,
		)
	}

	// UTs
	for (const [slot, utData] of Object.entries(comparison.uts)) {
		if (!utData.hasChanges) continue
		sections.push(
			<div key={`ut-${slot}`} className="border rounded-md p-3 space-y-1">
				<div className="flex items-center gap-2 font-medium text-sm mb-2">
					<HeroIcon src={`${heroAssetBase}/ut/${slot}.png`} alt={`UT ${slot}`} />
					<span>
						UT {slot}: {utData.name}
					</span>
				</div>
				{utData.description && (
					<ValueRow label="Description">
						<DiffText diff={utData.description} />
					</ValueRow>
				)}
				{Object.entries(utData.values).map(([param, val]) => (
					<ValueRow key={param} label={`{${param}}`}>
						<TierChange from={val.from} to={val.to} />
					</ValueRow>
				))}
			</div>,
		)
	}

	// SW
	if (comparison.sw?.hasChanges) {
		sections.push(
			<div key="sw" className="border rounded-md p-3 space-y-1">
				<div className="flex items-center gap-2 font-medium text-sm mb-2">
					<HeroIcon src={`${heroAssetBase}/sw.png`} alt="Soul Weapon" />
					<span>Soul Weapon</span>
				</div>
				{comparison.sw.cooldown && (
					<ValueRow label="Cooldown">
						<NumericChange from={comparison.sw.cooldown.from} to={comparison.sw.cooldown.to} />
					</ValueRow>
				)}
				{comparison.sw.uses && (
					<ValueRow label="Uses">
						<NumericChange from={comparison.sw.uses.from} to={comparison.sw.uses.to} />
					</ValueRow>
				)}
				{comparison.sw.description && (
					<ValueRow label="Description">
						<DiffText diff={comparison.sw.description} />
					</ValueRow>
				)}
				{Object.entries(comparison.sw.advancement).map(([key, diff]) => (
					<ValueRow key={key} label={`Advancement ${key}`}>
						<DiffText diff={diff} />
					</ValueRow>
				))}
			</div>,
		)
	}

	if (sections.length === 0)
		return <div className="text-sm text-muted-foreground">No detailed changes available.</div>
	return <div className="space-y-3">{sections}</div>
}
