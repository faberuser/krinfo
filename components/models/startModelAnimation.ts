import { LoopOnce, type AnimationAction } from "three"

const fadeDuration = 0.3
const fadeStarts = new WeakMap<AnimationAction, number>()

// Parts arrive separately, but their animation clocks must follow the body.
export function startModelAnimation(
	action: AnimationAction,
	reference?: AnimationAction,
	fadeIn = true,
) {
	const mixer = action.getMixer()
	action.reset().setEffectiveWeight(1)
	fadeStarts.delete(action)

	if (reference) {
		mixer.time = reference.getMixer().time
		const duration = action.getClip().duration
		action.time = action.loop === LoopOnce
			? Math.min(reference.time, duration)
			: duration > 0 ? reference.time % duration : 0
		action.paused = reference.paused
		action.timeScale = reference.timeScale
	}

	const fadeStart = reference ? fadeStarts.get(reference) : fadeIn ? mixer.time : undefined
	if (fadeStart !== undefined && mixer.time < fadeStart + fadeDuration) {
		// Schedule the same fade without rewinding or resampling existing actions.
		const currentTime = mixer.time
		mixer.time = fadeStart
		action.fadeIn(fadeDuration)
		mixer.time = currentTime
		fadeStarts.set(action, fadeStart)
	}

	action.play()
}
