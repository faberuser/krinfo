import type { Object3D, SkinnedMesh } from "three"

export function bindHeroSkeletons(model: Object3D, recalculateBoneInverses = false) {
	model.updateMatrixWorld(true)
	model.traverse((child) => {
		const mesh = child as SkinnedMesh
		if (!mesh.isSkinnedMesh || !mesh.skeleton) return

		// AssetStudio meshes need their world transform as the bind matrix, but
		// their exported bone inverses contain per-mesh facial offsets. Omitting
		// the matrix makes bind() recalculate those inverses and detaches faces.
		// Recalculate only for explicitly configured weapon rigs with bad inverses.
		mesh.bind(mesh.skeleton, recalculateBoneInverses ? undefined : mesh.matrixWorld)
	})
}
