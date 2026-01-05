import * as THREE from 'three';

export function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    
    context.beginPath();
    context.arc(16, 16, 14, 0, 2 * Math.PI);
    context.fillStyle = 'white';
    context.fill();
    
    return new THREE.CanvasTexture(canvas);
}