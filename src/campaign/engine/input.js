// Input handling for campaign mode
// Supports: keyboard (WASD/arrows), touch d-pad, and interaction

export function createInputHandler(onMove, onInteract) {
  const keys = new Set();
  let moveQueue = [];
  let moveInterval = null;
  const MOVE_DELAY = 150; // ms between moves (tile-based)
  let lastMoveTime = 0;
  let enabled = true;

  // Touch state
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;
  const SWIPE_THRESHOLD = 30;

  function setEnabled(val) {
    enabled = val;
    if (!val) {
      keys.clear();
      moveQueue = [];
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
        // Immediate first move
        processMovement();
      }
    }

    // Interaction
    if (key === " " || key === "enter" || key === "e") {
      e.preventDefault();
      onInteract();
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
  }

  function processMovement() {
    const now = Date.now();
    if (now - lastMoveTime < MOVE_DELAY) return;

    let dx = 0, dy = 0;
    if (keys.has("w") || keys.has("arrowup")) dy = -1;
    if (keys.has("s") || keys.has("arrowdown")) dy = 1;
    if (keys.has("a") || keys.has("arrowleft")) dx = -1;
    if (keys.has("d") || keys.has("arrowright")) dx = 1;

    // Only move one axis at a time (no diagonal, like Pokemon)
    if (dx !== 0 && dy !== 0) {
      // Prioritize the most recently pressed direction
      // Default to horizontal
      dy = 0;
    }

    if (dx !== 0 || dy !== 0) {
      lastMoveTime = now;
      onMove(dx, dy);
    }
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

  // Held key repeat
  function startRepeat() {
    if (moveInterval) return;
    moveInterval = setInterval(() => {
      if (keys.size > 0) {
        processMovement();
      }
    }, MOVE_DELAY);
  }

  function stopRepeat() {
    if (moveInterval) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
  }

  function attach(element) {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    if (element) {
      element.addEventListener("touchstart", handleTouchStart, { passive: true });
      element.addEventListener("touchend", handleTouchEnd, { passive: true });
    }
    startRepeat();
  }

  function detach(element) {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    if (element) {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
    }
    stopRepeat();
    keys.clear();
  }

  return { attach, detach, setEnabled, get keys() { return keys; } };
}
