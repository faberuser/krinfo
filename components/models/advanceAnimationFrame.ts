import type { AnimationAction, AnimationMixer } from "three"

export interface SequencePlayback {
	action: AnimationAction
	advance: () => void
}

// Split a frame at body-clip boundaries so every mixer switches together,
// then carry the unused frame time into the next segment.
export function advanceAnimationFrame(
	mixers: Iterable<AnimationMixer>,
	delta: number,
	getSequence: () => SequencePlayback | null,
) {
	const activeMixers = Array.from(mixers)
	let remaining = delta
	while (remaining > 0) {
		const sequence = getSequence()
		const action = sequence?.action
		const speed = action ? action.getEffectiveTimeScale() * action.getMixer().timeScale : 0
		const duration = action?.getClip().duration ?? 0
		const untilEnd = action && speed > 0 && duration > 0
			? Math.max(0, (duration - action.time) / speed)
			: Infinity
		const step = Math.min(remaining, untilEnd)
		for (const mixer of activeMixers) mixer.update(step)
		remaining -= step
		if (!sequence || untilEnd > step) break
		sequence.advance()
		// Evaluate the new pose even when the boundary exactly ends this frame.
		for (const mixer of activeMixers) mixer.update(0)
		if (getSequence() === sequence) break
	}
}
