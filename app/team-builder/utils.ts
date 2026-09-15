import { HeroData } from "@/model/Hero"
import { TeamMember, SelectedPerks, PERK_COSTS, DEFAULT_MAX_POINTS } from "@/model/Team_Builder"

// Base64 URL-safe characters for maximum compression
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

// T1 perk order for encoding (must match General.json order)
const T1_PERKS = ["ATK Up", "HP Up", "DEF Up", "Crit Resist Up", "Monster Hunting"]

// T2 perk order by class for encoding (order matches JSON files)
const T2_PERKS: Record<string, string[]> = {
	warrior: ["Opportune Strike", "Warlike", "Offensive Guard", "Tactical Foresight", "Blood Wrath"],
	knight: ["Experienced Fighter", "Excellent Strategy", "Battle Cry", "Shield of Protection", "Swift Move"],
	assassin: ["Target Weakness", "Swift and Nimble", "Tactical Foresight", "Opportune Strike", "Vital Detection"],
	archer: ["Precision Shot", "Eagle Eye", "Mortal Wound", "Opportune Strike", "Concentration"],
	mechanic: ["Target Weakness", "Ready Cannons", "Pressure Point", "Special Bullet", "Amplified Gunpowder"],
	wizard: ["Deception", "Moral Rise", "Blessing of Mana", "Circuit Burst", "Destruction"],
	priest: ["Vengeful Curse", "Goddess Blessing", "Inner Peace", "Blessing of Mana", "Swiftness"],
}

// Bit-pack writer for compact encoding
class BitWriter {
	private bits: number[] = []

	write(value: number, numBits: number) {
		for (let i = numBits - 1; i >= 0; i--) {
			this.bits.push((value >> i) & 1)
		}
	}

	toBase64URL(): string {
		// Pad to multiple of 6 bits
		while (this.bits.length % 6 !== 0) {
			this.bits.push(0)
		}
		let result = ""
		for (let i = 0; i < this.bits.length; i += 6) {
			const val =
				(this.bits[i] << 5) |
				(this.bits[i + 1] << 4) |
				(this.bits[i + 2] << 3) |
				(this.bits[i + 3] << 2) |
				(this.bits[i + 4] << 1) |
				this.bits[i + 5]
			result += BASE64URL[val]
		}
		return result
	}
}

// Bit-pack reader for decoding
class BitReader {
	private bits: number[] = []
	private pos = 0

	constructor(base64url: string) {
		for (const char of base64url) {
			const val = BASE64URL.indexOf(char)
			if (val === -1) continue
			for (let i = 5; i >= 0; i--) {
				this.bits.push((val >> i) & 1)
			}
		}
	}

	read(numBits: number): number {
		let result = 0
		for (let i = 0; i < numBits && this.pos < this.bits.length; i++) {
			result = (result << 1) | this.bits[this.pos++]
		}
		return result
	}

	hasMore(numBits: number): boolean {
		return this.pos + numBits <= this.bits.length
	}
}

// Create empty team member
export function createEmptyMember(): TeamMember {
	return {
		hero: null,
		uw: false,
		ut: null,
		artifact: null,
		perks: {
			t1: [],
			t2: [],
			t3: [],
			t5: [],
		},
		maxPoints: DEFAULT_MAX_POINTS,
	}
}

// Calculate used points
export function calculateUsedPoints(perks: SelectedPerks): number {
	const t1Points = perks.t1.length * PERK_COSTS.t1
	const t2Points = perks.t2.length * PERK_COSTS.t2
	const t3Points = perks.t3.length * PERK_COSTS.t3
	const t5Points = perks.t5.length * PERK_COSTS.t5
	return t1Points + t2Points + t3Points + t5Points
}

import { DataVersion, DATA_VERSIONS } from "@/lib/constants"

// Version mapping for URL encoding (3 bits = 0-7)

const reversedVersions = [...DATA_VERSIONS].reverse()
const VERSION_MAP: Record<string, number> = Object.fromEntries(reversedVersions.map((v, i) => [v, i]))
const VERSION_REVERSE: Record<number, DataVersion> = Object.fromEntries(
	reversedVersions.map((v, i) => [i, v as DataVersion]),
)

