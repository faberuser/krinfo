"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { type Dictionary, type Locale, isLocale, translate } from "@/lib/i18n/locales"
import { NextIntlClientProvider, useTranslations } from "next-intl"
import { presentationDictionary, type Messages } from "@/lib/i18n/messages"
import { LOCALE_COOKIE, preferredLocale } from "@/lib/i18n/locale-preference"
import { loadMessages } from "@/lib/i18n/load-messages"
import englishMessages from "@/messages/en.json"
import type { DataVersion } from "@/lib/constants"
import type { HeroData } from "@/model/Hero"
import type { BossData } from "@/model/Boss"
import type { ArtifactData } from "@/model/Artifact"

const EMPTY: Dictionary = {}
const STORAGE_KEY = "krinfo-language"
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
const dictionaries = new Map<string, Promise<unknown>>()

function loadDictionary<T>(url: string): Promise<T> {
	let pending = dictionaries.get(url)
	if (!pending) {
		pending = fetch(`${basePath}${url}`).then(async (response) => {
			if (!response.ok) throw new Error(`Translation request failed: ${response.status}`)
			return await response.json() as Dictionary
		}).catch((error) => {
			dictionaries.delete(url)
			throw error
		})
		dictionaries.set(url, pending)
	}
	return pending as Promise<T>
}

function useDictionary<T = Dictionary>(url: string | null) {
	const [loaded, setLoaded] = useState<{ url: string; data: T } | null>(null)
	const [failed, setFailed] = useState<string | null>(null)
	useEffect(() => {
		if (!url) return
		let active = true
		loadDictionary<T>(url).then((data) => {
			if (active) setLoaded({ url, data })
		}).catch(() => {
			if (active) setFailed(url)
		})
		return () => { active = false }
	}, [url])
	return {
		data: url && loaded?.url === url ? loaded.data : EMPTY as T,
		loading: Boolean(url && loaded?.url !== url && failed !== url),
		error: Boolean(url && failed === url && loaded?.url !== url),
	}
}

const LanguageContext = createContext({
	locale: "en" as Locale,
	setLocale: (() => {}) as (locale: Locale) => void,
	ui: EMPTY,
	loading: false,
	error: false,
})
type HeroIndex = Record<string, Pick<HeroData["profile"], "name" | "title"> & { id: string }>
const HeroIndexContext = createContext<HeroIndex>({})
interface ClassRecord {
	perks: { t1?: Record<string, string>; t2?: Record<string, string> }
	perkNames: Record<string, string>
}
interface SharedRecords {
	classes?: Record<string, ClassRecord>
	artifacts?: ArtifactData[]
	bosses?: Record<string, BossData["profile"]>
}
const SharedRecordsContext = createContext<SharedRecords>({})
const GameContext = createContext({ data: EMPTY, version: null as DataVersion | null, loading: false, error: false })

function LoadingBoundary({ loading, children }: { loading: boolean; children: ReactNode }) {
	return <>
		{loading && <div role="status" aria-label="Loading" className="flex min-h-24 items-center justify-center"><span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>}
		<div style={{ display: loading ? "none" : "contents" }} aria-hidden={loading || undefined}>{children}</div>
	</>
}

export function LanguageProvider({ children, initialLocale, initialMessages, restorePreference, staticExport }: {
	children: ReactNode; initialLocale: Locale; initialMessages: Messages; restorePreference: boolean; staticExport: boolean
}) {
	const [state, setState] = useState({ locale: initialLocale, messages: initialMessages })
	const [ready, setReady] = useState(!restorePreference)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(false)
	const request = useRef(0)
	const persist = useCallback((locale: Locale) => {
		document.cookie = `${LOCALE_COOKIE}=${locale}; Path=${basePath || "/"}; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`
		try { localStorage.setItem(STORAGE_KEY, locale) } catch { /* Storage may be unavailable. */ }
	}, [])
	const select = useCallback(async (locale: Locale) => {
		const id = ++request.current
		setLoading(true)
		setError(false)
		try {
			const messages = locale === initialLocale ? initialMessages : await loadMessages(locale)
			if (id !== request.current) return
			setState({ locale, messages })
			persist(locale)
		} catch {
			if (id === request.current) {
				setState({ locale: "en", messages: englishMessages })
				setError(true)
			}
		} finally {
			if (id === request.current) { setReady(true); setLoading(false) }
		}
	}, [initialLocale, initialMessages, persist])
	useEffect(() => {
		if (restorePreference) {
			const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))?.split("=")[1]
			let saved: string | null = null
			try { saved = localStorage.getItem(STORAGE_KEY) } catch { /* Storage may be unavailable. */ }
			const locale = isLocale(cookie) ? cookie : isLocale(saved) ? saved : staticExport ? preferredLocale(navigator.languages) : initialLocale
			void select(locale)
		}
		const onStorage = (event: StorageEvent) => {
			if (event.key === STORAGE_KEY && isLocale(event.newValue)) void select(event.newValue)
		}
		window.addEventListener("storage", onStorage)
		return () => { window.removeEventListener("storage", onStorage) }
	}, [restorePreference, staticExport, initialLocale, select])
	useEffect(() => { document.documentElement.lang = state.locale }, [state.locale])
	const setLocale = useCallback((locale: Locale) => { if (isLocale(locale)) void select(locale) }, [select])
	const ui = useMemo(() => presentationDictionary(state.messages), [state.messages])
	const value = useMemo(() => ({ locale: state.locale, setLocale, ui, loading, error }), [state.locale, setLocale, ui, loading, error])
	return <NextIntlClientProvider locale={state.locale} messages={state.messages} timeZone="UTC">
		<LanguageContext.Provider value={value}><LoadingBoundary loading={!ready || loading}>{children}</LoadingBoundary></LanguageContext.Provider>
	</NextIntlClientProvider>
}

