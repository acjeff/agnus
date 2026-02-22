import { useState, useRef, useEffect } from "react";
import { C } from "../constants/theme.js";
import { renderAggieSVG } from "../aggie/renderer.jsx";
import { AGGIE_CONVERSATIONS } from "../aggie/speech.js";

const AGGIE_INTERACTION_ANIMS = {
  "wave": "aggiePeek 1s ease-in-out",
  "high-five": "aggieBounce 0.5s ease-in-out",
  "bump": "aggieWiggle 0.6s ease-in-out",
  "dance": "aggieSpin 0.7s ease-in-out",
  "nuzzle": "aggieStretch 0.8s ease-in-out",
  "boop": "aggieBounce 0.5s ease-in-out",
};
const PEER_AGGIE_PROXIMITY = 120; // pixels — distance to show interaction menu

function PeerAggie({ state, myPos, mySize, onInteract }) {
  const [interactionAnim, setInteractionAnim] = useState(null);
  const [speech, setSpeech] = useState(null);
  const speechTimer = useRef(null);
  const size = state.size || 96;
  const accessory = state.accessory || "none";
  const mood = state.mood || null;
  const peerHappinessMood = state.happinessMood || null;

  // Calculate distance to local Aggie
  const dx = (state.x || 0) - (myPos?.x || 0);
  const dy = (state.y || 0) - (myPos?.y || 0);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const isNear = dist < PEER_AGGIE_PROXIMITY;

  // Handle incoming interaction animation
  useEffect(() => {
    if (state.activeInteraction) {
      setInteractionAnim(AGGIE_INTERACTION_ANIMS[state.activeInteraction] || "aggieWiggle 0.6s ease-in-out");
      // Speech is now synced via state.speech below
      const t = setTimeout(() => setInteractionAnim(null), 1200);
      return () => clearTimeout(t);
    }
  }, [state.activeInteraction, state.interactionTs]);

  // Handle synced speech from peer's Firebase broadcast
  const prevSpeechSeqRef = useRef(null);
  useEffect(() => {
    if (state.speech && state.speechSeq != null && state.speechSeq !== prevSpeechSeqRef.current) {
      prevSpeechSeqRef.current = state.speechSeq;
      setSpeech(state.speech);
      clearTimeout(speechTimer.current);
      speechTimer.current = setTimeout(() => setSpeech(null), 3000);
    } else if (!state.speech && prevSpeechSeqRef.current != null) {
      prevSpeechSeqRef.current = null;
    }
  }, [state.speech, state.speechSeq]);

  const bodyAnim = interactionAnim
    ? interactionAnim
    : mood === "celebrate"
      ? "companionCelebrate 0.4s ease infinite"
      : mood === "sad"
        ? "companionSad 1.5s ease-in-out infinite"
        : peerHappinessMood === "miserable"
          ? "companionFloat 5s ease-in-out infinite"
          : peerHappinessMood === "grumpy"
            ? "companionFloat 4s ease-in-out infinite"
            : "companionFloat 3s ease-in-out infinite";

  return (
    <div
      style={{
        position: "fixed",
        left: state.x || 0,
        top: state.y || 0,
        zIndex: 89,
        pointerEvents: "none",
        transition: "left 1.2s ease-out, top 1.2s ease-out",
      }}
    >
      {/* Username label — only visible when the local player is nearby */}
      <div style={{
        position: "absolute",
        bottom: size + 2,
        left: "50%",
        transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        color: "#c8c6f0",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        padding: "2px 8px",
        borderRadius: 8,
        pointerEvents: "none",
        letterSpacing: 0.3,
        opacity: isNear ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}>
        {state.username || "???"}
      </div>

      {/* Speech bubble */}
      {speech && (
        <div key={speech + "-" + prevSpeechSeqRef.current} style={{
          position: "absolute",
          top: size + 4,
          left: 4,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          animation: "aggieSpeechFloat 3s ease-out forwards",
          zIndex: 91,
          padding: "5px 10px",
          borderRadius: 12,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          color: "#e0dff4",
        }}>
          {speech}
        </div>
      )}

      {/* Aggie body — slightly transparent to indicate it's a peer */}
      <div style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.75,
        filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 6px rgba(100,90,180,0.3))",
        animation: bodyAnim,
        pointerEvents: isNear ? "auto" : "none",
        cursor: isNear ? "pointer" : "default",
      }}
        onClick={isNear ? (e) => { e.stopPropagation(); onInteract?.(state); } : undefined}
        title={isNear ? `Interact with ${state.username || "Aggie"}` : ""}
      >
        {renderAggieSVG(size, mood, true, accessory, peerHappinessMood)}
      </div>
    </div>
  );
}

export default PeerAggie;