// Encode team to URL-safe string (bit-packed format)
// Header: version(3) + heroCount(4) = 7 bits
// Per hero: heroIdx(7) + uw(1) + ut(3) + maxPts(2) + t1(5) + t2(5) + t3(8) + t5(2) = 33 bits
export function encodeTeam(team: TeamMember[], allHeroes: HeroData[] = [], version: string = "legacy"): string {
	const heroIndex = new Map<string, number>()
	allHeroes.forEach((h, i) => heroIndex.set(h.profile.name, i))

	const writer = new BitWriter()

	// Write version first (3 bits = 0-7)
	writer.write(VERSION_MAP[version] ?? 0, 3)

	// Write number of heroes (4 bits = 0-15, supports up to 15 heroes)
	const heroCount = team.filter((m) => m.hero !== null).length
	writer.write(heroCount, 4)

	for (const member of team) {
		if (!member.hero) continue

		const idx = heroIndex.get(member.hero.profile.name) ?? 0

		// Hero index: 7 bits (0-127)
		writer.write(idx, 7)

		// UW: 1 bit
		writer.write(member.uw ? 1 : 0, 1)

		// UT: 3 bits (0-4, where 0 = none)
		writer.write(member.ut ? parseInt(member.ut) : 0, 3)

		// MaxPoints offset: 2 bits (0=80, 1=85, 2=90, 3=95)
		writer.write(Math.floor((member.maxPoints - 80) / 5), 2)

		// T1 perks: 5 bits
		let t1Bits = 0
		member.perks.t1.forEach((perk) => {
			const i = T1_PERKS.indexOf(perk)
			if (i !== -1) t1Bits |= 1 << i
		})
		writer.write(t1Bits, 5)

		// T2 perks: 5 bits
		let t2Bits = 0
		const heroClass = member.hero.profile.class.toLowerCase()
		const classT2 = T2_PERKS[heroClass] || []
		member.perks.t2.forEach((perk) => {
			const i = classT2.indexOf(perk)
			if (i !== -1) t2Bits |= 1 << i
		})
		writer.write(t2Bits, 5)

		// T3 perks: 8 bits (2 bits per skill: 00=none, 01=light, 10=dark)
		let t3Bits = 0
		for (const p of member.perks.t3) {
			const skillIdx = parseInt(p.skill) - 1
			const typeVal = p.type === "light" ? 1 : 2
			t3Bits |= typeVal << (skillIdx * 2)
		}
		writer.write(t3Bits, 8)

		// T5 perks: 2 bits
		let t5Bits = 0
		if (member.perks.t5.includes("light")) t5Bits |= 1
		if (member.perks.t5.includes("dark")) t5Bits |= 2
		writer.write(t5Bits, 2)
	}

	return writer.toBase64URL()
}

// Decode result type
export interface DecodeResult {
	team: TeamMember[]
	version: string
}

// Extract just the version from encoded string without full decode
export function extractVersionFromEncoded(encoded: string): string | null {
	try {
		const reader = new BitReader(encoded)
		const versionNum = reader.read(3)
		return VERSION_REVERSE[versionNum] ?? "legacy"
	} catch {
		return null
	}
}

// Decode team from URL-safe string (bit-packed format)
export function decodeTeam(encoded: string, heroes: HeroData[]): DecodeResult | null {
	try {
		const reader = new BitReader(encoded)
		const team: TeamMember[] = []

		// Read version (3 bits)
		const versionNum = reader.read(3)
		const version = VERSION_REVERSE[versionNum] ?? "legacy"

		// Read hero count (4 bits)
		const heroCount = reader.read(4)

		for (let h = 0; h < heroCount; h++) {
			if (!reader.hasMore(33)) break

			// Hero index: 7 bits
			const heroIdx = reader.read(7)
			const hero = heroes[heroIdx] || null

			if (!hero) {
				team.push(createEmptyMember())
				// Still need to read remaining bits for this hero
				reader.read(26) // 33 - 7 = 26 remaining bits
				continue
			}

			// UW: 1 bit
			const uw = reader.read(1) === 1

			// UT: 3 bits
			const utVal = reader.read(3)
			const ut = utVal > 0 ? String(utVal) : null

			// MaxPoints: 2 bits
			const maxPtsOffset = reader.read(2)
			const maxPoints = 80 + maxPtsOffset * 5

			// T1: 5 bits
			const t1Bits = reader.read(5)
			const t1: string[] = []
			T1_PERKS.forEach((perk, idx) => {
				if (t1Bits & (1 << idx)) t1.push(perk)
			})

			// T2: 5 bits
			const t2Bits = reader.read(5)
			const t2: string[] = []
			const heroClass = hero.profile.class.toLowerCase()
			const classT2 = T2_PERKS[heroClass] || []
			classT2.forEach((perk, idx) => {
				if (t2Bits & (1 << idx)) t2.push(perk)
			})

			// T3: 8 bits
			const t3Bits = reader.read(8)
			const t3: { skill: string; type: "light" | "dark" }[] = []
			for (let skill = 0; skill < 4; skill++) {
				const typeVal = (t3Bits >> (skill * 2)) & 0x3
				if (typeVal === 1) t3.push({ skill: String(skill + 1), type: "light" })
				else if (typeVal === 2) t3.push({ skill: String(skill + 1), type: "dark" })
			}

			// T5: 2 bits
			const t5Bits = reader.read(2)
			const t5: ("light" | "dark")[] = []
			if (t5Bits & 1) t5.push("light")
			if (t5Bits & 2) t5.push("dark")

			team.push({
				hero,
				uw,
				ut,
				artifact: null, // Artifact is selected separately, not encoded in URL
				perks: { t1, t2, t3, t5 },
				maxPoints,
			})
		}

		return { team, version }
	} catch {
		return null
	}
}

