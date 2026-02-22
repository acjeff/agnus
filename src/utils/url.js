export const VALID_MODES = new Set(["easy", "medium", "hard", "blind", "daily", "cascade", "spin", "mosaic"]);

export const VALID_VIEWS = new Set(["gallery", "creator", "custom-mosaic", "coop", "profile"]);

export function getSearchParams() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode");
  const level = params.get("level");
  const date = params.get("date");
  const viewParam = params.get("view");
  const coop = params.get("coop");
  const coopMosaic = params.get("coopMosaic");
  const vault = params.get("vault");
  return {
    mode: mode && VALID_MODES.has(mode) ? mode : null,
    level: level != null ? Math.max(0, Math.min(49, parseInt(level, 10) || 0)) : null,
    date: date && /^\d{2}-\d{2}-\d{4}$/.test(date) ? date : null,
    view: viewParam && VALID_VIEWS.has(viewParam) ? viewParam : null,
    coop: coop || null,
    coopMosaic: coopMosaic || null,
    vault: vault || null,
  };
}

export function updateUrl(mode, level, replace = true, date = null, viewParam = null) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (mode === "daily" && date) {
    params.set("date", date);
  } else if (level != null) {
    params.set("level", String(level));
  }
  if (viewParam) params.set("view", viewParam);
  // Preserve active coop session params across URL updates
  const current = new URLSearchParams(window.location.search);
  const coopVal = current.get("coop");
  const coopMosaicVal = current.get("coopMosaic");
  const vaultVal = current.get("vault");
  if (coopVal) params.set("coop", coopVal);
  if (coopMosaicVal) params.set("coopMosaic", coopMosaicVal);
  if (vaultVal) params.set("vault", vaultVal);
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  const prevState = window.history.state || {};
  if (replace) window.history.replaceState(prevState, "", url);
  else window.history.pushState(prevState, "", url);
}

export function setCoopUrlParam(paramName, value) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set(paramName, value);
  const url = `${window.location.pathname}?${params}`;
  window.history.replaceState(window.history.state || {}, "", url);
}

export function clearCoopUrlParam(paramName) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.delete(paramName);
  const url = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
  window.history.replaceState(window.history.state || {}, "", url);
}
