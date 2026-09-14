// Shared runtime configuration. No model assets are required to compile the app.
export let nameDiff: Readonly<Record<string, string>> = {}
export let hairFallback: Readonly<Record<string, string>> = {}
export let weaponFallback: Readonly<Record<string, string | string[]>> = {}
export let defaultPosHeroes: readonly string[] = []
export let dualWeaponHeroNames: readonly string[] = []
export let weaponConfigData: Record<string, unknown> = {}
export let modelTextureOverrides: Readonly<Record<string, Readonly<Record<string, string>>>> = {}
export let modelTransformOverrides: Readonly<Record<string, {
	rotationDegrees?: { x: number; y: number; z: number }
	hiddenMeshes?: string[]
}>> = {}

type ConfigReader = (file: string) => Promise<unknown>
let pending: Promise<void> | undefined

export function loadModelConfig(read?: ConfigReader): Promise<void> {
	if (process.env.NEXT_PUBLIC_ENABLE_MODELS_VOICES !== "true") return Promise.resolve()
	if (pending) return pending
	const readJson: ConfigReader = read ?? (async (file) => {
		const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
		const response = await fetch(`${basePath}/kingsraid-models/${file}`)
		if (!response.ok) throw new Error(`Failed to load ${file}: ${response.status}`)
		return response.json()
	})
	pending = Promise.all([
		"name_diff.json", "hair_fallback.json", "weapon_fallback.json", "weapon_defaultpos.json",
		"dual_weapon_heroes.json", "hero_weapon_config.json", "model_texture_overrides.json", "model_transform_overrides.json",
	].map(readJson)).then(([names, hair, weapons, positions, dual, rules, textures, transforms]) => {
		nameDiff = names as typeof nameDiff
		hairFallback = hair as typeof hairFallback
		weaponFallback = weapons as typeof weaponFallback
		defaultPosHeroes = positions as typeof defaultPosHeroes
		dualWeaponHeroNames = dual as typeof dualWeaponHeroNames
		weaponConfigData = rules as typeof weaponConfigData
		modelTextureOverrides = textures as typeof modelTextureOverrides
		modelTransformOverrides = transforms as typeof modelTransformOverrides
	}).catch((error) => {
		pending = undefined
		throw error
	})
	return pending
}
