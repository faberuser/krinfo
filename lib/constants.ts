export const DATA_VERSIONS = ["cbt-phase-2", "cbt-phase-1", "ccbt", "sprk", "legacy"] as const
export type DataVersion = (typeof DATA_VERSIONS)[number]

// Shared hero class definitions used across pages
export const HERO_CLASSES = [
	{ value: "all", name: "All", icon: "All" },
	{ value: "knight", name: "Knight", icon: "/kingsraid-data/assets/classes/knight.png" },
	{ value: "warrior", name: "Warrior", icon: "/kingsraid-data/assets/classes/warrior.png" },
	{ value: "archer", name: "Archer", icon: "/kingsraid-data/assets/classes/archer.png" },
	{ value: "mechanic", name: "Mechanic", icon: "/kingsraid-data/assets/classes/mechanic.png" },
	{ value: "wizard", name: "Wizard", icon: "/kingsraid-data/assets/classes/wizard.png" },
	{ value: "assassin", name: "Assassin", icon: "/kingsraid-data/assets/classes/assassin.png" },
	{ value: "priest", name: "Priest", icon: "/kingsraid-data/assets/classes/priest.png" },
] as const
