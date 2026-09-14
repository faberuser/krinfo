import type { Object3D } from "three"
import type { ModelFile } from "@/model/Hero_Model"
import { weaponConfigData, dualWeaponHeroNames, defaultPosHeroes, weaponFallback } from "./modelConfig"
import { weaponTypes } from "./types"

interface HeroWeaponConfig {
	recalculateBoneInverses?: boolean
	rotation?: { x: number; y: number; z: number }
	hand?: "left" | "right"
	socket?: string
	attachment?: "scene"
	animationNaming?: "body" | "facialWeapon" | "weaponPen" | "weaponRight"
}

interface WeaponRule {
	types?: string[]
	folders?: string[]
	config: Omit<HeroWeaponConfig, "rotation"> & {
		rotationDegrees?: { x: number; y: number; z: number }
	}
}

interface HeroWeaponRules {
	rules: WeaponRule[]
	sheathedWeaponBone?: string
}

// Compile once: the viewer reads these rules during animation and attachment.
const heroRules = Object.fromEntries(
	Object.entries(weaponConfigData as Record<string, HeroWeaponRules>).map(([hero, entry]) => [
		hero,
		{
			...entry,
			rules: entry.rules.map(({ config, ...rule }) => {
				const { rotationDegrees, ...settings } = config
				const rotation = rotationDegrees && {
					x: (rotationDegrees.x * Math.PI) / 180,
					y: (rotationDegrees.y * Math.PI) / 180,
					z: (rotationDegrees.z * Math.PI) / 180,
				}
				return { ...rule, config: { ...settings, ...(rotation ? { rotation } : {}) } }
			}),
		},
	]),
)

export function getHeroWeaponConfig(modelFile: ModelFile): HeroWeaponConfig | undefined {
	if (!weaponTypes.includes(modelFile.type)) return undefined
	const [hero, folder] = modelFile.path.split("/")
	// Specific costume rules precede general rules in the JSON.
	return heroRules[hero]?.rules.find(
		(rule) =>
			(!rule.types || rule.types.includes(modelFile.type)) && (!rule.folders || rule.folders.includes(folder)),
	)?.config
}

const sheathedWeaponBones = Object.fromEntries(
	Object.entries(heroRules).flatMap(([hero, entry]) =>
		entry.sheathedWeaponBone ? [[hero, entry.sheathedWeaponBone]] : [],
	),
)

export function createWeaponVisibilitySync(modelFiles: ModelFile[], loadedModels: ReadonlyMap<string, Object3D>) {
	const swordFile = modelFiles.find(
		(file) =>
			Object.hasOwn(sheathedWeaponBones, file.path.split("/")[0]) &&
			(file.type === "weapona" || file.type === "weapon_a"),
	)
	if (!swordFile) return null
	const hero = swordFile.path.split("/")[0]
	const sheathFile = modelFiles.find(
		(file) => file.path.startsWith(`${hero}/`) && (file.type === "weaponb" || file.type === "weapon_b"),
	)
	if (!sheathFile) return null
	const sword = loadedModels.get(swordFile.name)
	const sheath = loadedModels.get(sheathFile.name)
	const embeddedSword = sheath?.getObjectByName(sheathedWeaponBones[hero])
	if (!sword || !sheath || !embeddedSword) return null

	return (visibleModels: ReadonlySet<string>, attachedWeapons: ReadonlySet<string>) => {
		if (!attachedWeapons.has(swordFile.name)) return
		// Weapon B includes the sheathed sword grip. Clips shrink its bone
		// below 0.01 when the separate hand-held sword should take over.
		const embeddedSwordShown =
			visibleModels.has(sheathFile.name) &&
			sheath.visible &&
			Math.max(
				Math.abs(embeddedSword.scale.x),
				Math.abs(embeddedSword.scale.y),
				Math.abs(embeddedSword.scale.z),
			) > 0.01
		sword.visible = visibleModels.has(swordFile.name) && !embeddedSwordShown
	}
}

const dualWeaponHeroes = new Set(dualWeaponHeroNames)
const defaultPositionHeroes = new Set(defaultPosHeroes)

export function usesDefaultWeaponPosition(mappedHeroName: string): boolean {
	return defaultPositionHeroes.has(mappedHeroName)
}

export function getWeaponFallbackFolders(
	mappedHeroName: string,
	costumeName: string,
	models: readonly ModelFile[],
): readonly string[] {
	// Preserve the existing fallback policy: named accessory parts do not
	// block a costume's configured replacement weapon folders.
	if (models.some((model) => ["weapon", "weapon01", "weapon02"].includes(model.type))) return []
	const fallback = weaponFallback[`Hero_${mappedHeroName}_${costumeName}`]
	return fallback ? (Array.isArray(fallback) ? fallback : [fallback]) : []
}

export function expandDualWeapons(heroName: string, models: ModelFile[]): ModelFile[] {
	if (!dualWeaponHeroes.has(heroName)) return models
	// Most Fluss costumes already export distinct left/right swords.
	if (models.some((model) => model.type === "weapon_l" || model.type === "weapon_r")) return models
	const weapon = models.find((model) => model.type === "weapon")
	if (!weapon) return models

	// These heroes reuse a single rigid mesh in both hands. Separate model
	// entries give each instance its own transform and Parts toggle.
	return models.flatMap((model) =>
		model === weapon
			? [
					{ ...model, name: `${model.name}_r`, type: "weapon_r" as const },
					{ ...model, name: `${model.name}_l`, type: "weapon_l" as const },
				]
			: [model],
	)
}
