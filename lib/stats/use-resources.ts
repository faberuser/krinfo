"use client"

import { useCallback, useEffect, useState } from "react"

const cache = new Map<string, Promise<unknown>>()
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

export function loadResource<T>(url: string): Promise<T> {
	let pending = cache.get(url)
	if (!pending) {
		pending = fetch(`${basePath}${url}`).then(response => {
			if (!response.ok) throw new Error(`Data request failed: ${response.status}`)
			return response.json()
		}).catch(error => { cache.delete(url); throw error })
		cache.set(url, pending)
	}
	return pending as Promise<T>
}

/** URL-keyed state prevents earlier language/version responses from appearing. */
export function useResources<T>(urls: string[]) {
	const key = JSON.stringify(urls)
	const [attempt, setAttempt] = useState(0)
	const [result, setResult] = useState<{ key: string; attempt: number; data?: T[]; error?: boolean } | null>(null)
	useEffect(() => {
		let active = true
		const paths = JSON.parse(key) as string[]
		Promise.all(paths.map(url => loadResource<T>(url))).then(data => {
			if (active) setResult({ key, attempt, data })
		}).catch(() => { if (active) setResult({ key, attempt, error: true }) })
		return () => { active = false }
	}, [key, attempt])
	const current = result?.key === key && result.attempt === attempt ? result : null
	const retry = useCallback(() => setAttempt(value => value + 1), [])
	return { data: urls.length ? current?.data : [], previousData: result?.data,
		error: Boolean(current?.error), loading: Boolean(urls.length && !current), retry }
}

export function dataUrl(version: string, file: string, locale?: string): string {
	return `/kingsraid-data/table-data/${encodeURIComponent(version)}/${locale ? `${encodeURIComponent(locale)}/` : ""}${file}`
}
