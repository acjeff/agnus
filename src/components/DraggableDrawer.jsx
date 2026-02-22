import { useRef, useEffect, useCallback } from "react";
import { C } from "../constants/theme.js";

export default function DraggableDrawer({ isOpen, onClose, children, maxHeight, zIndex }) {
  const drawerRef = useRef(null);
  const backdropRef = useRef(null);
  const handleRef = useRef(null);
  const dragState = useRef({ active: false, startY: 0, current: 0 });

  const onTouchStart = useCallback((e) => {
    const handleEl = handleRef.current;
    const drawerEl = drawerRef.current;
    if (!handleEl || !drawerEl) return;
    const isHandle = handleEl.contains(e.target);
    const scrollEl = drawerEl.querySelector("[data-drawer-scroll]");
    const isScrolledToTop = !scrollEl || scrollEl.scrollTop <= 0;
    if (!isHandle && !isScrolledToTop) return;
    dragState.current = { active: true, startY: e.touches[0].clientY, current: 0 };
    drawerEl.style.transition = "none";
    drawerEl.style.animation = "none";
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragState.current.active) return;
    const dy = e.touches[0].clientY - dragState.current.startY;
    if (dy > 0) {
      e.preventDefault();
      dragState.current.current = dy;
      if (drawerRef.current) drawerRef.current.style.transform = `translateY(${dy}px)`;
      if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0, 1 - dy / 400));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    const dy = dragState.current.current;
    if (drawerRef.current) drawerRef.current.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
    if (dy > 100) {
      if (drawerRef.current) drawerRef.current.style.transform = "translateY(100%)";
      if (backdropRef.current) { backdropRef.current.style.transition = "opacity 0.3s"; backdropRef.current.style.opacity = "0"; }
      setTimeout(() => onClose(), 300);
    } else {
      if (drawerRef.current) drawerRef.current.style.transform = "translateY(0)";
      if (backdropRef.current) backdropRef.current.style.opacity = "1";
    }
    dragState.current.current = 0;
  }, [onClose]);

  // Attach non-passive touch listeners so e.preventDefault() works on mobile
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, onTouchStart, onTouchMove, onTouchEnd]);

  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const html = document.documentElement;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = "";
      html.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: zIndex || 1100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} role="dialog" aria-modal="true">
      <style>{`@keyframes drawerSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes drawerOverlayFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div ref={backdropRef} onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", animation: "drawerOverlayFade 0.25s ease both" }} />
      <div ref={drawerRef} onClick={e => e.stopPropagation()} style={{
        position: "relative", backgroundColor: C.bg, borderRadius: "20px 20px 0 0",
        border: `1px solid ${C.border}`, borderBottom: "none",
        maxHeight: maxHeight || "85vh", display: "flex", flexDirection: "column",
        animation: "drawerSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.5)",
        width: "100%", maxWidth: 480, alignSelf: "center",
      }}>
        <div ref={handleRef} style={{ padding: "12px 0 8px", flexShrink: 0, cursor: "grab", touchAction: "none" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, margin: "0 auto" }} />
        </div>
        {children}
      </div>
    </div>
  );
}
