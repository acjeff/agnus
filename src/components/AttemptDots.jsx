import { C } from "../constants/theme.js";

export default function AttemptDots({ max, used, won, campaign }) {
  return (
    <div style={{ display: "flex", gap: campaign ? 4 : 6, justifyContent: "center", marginTop: 4 }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: campaign ? 8 : 10, height: campaign ? 8 : 10,
          borderRadius: campaign ? 2 : 5,
          backgroundColor: i < used
            ? (won && i === used - 1 ? (campaign ? "#4ade80" : C.correct) : (campaign ? "#f87171" : C.incorrect))
            : (campaign ? "#3d2e5c" : C.border),
          transition: "background-color 0.3s",
          ...(campaign ? { border: "1px solid rgba(255,255,255,0.1)" } : {}),
        }} />
      ))}
    </div>
  );
}