export function GameLanguageScope({ version, children }: { version: DataVersion; children: ReactNode }) {
	const { locale } = useContext(LanguageContext)
	const index = useDictionary<HeroIndex>(locale !== "en"
		? `/kingsraid-data/table-data/${version}/${locale}/hero-index.json` : null)
	const shared = useDictionary<SharedRecords>(locale !== "en" ? `/kingsraid-data/table-data/${version}/${locale}/shared.json` : null)
	const value = useMemo(() => ({ data: EMPTY, version, loading: shared.loading || index.loading, error: shared.error || index.error }), [version, shared.loading, shared.error, index.loading, index.error])
	return <GameContext.Provider value={value}><SharedRecordsContext.Provider value={shared.data}><HeroIndexContext.Provider value={index.data}>
		{value.error && <p role="status" className="text-sm text-muted-foreground"><Text messageKey="uiTranslationUnavailableShowingEnglish" /></p>}
		<LoadingBoundary loading={value.loading}>{children}</LoadingBoundary>
	</HeroIndexContext.Provider></SharedRecordsContext.Provider></GameContext.Provider>
}

export function useSharedRecords() { return useContext(SharedRecordsContext) }

export function useLocalizedArtifacts(artifacts: ArtifactData[]) {
	const shared = useSharedRecords()
	return useMemo(() => {
		if (!shared.artifacts) return artifacts
		const records = new Map(shared.artifacts.map((record) => [record.id, record]))
		return artifacts.map((artifact) => records.get(artifact.id) ?? artifact)
	}, [shared.artifacts, artifacts])
}

/** Resolve list/selector profiles from the active locale's index. */
export function useLocalizedHeroes<T extends { id: string; profile: { name: string } }>(heroes: T[]): T[] {
	const index = useHeroIndex()
	return useMemo(() => heroes.map(hero => ({ ...hero, profile: { ...hero.profile, name: index[hero.id]?.name ?? hero.profile.name } })), [heroes, index])
}

/** Perk keys remain the canonical IDs used by saved teams and icon paths. */
export function PerkName({ name }: { name: string }) {
	const shared = useSharedRecords()
	const displayName = Object.values(shared.classes ?? {}).find((record) => Object.hasOwn(record.perkNames, name))?.perkNames[name]
	return <Text>{displayName ?? name}</Text>
}

export function BossLanguageScope({ boss, children }: { boss: BossData; children: (boss: BossData) => ReactNode }) {
	const { locale } = useContext(LanguageContext)
	const game = useContext(GameContext)
	const record = useDictionary<BossData>(game.version
		? `/kingsraid-data/table-data/${game.version}/${locale}/bosses/${encodeURIComponent(boss.id)}.json` : null)
	return <>
		{record.error && <p role="status" className="text-sm text-muted-foreground"><Text messageKey="uiTranslationUnavailableShowingEnglish" /></p>}
		<LoadingBoundary loading={record.loading}>{children(record.data?.id === boss.id ? record.data : boss)}</LoadingBoundary>
	</>
}

/** Lookup by canonical hero ID, never by an English description. */
export function useHeroProfile(name: string) {
	const index = useContext(HeroIndexContext)
	return Object.hasOwn(index, name) ? index[name] : undefined
}

export function useHeroIndex() { return useContext(HeroIndexContext) }

/** Fetch only the current entity; comparison panels inherit their own version. */
export function HeroLanguageScope({ hero, children }: { hero: HeroData; children: (hero: HeroData) => ReactNode }) {
	const { locale } = useContext(LanguageContext)
	const game = useContext(GameContext)
	const resolved = Boolean(game.version)
	const record = useDictionary<HeroData>(game.version
		? `/kingsraid-data/table-data/${game.version}/${locale}/heroes/${encodeURIComponent(hero.id)}.json` : null)
	const localized = record.data?.id === hero.id ? record.data : hero
	const value = useMemo(() => resolved
		? { ...game, loading: game.loading || record.loading, error: game.error || record.error }
		: game, [resolved, game, record.loading, record.error])
	return <GameContext.Provider value={value}>
		
			{resolved && record.error && <p role="status" className="text-sm text-muted-foreground"><Text messageKey="uiTranslationUnavailableShowingEnglish" /></p>}
			<LoadingBoundary loading={record.loading}>{children(resolved ? localized : hero)}</LoadingBoundary>
		
	</GameContext.Provider>
}

export function useTranslation() {
	const language = useContext(LanguageContext)
	const game = useContext(GameContext)
	const intl = useTranslations()
	const t = useCallback((text: string) => {
		// Named UI messages use next-intl. Dynamic game labels retain exact matching.
		if (text.startsWith("ui") && intl.has(text)) return intl(text)
		return translate(text, language.ui)
	}, [intl, language.ui])
	// Field keys remain accepted by existing callers; records already contain translations.
	const field: (text: string, key?: string) => string = t
	return { locale: language.locale, setLocale: language.setLocale, t, field,
		loading: language.loading || game.loading, error: language.error || game.error }
}

/** Translate presentation only: entity keys, URLs, assets and saved teams stay stable. */
export function Text({ children, fieldKey, messageKey, prefix = "", suffix = "" }: { children?: ReactNode; fieldKey?: string; messageKey?: string; prefix?: string; suffix?: string }) {
	const { t, field } = useTranslation()
	if (messageKey) return `${prefix}${t(messageKey)}${suffix}`
	return typeof children === "string" ? fieldKey ? field(children, fieldKey) : t(children) : children
}

export function LocalizedDate({ date }: { date: string }) {
	const { locale } = useTranslation()
	return <time dateTime={date}>{new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(new Date(date))}</time>
}
