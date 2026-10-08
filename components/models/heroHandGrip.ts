import { AnimationClip, AnimationMixer, Matrix4, Object3D, Quaternion, Vector3 } from "three"

interface GripPose {
	position: Vector3
	rotation?: Quaternion
}

// Copy only the socket and hand's ancestor chains. Animation analysis must not
// sample the live model, interfere with a playing mixer, or clone its meshes.
function copyRig(model: Object3D, hand: Object3D, socket: Object3D) {
	const copies = new Map<Object3D, Object3D>()
	function copy(node: Object3D): Object3D {
		let result = copies.get(node)
		if (!result) {
			result = node.clone(false)
			copies.set(node, result)
			if (node !== model && node.parent) copy(node.parent).add(result)
		}
		return result
	}
	return { hand: copy(hand), socket: copy(socket), model: copy(model), nodes: copies }
}

function createHandGrip(model: Object3D, hand: Object3D, authoredSocket: Object3D) {
	const rig = copyRig(model, hand, authoredSocket)
	const analysisMixer = new AnimationMixer(rig.model)
	const transformTracks = new Set(Array.from(rig.nodes.keys()).flatMap((node) =>
		["position", "quaternion", "scale"].map((property) => `${node.name}.${property}`),
	))
	const poses = new Map<AnimationClip, GripPose>()
	const analyzed = new Set<AnimationClip>()
	const localMatrix = new Matrix4()
	const position = new Vector3()
	const rotation = new Quaternion()
	const scale = new Vector3()
	const socket = new Object3D()
	socket.name = `${authoredSocket.name}_Grip`
	// Scale the tolerance to the rig's forearm, rather than assuming asset units.
	const gripRadius = hand.position.length() * 0.75
	const angularTolerance = Math.PI / 9

	function readLocal(handNode: Object3D, socketNode: Object3D) {
		handNode.updateWorldMatrix(true, false)
		socketNode.updateWorldMatrix(true, false)
		localMatrix.copy(handNode.matrixWorld).invert().multiply(socketNode.matrixWorld)
		localMatrix.decompose(position, rotation, scale)
	}
	readLocal(hand, authoredSocket)
	localMatrix.decompose(socket.position, socket.quaternion, socket.scale)
	hand.add(socket)

	return {
		socket,
		authoredSocket,
		prepare(clip: AnimationClip) {
			if (analyzed.has(clip)) return
			analyzed.add(clip)
			const socketTracks = clip.tracks.filter((track) =>
				track.name === `${authoredSocket.name}.position` || track.name === `${authoredSocket.name}.quaternion`,
			)
			if (!socketTracks.length || gripRadius === 0 || clip.duration <= 0) return

			const sampleClip = new AnimationClip(clip.name, clip.duration, clip.tracks.filter((track) => transformTracks.has(track.name)))
			const action = analysisMixer.clipAction(sampleClip).play()
			analysisMixer.setTime(0)
			readLocal(rig.hand, rig.socket)
			const gripPosition = position.clone()
			const gripRotation = rotation.clone()
			let held = gripPosition.length() <= gripRadius
			let fixedRotation = true
			// Include authored socket keys as well as intervening frames, so a short
			// release or spin cannot be mistaken for a rigid grip.
			const times = new Set<number>([0])
			const frames = Math.min(120, Math.max(40, Math.ceil(clip.duration * 30)))
			for (let i = 1; i <= frames; i++) times.add(clip.duration * i / (frames + 1))
			for (const track of socketTracks) {
				for (const time of track.times) if (time < clip.duration) times.add(time)
			}
			try {
				for (const time of Array.from(times).sort((a, b) => a - b)) {
					analysisMixer.setTime(time)
					readLocal(rig.hand, rig.socket)
					if (position.distanceTo(gripPosition) > gripRadius) { held = false; break }
					if (rotation.angleTo(gripRotation) > angularTolerance) fixedRotation = false
				}
				if (held) poses.set(clip, { position: gripPosition, ...(fixedRotation ? { rotation: gripRotation } : {}) })
			} finally {
				action.stop()
				analysisMixer.uncacheClip(sampleClip)
			}
		},
		update(mixer: AnimationMixer) {
			readLocal(hand, authoredSocket)
			socket.position.copy(position)
			socket.quaternion.copy(rotation)
			socket.scale.copy(scale)
			let positionWeight = 0
			let rotationWeight = 0
			for (const [clip, pose] of poses) {
				const action = mixer.existingAction(clip)
				if (!action?.isScheduled() || !action.enabled) continue
				const weight = action.getEffectiveWeight()
				positionWeight += weight
				if (pose.rotation) rotationWeight += weight
			}
			let positionTotal = Math.max(0, 1 - positionWeight)
			let rotationTotal = Math.max(0, 1 - rotationWeight)
			// Blend each clip's own grip pose, including outgoing, paused and clamped
			// actions. Independent motion and visibility scales stay authored.
			for (const [clip, pose] of poses) {
				const action = mixer.existingAction(clip)
				if (!action?.isScheduled() || !action.enabled) continue
				const weight = action.getEffectiveWeight()
				if (weight <= 0) continue
				positionTotal += weight
				socket.position.lerp(pose.position, weight / positionTotal)
				if (pose.rotation) {
					rotationTotal += weight
					socket.quaternion.slerp(pose.rotation, weight / rotationTotal)
				}
			}
		},
	}
}

export function createHeroHandGrips(model: Object3D) {
	const nodes = new Map<string, Object3D>()
	model.traverse((node) => nodes.set(node.name.replace(/[_ .]/g, "").toLowerCase(), node))
	function create(side: "l" | "r") {
		const socket = nodes.get(`pointhand${side}`)
		const hand = nodes.get(`bip001${side}hand`)
		if (!socket || !hand) return undefined
		// Sockets already parented to the hand naturally follow its interpolation.
		for (let parent = socket.parent; parent; parent = parent.parent) if (parent === hand) return undefined
		return createHandGrip(model, hand, socket)
	}
	const left = create("l")
	const right = create("r")
	if (!left && !right) return undefined
	return {
		left: left?.socket,
		right: right?.socket,
		resolveSocket(socket: Object3D) {
			return left?.authoredSocket === socket ? left.socket : right?.authoredSocket === socket ? right.socket : socket
		},
		prepare(clip: AnimationClip) { left?.prepare(clip); right?.prepare(clip) },
		update(mixer: AnimationMixer) { left?.update(mixer); right?.update(mixer) },
	}
}
