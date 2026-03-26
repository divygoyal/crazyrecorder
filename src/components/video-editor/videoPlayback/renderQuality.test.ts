import { describe, expect, it } from "vitest";

import {
	getPreviewRendererResolution,
	hasActiveMotionBlur,
} from "./renderQuality";

describe("renderQuality", () => {
	it("oversamples preview rendering on standard density displays", () => {
		expect(getPreviewRendererResolution(1)).toBe(2);
		expect(getPreviewRendererResolution(1.25)).toBe(2);
		expect(getPreviewRendererResolution(1.5)).toBe(2);
	});

	it("caps preview rendering resolution on very dense displays", () => {
		expect(getPreviewRendererResolution(2)).toBe(2);
		expect(getPreviewRendererResolution(3)).toBe(3);
		expect(getPreviewRendererResolution(4)).toBe(3);
	});

	it("falls back to a safe preview resolution for invalid values", () => {
		expect(getPreviewRendererResolution()).toBe(2);
		expect(getPreviewRendererResolution(Number.NaN)).toBe(2);
		expect(getPreviewRendererResolution(0)).toBe(2);
	});

	it("only enables motion blur for meaningful values", () => {
		expect(hasActiveMotionBlur()).toBe(false);
		expect(hasActiveMotionBlur(0)).toBe(false);
		expect(hasActiveMotionBlur(0.01)).toBe(false);
		expect(hasActiveMotionBlur(0.02)).toBe(true);
	});
});
