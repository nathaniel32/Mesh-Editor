import * as THREE from 'three';

export function ensureUVAttribute(geometry) {
    if (!geometry.attributes.uv) {
        const positions = geometry.attributes.position;
        const uvs = new Float32Array(positions.count * 2);
        
        for (let i = 0; i < positions.count; i++) {
            uvs[i * 2] = (positions.getX(i) + 1) * 0.5;
            uvs[i * 2 + 1] = (positions.getY(i) + 1) * 0.5;
        }
        
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
    return geometry;
}