/**
 * Path enumeration helpers for location hierarchy (delimiter #).
 * Root segment: #"NODE_ID#" ; child: parent's full path + "CHILD_ID#".
 */

/** @param {string} segmentId */
export function normalizeSegmentId(segmentId) {
  return String(segmentId || "").trim().toUpperCase().replace(/\s+/g, "-");
}

/**
 * @param {string | null | undefined} parentFullPath normalized path ending with '#' or undefined for root-like parent
 * @param {string} segmentId node id fragment (no hashes)
 */
export function appendSegmentToLocationPath(parentFullPath, segmentId) {
  const id = normalizeSegmentId(segmentId);
  const base = parentFullPath == null || parentFullPath === "" ? "" : String(parentFullPath);
  const normalizedParent = base.endsWith("#") ? base : `${base}#`;
  if (!normalizedParent || normalizedParent === "#") {
    return `#${id}#`;
  }
  return `${normalizedParent}${id}#`;
}

/** @returns {boolean} */
export function pathStartsWithLocationPrefix(absPath, prefix) {
  const s = String(absPath || "");
  const p = String(prefix || "");
  return s.startsWith(p);
}

/**
 * Replaces a single leading path prefix used for subtree moves.
 * @param {string} absPath full path stored on row
 * @param {string} oldPrefix subtree root path (e.g. #A#X# )
 * @param {string} newPrefix new subtree root path (e.g. #B#X# )
 */
export function replaceLocationPathPrefix(absPath, oldPrefix, newPrefix) {
  const s = String(absPath || "");
  const op = String(oldPrefix || "");
  if (!op) return absPath;
  if (!s.startsWith(op)) {
    throw new Error("PATH_PREFIX_MISMATCH_FOR_MOVE");
  }
  return `${newPrefix}${s.slice(op.length)}`;
}

export const LOCATION_NODE_ENTITY = {
  BRANCH: "BRANCH",
  BUILDING: "BUILDING",
  METER: "METER",
};

/** @param {typeof LOCATION_NODE_ENTITY[keyof typeof LOCATION_NODE_ENTITY]} type */
export function stableLocationNodeSk(type, id) {
  const t = normalizeSegmentId(type);
  const i = normalizeSegmentId(id);
  return `NODE#${t}#${i}`;
}

/** Legacy building SK retained for lookups */
export function legacyBuildingSk(branchId, buildingId) {
  const bid = normalizeSegmentId(branchId);
  const bnum = normalizeSegmentId(buildingId);
  return `BRANCH#${bid}#BLDG#${bnum}`;
}

export function legacyMeterSk(meterId) {
  const mId = normalizeSegmentId(meterId);
  return `METER#${mId}`;
}
