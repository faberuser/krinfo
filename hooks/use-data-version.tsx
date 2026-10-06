"use client"

import { Text } from "@/components/i18n/language-provider"
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, Fragment } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const STORAGE_KEY = "dataVersion"
const TEAM_STORAGE_KEY = "team-builder-team"

import { DATA_VERSIONS, DataVersion } from "@/lib/constants"
import descriptionData from "@/public/kingsraid-data/table-data/description.json"

// Labels for display in UI
export const DataVersionLabels: Record<DataVersion, string> = Object.fromEntries(
	DATA_VERSIONS.map((v) => [v, descriptionData.data_versions[v].label as string]),
) as Record<DataVersion, string>

// Descriptions for tooltips
export const DataVersionDescriptions: Record<DataVersion, ReactNode> = Object.fromEntries(
	DATA_VERSIONS.map((v) => {
		const desc = descriptionData.data_versions[v].description as string
		return [
			v,
			<>
				{desc.split("\n").map((line, i, arr) => (
					<Fragment key={i}>
						<Text>{line}</Text>
						{i < arr.length - 1 && <br />}
					</Fragment>
				))}
			</>,
		]
	}),
) as Record<DataVersion, ReactNode>

interface DataVersionContextType {
	version: DataVersion
	setVersion: (version: DataVersion) => void
	setVersionDirect: (version: DataVersion) => void // Bypass team check (for URL loading)
	isHydrated: boolean
}
const DataVersionContext = createContext<DataVersionContextType | undefined>(undefined)

// Check if team has any content in localStorage
function hasTeamContent(): boolean {
	if (typeof window === "undefined") return false
	try {
		const saved = localStorage.getItem(TEAM_STORAGE_KEY)
		if (!saved) return false
		const parsed = JSON.parse(saved)
		return Array.isArray(parsed) && parsed.some((member: { heroName?: string }) => member.heroName)
	} catch {
		return false
	}
}

// Clear team from localStorage
function clearTeamStorage(): void {
	if (typeof window === "undefined") return
	localStorage.removeItem(TEAM_STORAGE_KEY)
}

export function DataVersionProvider({ children }: { children: ReactNode }) {
	// Always start with the newest data version for SSR consistency
	const [version, setVersionState] = useState<DataVersion>(DATA_VERSIONS[0])
	const [mounted, setMounted] = useState(false)

	// Dialog state for team clearing confirmation
	const [dialogOpen, setDialogOpen] = useState(false)
	const [pendingVersion, setPendingVersion] = useState<DataVersion | null>(null)
	const isConfirmingRef = useRef(false)

	// Sync with localStorage after hydration
	useEffect(() => {
		// eslint-disable-next-line
		setMounted(true)
		const stored = localStorage.getItem(STORAGE_KEY) as DataVersion | "new" | "cbt"
		if (DATA_VERSIONS.includes(stored as DataVersion)) {
			setVersionState(stored as DataVersion)
		} else if (stored === "new" || stored === "cbt") {
			// Migrate old "new" or "cbt" value to the newest data version
			setVersionState(DATA_VERSIONS[0])
			localStorage.setItem(STORAGE_KEY, DATA_VERSIONS[0])
		}
	}, [])

	// setVersion that checks for team content first
	const setVersion = useCallback(
		(newVersion: DataVersion) => {
			// Skip if same version
			if (newVersion === version) return

			// Check if team has content - if so, show confirmation dialog
			if (hasTeamContent() && !isConfirmingRef.current) {
				setPendingVersion(newVersion)
				setDialogOpen(true)
				return
			}

			// No team content or confirming, just switch
			isConfirmingRef.current = false
			setVersionState(newVersion)
			localStorage.setItem(STORAGE_KEY, newVersion)
		},
		[version],
	)

	// setVersionDirect - bypass team check (for loading from shared URLs)
	const setVersionDirect = useCallback(
		(newVersion: DataVersion) => {
			if (newVersion === version) return
			setVersionState(newVersion)
			localStorage.setItem(STORAGE_KEY, newVersion)
		},
		[version],
	)

	// Handle confirmation - clear team and switch version
	const handleConfirm = useCallback(() => {
		if (pendingVersion) {
			isConfirmingRef.current = true
			clearTeamStorage()
			setVersionState(pendingVersion)
			localStorage.setItem(STORAGE_KEY, pendingVersion)
			// Dispatch custom event so team-builder can react
			window.dispatchEvent(new CustomEvent("team-cleared-by-version-switch"))
		}
		setDialogOpen(false)
		setPendingVersion(null)
	}, [pendingVersion])

	// Handle cancel - just close dialog
	const handleCancel = useCallback(() => {
		setDialogOpen(false)
		setPendingVersion(null)
	}, [])

	const value = {
		version: mounted ? version : DATA_VERSIONS[0],
		setVersion,
		setVersionDirect,
		isHydrated: mounted,
	}

	return (
		<DataVersionContext.Provider value={value}>
			{children}
			<AlertDialog open={dialogOpen} onOpenChange={(open) => !open && handleCancel()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							<Text messageKey="uiSwitchDataVersion" />
						</AlertDialogTitle>
						<AlertDialogDescription>
							<Text messageKey="uiYouHaveATeamSavedInTeamBuilderSwitchingDataVersionsWillClearYourTeamBecause" />
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancel}>
							<Text messageKey="uiCancel" />
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirm}>
							<Text messageKey="uiSwitchClearTeam" />
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</DataVersionContext.Provider>
	)
}

export function useDataVersion() {
	const context = useContext(DataVersionContext)
	if (context === undefined) {
		throw new Error("useDataVersion must be used within a DataVersionProvider")
	}
	return context
}

export function selectVersionData<T>(version: DataVersion, dataMap: Record<DataVersion, T>): T {
	return dataMap[version]
}
