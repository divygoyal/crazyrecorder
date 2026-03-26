const MIN_PREVIEW_RENDER_RESOLUTION = 2;
const MAX_PREVIEW_RENDER_RESOLUTION = 3;
const ACTIVE_MOTION_BLUR_THRESHOLD = 0.01;

export function getPreviewRendererResolution(devicePixelRatio?: number): number {
	const safeDevicePixelRatio =
		typeof devicePixelRatio === "number" &&
		Number.isFinite(devicePixelRatio) &&
		devicePixelRatio > 0
			? devicePixelRatio
			: 1;

	return Math.min(
		MAX_PREVIEW_RENDER_RESOLUTION,
		Math.max(safeDevicePixelRatio, MIN_PREVIEW_RENDER_RESOLUTION),
	);
}

export function hasActiveMotionBlur(motionBlurAmount?: number): boolean {
	return (
		typeof motionBlurAmount === "number" &&
		Number.isFinite(motionBlurAmount) &&
		motionBlurAmount > ACTIVE_MOTION_BLUR_THRESHOLD
	);
}
