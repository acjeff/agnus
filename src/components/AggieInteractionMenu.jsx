import { C } from "../constants/theme.js";
import { AGGIE_INTERACTIONS } from "../aggie/speech.js";

function AggieInteractionMenu({ targetState, onSelect, onClose, position }) {
  return (
    <div style={{
      position: "fixed",
      left: position.x,
      top: position.y,
      zIndex: 200,
      transform: "translate(-50%, -100%)",
      display: "flex",
      gap: 4,
      padding: "6px 8px",
      borderRadius: 16,
      background: "rgba(10, 8, 20, 0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(200,196,240,0.15)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      animation: "aggieMenuPop 0.2s ease-out",
    }}>
      <style>{`@keyframes aggieMenuPop { 0% { opacity: 0; transform: translate(-50%, -100%) scale(0.8); } 100% { opacity: 1; transform: translate(-50%, -100%) scale(1); } }`}</style>
      {AGGIE_INTERACTIONS.map(action => (
        <button
          key={action.id}
          onClick={(e) => { e.stopPropagation(); onSelect(action.id); }}
          title={action.label}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1px solid rgba(200,196,240,0.1)",
            background: "rgba(30,26,50,0.8)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            transition: "background 0.15s, transform 0.15s",
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(100,90,180,0.4)"; e.currentTarget.style.transform = "scale(1.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(30,26,50,0.8)"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          {action.emoji}
        </button>
      ))}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: "none",
          background: "rgba(255,100,100,0.2)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "#ff8888",
          alignSelf: "center",
          padding: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default AggieInteractionMenu;
