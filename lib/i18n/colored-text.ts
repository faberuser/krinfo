import React from "react"

export function renderColoredText(text: string): React.ReactNode[] {
	// Regular expression to match [COLOR]text[-] pattern
	const colorPattern = /\[([0-9a-fA-F]{6})\](.*?)\[-\]/g
	const parts: React.ReactNode[] = []
	let lastIndex = 0
	let match
	let keyCounter = 0

	while ((match = colorPattern.exec(text)) !== null) {
		// Add text before the colored section (with newlines converted to <br />)
		if (match.index > lastIndex) {
			const plainText = text.substring(lastIndex, match.index)
			parts.push(...splitTextWithNewlines(plainText, keyCounter))
			keyCounter += plainText.split("\n").length
		}

		// Add colored text with theme-aware styling
		const originalColor = `#${match[1]}`
		const coloredText = match[2]
		parts.push(
			React.createElement(
				"span",
				{
					key: `color-${keyCounter++}`,
					style: { color: originalColor },
					className: "skill-colored-text",
				},
				coloredText,
			),
		)

		lastIndex = match.index + match[0].length
	}

	// Add remaining text after the last match (with newlines converted to <br />)
	if (lastIndex < text.length) {
		const plainText = text.substring(lastIndex)
		parts.push(...splitTextWithNewlines(plainText, keyCounter))
	}

	// If no matches found, still process newlines
	if (parts.length === 0) {
		parts.push(...splitTextWithNewlines(text, 0))
	}

	return parts
}

/**
 * Helper function to split text by newlines and insert <br /> elements
 */
function splitTextWithNewlines(text: string, startKey: number): React.ReactNode[] {
	const lines = text.split("\n")
	const result: React.ReactNode[] = []

	lines.forEach((line, index) => {
		if (line) {
			result.push(line)
		}
		// Add <br /> after each line except the last one
		if (index < lines.length - 1) {
			result.push(React.createElement("br", { key: `br-${startKey}-${index}` }))
		}
	})

	return result
}
