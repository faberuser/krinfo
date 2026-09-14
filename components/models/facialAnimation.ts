import { FBXLoader } from "three-stdlib"
import { Float32BufferAttribute, Mesh, type AnimationAction, type Object3D, type Group } from "three"

export interface FacialCurve {
	timeArray: number[]
	valueArray: number[]
	inTangentArray: (number | string)[]
	outTangentArray: (number | string)[]
	preWrapMode?: number
	postWrapMode?: number
}

export interface FacialExpression {
	Type: "Static" | "KeyAnimation"
	StaticShapeList?: string[]
	KeyAnimationDic?: { Key: { FacialName: string; BlendShapeName: string }; Value: FacialCurve }[]
}

export interface FacialModelData {
	parts: { target: string; source: string; path?: string }[]
	animations: Record<string, FacialExpression | null>
}

export interface FacialMetadata {
	version: number
	models: Record<string, FacialModelData>
	animations: Record<string, FacialExpression | null>
}

// Unity AnimationCurve uses cubic Hermite interpolation, with infinite tangents
// representing steps. Its time here is normalized animation time, not seconds.
export function evaluateFacialCurve(curve: FacialCurve, time: number): number {
	const times = curve.timeArray
	const values = curve.valueArray
	if (!times?.length) return 0
	const last = times.length - 1
	const start = times[0],
		end = times[last],
		duration = end - start
	if (time < start || time > end) {
		const mode = time < start ? curve.preWrapMode : curve.postWrapMode
		if (duration > 0 && (mode === 2 || mode === 4)) {
			const period = duration * (mode === 4 ? 2 : 1)
			const offset = (((time - start) % period) + period) % period
			time = start + (offset > duration ? period - offset : offset)
		}
	}
	if (time <= start) return values[0]
	if (time >= end) return values[last]
	let i = 0
	while (i < last - 1 && time >= times[i + 1]) i++
	const span = times[i + 1] - times[i]
	const t = (time - times[i]) / span
	const outSlope = Number(curve.outTangentArray[i])
	const inSlope = Number(curve.inTangentArray[i + 1])
	if (!Number.isFinite(outSlope) || !Number.isFinite(inSlope)) return values[i]
	return (
		(2 * t ** 3 - 3 * t ** 2 + 1) * values[i] +
		(t ** 3 - 2 * t ** 2 + t) * span * outSlope +
		(-2 * t ** 3 + 3 * t ** 2) * values[i + 1] +
		(t ** 3 - t ** 2) * span * inSlope
	)
}

// Keep the costume's geometry, skin weights, bind pose and materials. Only
// FBX triangulation can reorder vertices between exports. Match by position and
// UV, then remap deltas rather than replacing the costume's skinning geometry.
export function installFacialMorphs(target: Mesh, source: Mesh): boolean {
	if (!source.geometry.morphAttributes.position?.length) return false
	const a = target.geometry.attributes.position
	const b = source.geometry.attributes.position
	const uvA = target.geometry.attributes.uv,
		uvB = source.geometry.attributes.uv
	if (a.count !== b.count || !uvA || !uvB) return false
	const key = (position: typeof a, uv: typeof uvA, i: number) =>
		[position.getX(i), position.getY(i), position.getZ(i), uv.getX(i), uv.getY(i)]
			.map((value) => Math.round(value * 100000))
			.join(",")
	const vertices = new Map<string, number>()
	for (let i = 0; i < b.count; i++) vertices.set(key(b, uvB, i), i)
	const indices: number[] = []
	for (let i = 0; i < a.count; i++) {
		const index = vertices.get(key(a, uvA, i))
		if (index === undefined) return false
		indices.push(index)
	}
	const geometry = target.geometry.clone()
	geometry.morphAttributes = Object.fromEntries(
		Object.entries(source.geometry.morphAttributes).map(([key, attributes]) => [
			key,
			attributes.map((attribute) => {
				const values = new Float32Array(a.count * attribute.itemSize)
				indices.forEach((sourceIndex, targetIndex) => {
					for (let j = 0; j < attribute.itemSize; j++)
						values[targetIndex * attribute.itemSize + j] =
							attribute.array[sourceIndex * attribute.itemSize + j]
				})
				const remapped = new Float32BufferAttribute(values, attribute.itemSize)
				remapped.name = attribute.name
				return remapped
			}),
		]),
	)
	geometry.morphTargetsRelative = source.geometry.morphTargetsRelative
	target.geometry = geometry
	target.updateMorphTargets()
	return true
}

export function createFacialPlayer(model: Object3D, data: FacialModelData, metadata: FacialMetadata) {
	const parts = data.parts.map((part) => model.getObjectByName(part.target) as Mesh | undefined)
	const actions = new Map<AnimationAction, FacialExpression>()
	return {
		play(action: AnimationAction) {
			const name = action.getClip().name
			const expression = Object.hasOwn(data.animations, name) ? data.animations[name] : metadata.animations[name]
			if (expression) actions.set(action, expression)
		},
		update() {
			for (const mesh of parts) mesh?.morphTargetInfluences?.fill(0)
			const add = (mesh: Mesh | undefined, name: string, weight: number) => {
				const index = mesh?.morphTargetDictionary?.[name]
				if (index !== undefined && mesh?.morphTargetInfluences) mesh.morphTargetInfluences[index] += weight
			}
			for (const [action, expression] of actions) {
				const weight = action.getEffectiveWeight()
				if (!action.enabled || weight === 0) {
					actions.delete(action)
					continue
				}
				if (expression.Type === "Static") {
					expression.StaticShapeList?.forEach((name, i) => add(parts[i], name, weight))
				} else {
					const frame = action.time / action.getClip().duration
					for (const { Key, Value } of expression.KeyAnimationDic || []) {
						const index = data.parts.findIndex(
							(part) => part.target === Key.FacialName || part.source === Key.FacialName,
						)
						add(parts[index], Key.BlendShapeName, weight * evaluateFacialCurve(Value, frame))
					}
				}
			}
		},
	}
}

export async function loadFacialAnimation(model: Group, modelPath: string, metadataUrl: string, modelsUrl: string) {
	const response = await fetch(metadataUrl)
	if (!response.ok) throw new Error(`Facial metadata request failed: ${response.status}`)
	const metadata: FacialMetadata = await response.json()
	if (metadata.version !== 1) throw new Error("Unsupported facial metadata version")
	const name = modelPath
		.split("/")
		.pop()!
		.replace(/\.fbx$/i, "")
	const data = metadata.models[name]
	if (!data) return
	const paths = [...new Set(data.parts.map((part) => part.path).filter((path): path is string => !!path))]
	const sources = new Map(
		await Promise.all(
			paths.map(async (path) => {
				const source = await new FBXLoader().loadAsync(`${modelsUrl}/${path}`)
				return [path, source] as const
			}),
		),
	)
	try {
		for (const part of data.parts) {
			const target = model.getObjectByName(part.target)
			const source = part.path ? sources.get(part.path)?.getObjectByName(part.source) : undefined
			if (target instanceof Mesh && source instanceof Mesh && !installFacialMorphs(target, source)) {
				console.warn(`Facial mesh topology differs: ${name}/${part.target}; retaining costume geometry`)
			}
		}
		return createFacialPlayer(model, data, metadata)
	} finally {
		for (const source of sources.values()) {
			source.traverse((child) => {
				if (!(child instanceof Mesh)) return
				child.geometry.dispose()
				for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
					if ("map" in material) (material.map as { dispose(): void } | null)?.dispose()
					material.dispose()
				}
			})
		}
	}
}
