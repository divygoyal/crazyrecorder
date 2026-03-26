/**
 * 3D perspective transform — FocuSee-style camera rotation from focus position.
 *
 * Matches FocuSee's Trans3DCommand architecture: computes RotateX (pitch),
 * RotateY (yaw), and FOV for a proper 3D camera projection.
 *
 * FocuSee convention: focused area tilts AWAY from the viewer (into the screen),
 * the opposite side comes forward — like looking down at a tablet on a desk.
 *
 *   focus on right side  → rotateY < 0 → right side tilts away
 *   focus on top         → rotateX < 0 → top tilts away
 *   focus near center    → minimal rotation (mostly scale zoom)
 */

import type { Zoom3DConfig, ZoomFocus } from "../types";
import type { PerspectiveWarpFilter } from "./perspectiveWarpFilter";

// ── Constants ──────────────────────────────────────────────

/** Maximum rotation in radians (~34°). After dead-zone and intensity scaling,
 *  effective max is ~17-20° matching FocuSee's dramatic visible 3D tilt. */
const MAX_ROTATION = 0.60;

/**
 * Dead zone around center where rotation is minimal. Focus within this
 * radius from (0.5, 0.5) produces no rotation — just like FocuSee
 * which barely tilts when zooming near the center.
 */
const CENTER_DEAD_ZONE = 0.02;

// ── Types ──────────────────────────────────────────────────

export interface Transform3DResult {
  /** Pitch in radians: negative = top tilts away (FocuSee convention) */
  rotateX: number;
  /** Yaw in radians: negative = right side tilts away (FocuSee convention) */
  rotateY: number;
  /** Field of view in radians */
  fov: number;
  /** Effect strength: progress × intensity (0–1) */
  strength: number;
}

// ── Public API ─────────────────────────────────────────────

/**
 * Compute 3D camera rotation from zoom focus position, config, and progress.
 *
 * Returns TARGET rotation angles (not yet scaled by progress). The caller
 * or spring animation system handles transition smoothing.
 */
export function compute3DTransform(
  config: Zoom3DConfig,
  focus: ZoomFocus,
  progress: number,
): Transform3DResult {
  const fov = ((config.fov ?? 75) * Math.PI) / 180;

  if (!config.enabled || progress <= 0 || config.intensity <= 0) {
    return { rotateX: 0, rotateY: 0, fov, strength: 0 };
  }

  const dx = focus.cx - 0.5;
  const dy = focus.cy - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const strength = progress * config.intensity;

  // Dead zone — no rotation near center
  if (dist < CENTER_DEAD_ZONE) {
    return { rotateX: 0, rotateY: 0, fov, strength };
  }

  // Scale rotation by distance from center (further = more rotation)
  const effectiveDist = Math.min(
    (dist - CENTER_DEAD_ZONE) / (0.5 - CENTER_DEAD_ZONE),
    1,
  );
  const scale = (effectiveDist * MAX_ROTATION) / dist;

  return {
    rotateY: -dx * scale, // focus right (dx>0) → negative yaw → right tilts away
    rotateX: dy * scale, // focus top (dy<0) → negative pitch → top tilts away
    fov,
    strength,
  };
}

/**
 * Apply the 3D perspective effect to a PerspectiveWarpFilter.
 * Returns the computed transform so callers can use it for shadow/spotlight.
 */
export function apply3DPerspective(
  filter: PerspectiveWarpFilter,
  config: Zoom3DConfig,
  focus: ZoomFocus,
  progress: number,
): Transform3DResult {
  const result = compute3DTransform(config, focus, progress);

  // Apply rotation scaled by strength (progress × intensity)
  filter.rotateX = result.rotateX * result.strength;
  filter.rotateY = result.rotateY * result.strength;
  filter.fov = result.fov;

  return result;
}

/**
 * Check if 3D zoom should be active for the current state.
 */
export function is3DZoomActive(
  config: Zoom3DConfig | undefined,
  progress: number,
): boolean {
  return !!config?.enabled && progress > 0 && config.intensity > 0;
}
