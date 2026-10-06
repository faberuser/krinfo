export interface OffsetConfig {
	position?: { x?: number; y?: number; z?: number }
	rotation?: { x?: number; y?: number; z?: number }
	scale?: { x?: number; y?: number; z?: number }
}

export interface BossOffsetConfig {
	scene?: OffsetConfig
	scenes?: Record<string, OffsetConfig>
	model?: OffsetConfig
	recalculateBoneInverses?: boolean
	weapon_default?: boolean
	weapon?: OffsetConfig // Optional weapon-specific transforms
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

/**
 * Load boss offset configuration from offset.json
 * @param bossName - The name of the boss (e.g., "Xanadus")
 * @returns The boss offset configuration or null if not found
 */
export async function loadBossOffsetConfig(bossName: string): Promise<BossOffsetConfig | null> {
	const configPath = `${basePath}/kingsraid-models/models/bosses/${bossName}/offset.json`

	try {
		const response = await fetch(configPath)
		if (response.ok) {
			return await response.json()
		}
	} catch {
		// Silently ignore if offset.json doesn't exist
		console.debug(`No offset config found at ${configPath}`)
	}

	return null
}
