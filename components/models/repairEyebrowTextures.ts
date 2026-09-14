import { Mesh, MeshBasicMaterial, type Object3D, type Texture } from "three"

// Body exports can omit the hair material's map on their facial meshes.
// Use only the current costume's loaded hair, never another hero/costume.
export function repairEyebrowTextures(bodies: readonly Object3D[], hairModels: readonly Object3D[]) {
	const namedTextures = new Map<string, Texture>()
	const hairTextures = new Map<string, Texture>()
	for (const hair of hairModels) hair.traverse((child) => {
		if (!(child instanceof Mesh)) return
		for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
			if (!(material instanceof MeshBasicMaterial) || !material.map || !/hair/i.test(material.name)) continue
			namedTextures.set(material.name, material.map)
			if (!/(?:^|_)(?:AC|Effect)(?:_|$)/i.test(material.name)) {
				hairTextures.set(material.map.name || material.map.uuid, material.map)
			}
		}
	})
	const fallback = hairTextures.size === 1 ? [...hairTextures.values()][0] : undefined
	for (const body of bodies) body.traverse((child) => {
		if (!(child instanceof Mesh) || !/facial/i.test(child.name)) return
		for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
			if (!(material instanceof MeshBasicMaterial) || material.map || !/hair/i.test(material.name)) continue
			const texture = namedTextures.get(material.name) ?? fallback
			if (!texture) continue
			material.map = texture
			material.color.set(0xffffff)
			material.needsUpdate = true
		}
	})
}
