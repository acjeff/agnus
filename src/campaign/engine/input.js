// Input handling for campaign mode
// Supports: keyboard (WASD/arrows), touch swipe/tap, and mouse click/drag

export function createInputHandler(onMove, onInteract, onAttack, options = {}) {
  const keys = new Set();
  let moveQueue = [];
  const MOVE_DELAY = 120; // ms between moves (tile-based)
  let lastMoveTime = -Infinity;
  let rafId = null;
  let lastRafTs = null;
  let enabled = true;

  const onDirChange = typeof options.onDirChange === "function" ? options.onDirChange : null;
  let lastAxis = "h"; // "h" | "v"; used when both axes held

  // keyboardMode:
  // - "discrete" (default): tile-step movement via onMove, with repeat
  // - "continuous": only updates held keys; consumer drives movement
  const keyboardMode = options.keyboardMode || "discrete";

  function computeDirFromKeys() {
    let dx = 0, dy = 0;
    if (keys.has("w") || keys.has("arrowup")) dy = -1;
    if (keys.has("s") || keys.has("arrowdown")) dy = 1;
    if (keys.has("a") || keys.has("arrowleft")) dx = -1;
    if (keys.has("d") || keys.has("arrowright")) dx = 1;

    // Only move one axis at a time (no diagonal, like Pokemon)
    if (dx !== 0 && dy !== 0) {
      if (lastAxis === "v") dx = 0;
      else dy = 0;
    }
    return { dx, dy };
  }

  function emitDirChange() {
    if (!onDirChange) return;
    const { dx, dy } = computeDirFromKeys();
    onDirChange(dx, dy);
  }

  // Touch state
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;
  const SWIPE_THRESHOLD = 30;

  // Mouse state
  let mouseStartX = 0;
  let mouseStartY = 0;
  let mouseActive = false;

  function setEnabled(val) {
    enabled = val;
    if (!val) {
      keys.clear();
      moveQueue = [];
      lastMoveTime = -Infinity;
      emitDirChange();
    }
  }

  function handleKeyDown(e) {
    if (!enabled) return;
    const key = e.key.toLowerCase();

    // Movement keys
    if (["w", "arrowup", "a", "arrowleft", "s", "arrowdown", "d", "arrowright"].includes(key)) {
      e.preventDefault();
      if (!keys.has(key)) {
        keys.add(key);

        if (key === "w" || key === "arrowup" || key === "s" || key === "arrowdown") lastAxis = "v";
        if (key === "a" || key === "arrowleft" || key === "d" || key === "arrowright") lastAxis = "h";

        // Immediate first move (discrete mode only)
        if (keyboardMode === "discrete") {
          processMovement(performance.now());
        } else {
          emitDirChange();
        }
      }
    }

    // Interaction
    if (key === " " || key === "enter" || key === "e") {
      e.preventDefault();
      onInteract();
    }

    // Secondary action (attack/cancel)
    if (key === "f" || key === "q" || key === "backspace") {
      if (!onAttack) return;
      e.preventDefault();
      onAttack();
    }

    // Escape for pause
    if (key === "escape") {
      e.preventDefault();
      // Will be handled by CampaignMode
    }
  }

  function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    keys.delete(key);
    if (keyboardMode === "continuous") emitDirChange();
  }

  function processMovement(nowTs) {
    if (nowTs - lastMoveTime < MOVE_DELAY) return;

    const { dx, dy } = computeDirFromKeys();

    if (dx !== 0 || dy !== 0) {
      lastMoveTime = nowTs;
      onMove(dx, dy);
    }
  }

  function loop(ts) {
    if (!enabled) {
      rafId = requestAnimationFrame(loop);
      return;
    }

    if (lastRafTs == null) lastRafTs = ts;
    lastRafTs = ts;

    if (keyboardMode === "discrete" && keys.size > 0) processMovement(ts);

    rafId = requestAnimationFrame(loop);
  }

  // Touch handlers for mobile d-pad / swipe
  function handleTouchStart(e) {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchActive = true;
  }

  function handleTouchEnd(e) {
    if (!enabled || !touchActive) return;
    touchActive = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
      // Tap — interact
      onInteract();
      return;
    }

    // Swipe — move in dominant direction
    if (absDx > absDy) {
      onMove(dx > 0 ? 1 : -1, 0);
    } else {
      onMove(0, dy > 0 ? 1 : -1);
    }
  }

  // Mouse handlers (desktop)
  function handleMouseDown(e) {
    if (!enabled) return;

    // Right click: secondary action
    if (e.button === 2) {
      if (onAttack) {
        e.preventDefault();
        onAttack();
      }
      return;
    }

    if (e.button !== 0) return;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    mouseActive = true;
  }

  function handleMouseUp(e) {
    if (!enabled || !mouseActive) return;
    mouseActive = false;

    // Only treat left button as movement/interact
    if (e.button !== 0) return;

    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
      onInteract();
      return;
    }

    if (absDx > absDy) {
      onMove(dx > 0 ? 1 : -1, 0);
    } else {
      onMove(0, dy > 0 ? 1 : -1);
    }
  }

  function handleContextMenu(e) {
    // Allow right click to be used as an action without opening the browser menu
    if (!enabled) return;
    e.preventDefault();
  }

  function startRepeat() {
    if (rafId) return;
    if (keyboardMode !== "discrete") return;
    lastRafTs = null;
    rafId = requestAnimationFrame(loop);
  }

  function stopRepeat() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = null;
    lastRafTs = null;
  }

  function attach(element) {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    if (element) {
      element.addEventListener("touchstart", handleTouchStart, { passive: true });
      element.addEventListener("touchend", handleTouchEnd, { passive: true });
      element.addEventListener("mousedown", handleMouseDown);
      element.addEventListener("mouseup", handleMouseUp);
      element.addEventListener("contextmenu", handleContextMenu);
    }
    startRepeat();
  }

  function detach(element) {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", handleBlur);
    if (element) {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("mousedown", handleMouseDown);
      element.removeEventListener("mouseup", handleMouseUp);
      element.removeEventListener("contextmenu", handleContextMenu);
    }
    stopRepeat();
    keys.clear();
    lastMoveTime = -Infinity;
    if (keyboardMode === "continuous") emitDirChange();
  }

  function handleBlur() {
    keys.clear();
    if (keyboardMode === "continuous") emitDirChange();
  }

  return { attach, detach, setEnabled, get keys() { return keys; } };
}
