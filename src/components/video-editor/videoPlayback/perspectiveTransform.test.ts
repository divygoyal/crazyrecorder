import { describe, it, expect } from "vitest";
import {
  compute3DTransform,
  is3DZoomActive,
} from "./perspectiveTransform";
import type { Zoom3DConfig } from "../types";

function makeConfig(
  intensity = 0.5,
  enabled = true,
): Zoom3DConfig {
  return { enabled, intensity };
}

describe("compute3DTransform", () => {
  it("returns near-zero rotation when focus is at center", () => {
    const { rotateX, rotateY, strength } = compute3DTransform(
      makeConfig(0.5),
      { cx: 0.5, cy: 0.5 },
      1,
    );
    // Center focus is in dead zone — no rotation
    expect(Math.abs(rotateX)).toBeLessThan(0.01);
    expect(Math.abs(rotateY)).toBeLessThan(0.01);
    expect(strength).toBeGreaterThanOrEqual(0);
  });

  it("yaws when focus is on the left edge (left tilts away)", () => {
    const { rotateY } = compute3DTransform(
      makeConfig(1),
      { cx: 0.1, cy: 0.5 },
      1,
    );
    // Focus left of center → positive rotateY (left tilts away, right comes forward)
    expect(rotateY).toBeGreaterThan(0);
  });

  it("yaws when focus is on the right edge (right tilts away)", () => {
    const { rotateY } = compute3DTransform(
      makeConfig(1),
      { cx: 0.9, cy: 0.5 },
      1,
    );
    // Focus right of center → negative rotateY (right tilts away)
    expect(rotateY).toBeLessThan(0);
  });

  it("pitches when focus is near the top (top tilts away)", () => {
    const { rotateX } = compute3DTransform(
      makeConfig(1),
      { cx: 0.5, cy: 0.1 },
      1,
    );
    // Focus top → negative rotateX (top tilts away)
    expect(rotateX).toBeLessThan(0);
  });

  it("pitches when focus is near the bottom (bottom tilts away)", () => {
    const { rotateX } = compute3DTransform(
      makeConfig(1),
      { cx: 0.5, cy: 0.9 },
      1,
    );
    // Focus bottom → positive rotateX (bottom tilts away, top comes forward)
    expect(rotateX).toBeGreaterThan(0);
  });

  it("higher intensity produces stronger effect", () => {
    const low = compute3DTransform(makeConfig(0.2), { cx: 0.1, cy: 0.5 }, 1);
    const high = compute3DTransform(makeConfig(0.8), { cx: 0.1, cy: 0.5 }, 1);
    expect(Math.abs(high.strength)).toBeGreaterThan(Math.abs(low.strength));
  });

  it("progress = 0 produces zero strength", () => {
    const { strength } = compute3DTransform(
      makeConfig(1),
      { cx: 0.1, cy: 0.1 },
      0,
    );
    expect(strength).toBe(0);
  });

  it("returns zero rotation when disabled", () => {
    const { rotateX, rotateY, strength } = compute3DTransform(
      makeConfig(0.5, false),
      { cx: 0.1, cy: 0.1 },
      1,
    );
    expect(rotateX).toBe(0);
    expect(rotateY).toBe(0);
    expect(strength).toBe(0);
  });

  it("returns fov from config", () => {
    const { fov } = compute3DTransform(
      { enabled: true, intensity: 0.5, fov: 60 },
      { cx: 0.5, cy: 0.5 },
      1,
    );
    // 60° in radians ≈ 1.047
    expect(fov).toBeCloseTo(Math.PI / 3, 3);
  });

  it("defaults to 75° fov when not specified", () => {
    const { fov } = compute3DTransform(
      makeConfig(0.5),
      { cx: 0.5, cy: 0.5 },
      1,
    );
    expect(fov).toBeCloseTo((75 * Math.PI) / 180, 3);
  });

  it("rotation magnitude stays within MAX_ROTATION", () => {
    // Corner focus = maximum distance from center
    const { rotateX, rotateY } = compute3DTransform(
      makeConfig(1),
      { cx: 0.0, cy: 0.0 },
      1,
    );
    const magnitude = Math.sqrt(rotateX * rotateX + rotateY * rotateY);
    expect(magnitude).toBeLessThanOrEqual(0.61); // MAX_ROTATION = 0.60
  });
});

describe("is3DZoomActive", () => {
  it("returns false for undefined config", () => {
    expect(is3DZoomActive(undefined, 1)).toBe(false);
  });

  it("returns false when disabled", () => {
    expect(is3DZoomActive(makeConfig(0.5, false), 1)).toBe(false);
  });

  it("returns false when progress is 0", () => {
    expect(is3DZoomActive(makeConfig(0.5, true), 0)).toBe(false);
  });

  it("returns false when intensity is 0", () => {
    expect(is3DZoomActive({ enabled: true, intensity: 0 }, 1)).toBe(false);
  });

  it("returns true when active", () => {
    expect(is3DZoomActive(makeConfig(0.5, true), 0.5)).toBe(true);
  });
});
