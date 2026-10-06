import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"
import { GameText } from "@/components/i18n/game-text"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function capitalize(s: string) {
	if (s.length === 0) return s
	return s
		.split(" ")
		.map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
		.join(" ")
}

const CLASS_COLOR_TEXT: Record<string, string> = {
	knight: "text-blue-500",
	warrior: "text-yellow-900",
	archer: "text-green-500",
	mechanic: "text-blue-900",
	wizard: "text-red-500",
	assassin: "text-purple-500",
	priest: "text-blue-200",
}

export function classColorMapText(className: string) {
	return CLASS_COLOR_TEXT[className.toLowerCase()]
}

const CLASS_COLOR_BG: Record<string, string> = {
	knight: "bg-blue-500/10",
	warrior: "bg-yellow-900/10",
	archer: "bg-green-500/10",
	mechanic: "bg-blue-900/10",
	wizard: "bg-red-500/10",
	assassin: "bg-purple-500/10",
	priest: "bg-blue-200/10",
}

export function classColorMapBg(className: string) {
	return CLASS_COLOR_BG[className.toLowerCase()]
}

const CLASS_COLOR_BADGE: Record<string, string> = {
	knight: "bg-blue-500",
	warrior: "bg-yellow-700",
	archer: "bg-green-500",
	mechanic: "bg-blue-700",
	wizard: "bg-red-500",
	assassin: "bg-purple-500",
	priest: "bg-blue-300",
}

export function classColorMapBadge(className: string) {
	return CLASS_COLOR_BADGE[className.toLowerCase()] || "bg-gray-500"
}

/**
 * Parses text with color codes like [ffc800]text[-] and newlines, returns JSX with colored spans and line breaks
 * @param text - Text containing color codes in format [HEX_COLOR]text[-] and \n for newlines
 * @returns A localized React element that preserves the game's color tags and line breaks
 */
export function parseColoredText(text: string, fieldKey?: string): React.ReactNode[] {
	return [React.createElement(GameText, { key: fieldKey ?? text, text, fieldKey })]
}