// Encode perks to URL-safe string (bit-packed format)
export function encodePerks(perks: SelectedPerks, heroClass: string, maxPoints: number): string {
	const writer = new BitWriter()

	// MaxPoints offset: 2 bits (0=80, 1=85, 2=90, 3=95)
	writer.write(Math.floor((maxPoints - 80) / 5), 2)

	// T1 perks: 5 bits
	let t1Bits = 0
	perks.t1.forEach((perk) => {
		const i = T1_PERKS.indexOf(perk)
		if (i !== -1) t1Bits |= 1 << i
	})
	writer.write(t1Bits, 5)

	// T2 perks: 5 bits
	let t2Bits = 0
	const classT2 = T2_PERKS[heroClass.toLowerCase()] || []
	perks.t2.forEach((perk) => {
		const i = classT2.indexOf(perk)
		if (i !== -1) t2Bits |= 1 << i
	})
	writer.write(t2Bits, 5)

	// T3 perks: 8 bits (2 bits per skill: 00=none, 01=light, 10=dark)
	let t3Bits = 0
	for (const p of perks.t3) {
		const skillIdx = parseInt(p.skill) - 1
		const typeVal = p.type === "light" ? 1 : 2
		t3Bits |= typeVal << (skillIdx * 2)
	}
	writer.write(t3Bits, 8)

	// T5 perks: 2 bits
	let t5Bits = 0
	if (perks.t5.includes("light")) t5Bits |= 1
	if (perks.t5.includes("dark")) t5Bits |= 2
	writer.write(t5Bits, 2)

	return writer.toBase64URL()
}

// Decode perks from URL-safe string (bit-packed format)
export function decodePerks(encoded: string, heroClass: string): { perks: SelectedPerks; maxPoints: number } | null {
	try {
		const reader = new BitReader(encoded)

		// MaxPoints: 2 bits
		const maxPtsOffset = reader.read(2)
		const maxPoints = 80 + maxPtsOffset * 5

		// T1: 5 bits
		const t1Bits = reader.read(5)
		const t1: string[] = []
		T1_PERKS.forEach((perk, idx) => {
			if (t1Bits & (1 << idx)) t1.push(perk)
		})

		// T2: 5 bits
		const t2Bits = reader.read(5)
		const t2: string[] = []
		const classT2 = T2_PERKS[heroClass.toLowerCase()] || []
		classT2.forEach((perk, idx) => {
			if (t2Bits & (1 << idx)) t2.push(perk)
		})

		// T3: 8 bits
		const t3Bits = reader.read(8)
		const t3: { skill: string; type: "light" | "dark" }[] = []
		for (let skill = 0; skill < 4; skill++) {
			const typeVal = (t3Bits >> (skill * 2)) & 0x3
			if (typeVal === 1) t3.push({ skill: String(skill + 1), type: "light" })
			else if (typeVal === 2) t3.push({ skill: String(skill + 1), type: "dark" })
		}

		// T5: 2 bits
		const t5Bits = reader.read(2)
		const t5: ("light" | "dark")[] = []
		if (t5Bits & 1) t5.push("light")
		if (t5Bits & 2) t5.push("dark")

		return {
			perks: { t1, t2, t3, t5 },
			maxPoints,
		}
	} catch {
		return null
	}
}
