import keys from "./message-keys.json"
import type { Dictionary } from "./locales"

export type Messages = Record<string, string>
export const messageKeys: Record<string, string> = keys

/** Adapter for dynamic labels from game metadata and existing presentation helpers. */
export function presentationDictionary(messages: Messages): Dictionary {
	return Object.fromEntries(Object.entries(messageKeys)
		.filter(([, key]) => Object.hasOwn(messages, key))
		.map(([source, key]) => [source, messages[key]]))
}
