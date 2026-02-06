// ============================================
// VIBE DESIGN - Transform Matrix Utilities
// Handles coordinate transformations between local and world space
// ============================================

/**
 * 2D Transform Matrix represented as [a, b, c, d, tx, ty]
 * This corresponds to the matrix:
 * | a  c  tx |
 * | b  d  ty |
 * | 0  0  1  |
 * 
 * Where:
 * - a, d: scale (with rotation component)
 * - b, c: rotation/skew
 * - tx, ty: translation
 */
export type Matrix2D = [number, number, number, number, number, number];

/**
 * A point in 2D space
 */
export interface Point2D {
    x: number;
    y: number;
}

/**
 * Transform parameters for a shape
 */
export interface Transform {
    x: number;
    y: number;
    rotation: number; // in degrees
    scaleX?: number;
    scaleY?: number;
}

/**
 * Create an identity matrix
 */
export function identityMatrix(): Matrix2D {
    return [1, 0, 0, 1, 0, 0];
}

/**
 * Create a translation matrix
 */
export function translationMatrix(tx: number, ty: number): Matrix2D {
    return [1, 0, 0, 1, tx, ty];
}

/**
 * Create a rotation matrix (angle in radians)
 */
export function rotationMatrix(angleRad: number): Matrix2D {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return [cos, sin, -sin, cos, 0, 0];
}

/**
 * Create a scale matrix
 */
export function scaleMatrix(sx: number, sy: number): Matrix2D {
    return [sx, 0, 0, sy, 0, 0];
}

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
}

/**
 * Multiply two matrices: result = a * b
 */
export function multiplyMatrices(a: Matrix2D, b: Matrix2D): Matrix2D {
    return [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5],
    ];
}

/**
 * Invert a matrix
 */
export function invertMatrix(m: Matrix2D): Matrix2D {
    const det = m[0] * m[3] - m[1] * m[2];
    if (Math.abs(det) < 1e-10) {
        // Matrix is not invertible, return identity
        return identityMatrix();
    }
    const invDet = 1 / det;
    return [
        m[3] * invDet,
        -m[1] * invDet,
        -m[2] * invDet,
        m[0] * invDet,
        (m[2] * m[5] - m[3] * m[4]) * invDet,
        (m[1] * m[4] - m[0] * m[5]) * invDet,
    ];
}

/**
 * Transform a point by a matrix
 */
export function transformPoint(point: Point2D, matrix: Matrix2D): Point2D {
    return {
        x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
        y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
    };
}

/**
 * Create a combined transform matrix from position, rotation, and scale
 * Order: translate -> rotate around center -> scale
 */
export function createTransformMatrix(
    x: number,
    y: number,
    rotation: number, // degrees
    width: number,
    height: number,
    scaleX: number = 1,
    scaleY: number = 1
): Matrix2D {
    const angleRad = degreesToRadians(rotation);
    const cx = width / 2;
    const cy = height / 2;

    // Build transform: translate to position, then rotate around center
    // T(x,y) * T(cx,cy) * R(angle) * T(-cx,-cy) * S(scale)

    let result = translationMatrix(x, y);
    result = multiplyMatrices(result, translationMatrix(cx, cy));
    result = multiplyMatrices(result, rotationMatrix(angleRad));
    result = multiplyMatrices(result, translationMatrix(-cx, -cy));

    if (scaleX !== 1 || scaleY !== 1) {
        result = multiplyMatrices(result, scaleMatrix(scaleX, scaleY));
    }

    return result;
}

/**
 * Create a simple transform matrix (position + rotation only, no center offset)
 * This is for Konva-style transforms where we set position and rotation directly
 */
export function createSimpleTransformMatrix(
    x: number,
    y: number,
    rotation: number // degrees
): Matrix2D {
    const angleRad = degreesToRadians(rotation);
    let result = translationMatrix(x, y);
    result = multiplyMatrices(result, rotationMatrix(angleRad));
    return result;
}

/**
 * Get the world (absolute) matrix for a shape given its local transform and parent's world matrix
 */
export function getWorldMatrix(
    localMatrix: Matrix2D,
    parentWorldMatrix: Matrix2D | null
): Matrix2D {
    if (!parentWorldMatrix) {
        return localMatrix;
    }
    return multiplyMatrices(parentWorldMatrix, localMatrix);
}

/**
 * Convert a point from world coordinates to local coordinates
 */
export function worldToLocal(
    worldPoint: Point2D,
    worldMatrix: Matrix2D
): Point2D {
    const inverseMatrix = invertMatrix(worldMatrix);
    return transformPoint(worldPoint, inverseMatrix);
}

/**
 * Convert a point from local coordinates to world coordinates
 */
export function localToWorld(
    localPoint: Point2D,
    worldMatrix: Matrix2D
): Point2D {
    return transformPoint(localPoint, worldMatrix);
}

/**
 * Rotate a point around a center
 */
export function rotatePointAroundCenter(
    point: Point2D,
    center: Point2D,
    angleDegrees: number
): Point2D {
    const angleRad = degreesToRadians(angleDegrees);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
    };
}

/**
 * Extract position from a matrix
 */
export function getPositionFromMatrix(matrix: Matrix2D): Point2D {
    return {
        x: matrix[4],
        y: matrix[5],
    };
}

/**
 * Extract rotation (in degrees) from a matrix
 */
export function getRotationFromMatrix(matrix: Matrix2D): number {
    return radiansToDegrees(Math.atan2(matrix[1], matrix[0]));
}

/**
 * Extract scale from a matrix
 */
export function getScaleFromMatrix(matrix: Matrix2D): Point2D {
    return {
        x: Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1]),
        y: Math.sqrt(matrix[2] * matrix[2] + matrix[3] * matrix[3]),
    };
}

/**
 * Compose multiple transforms into a single matrix
 * Transforms are applied left to right (first to last)
 */
export function composeTransforms(...matrices: Matrix2D[]): Matrix2D {
    let result = identityMatrix();
    for (const matrix of matrices) {
        result = multiplyMatrices(result, matrix);
    }
    return result;
}

/**
 * Decompose a matrix into translation, rotation, and scale
 */
export function decomposeMatrix(matrix: Matrix2D): {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
} {
    const position = getPositionFromMatrix(matrix);
    const rotation = getRotationFromMatrix(matrix);
    const scale = getScaleFromMatrix(matrix);

    return {
        x: position.x,
        y: position.y,
        rotation,
        scaleX: scale.x,
        scaleY: scale.y,
    };
}

// Create a singleton instance for convenience
export const transformMatrix = {
    identity: identityMatrix,
    translation: translationMatrix,
    rotation: rotationMatrix,
    scale: scaleMatrix,
    multiply: multiplyMatrices,
    invert: invertMatrix,
    transformPoint,
    createTransform: createTransformMatrix,
    createSimpleTransform: createSimpleTransformMatrix,
    getWorldMatrix,
    worldToLocal,
    localToWorld,
    rotatePoint: rotatePointAroundCenter,
    getPosition: getPositionFromMatrix,
    getRotation: getRotationFromMatrix,
    getScale: getScaleFromMatrix,
    compose: composeTransforms,
    decompose: decomposeMatrix,
    degreesToRadians,
    radiansToDegrees,
};

export default transformMatrix;
