import { C } from "../constants/theme.js";

export default function AttemptDots({ max, used, won }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4 }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: i < used ? (won && i === used - 1 ? C.correct : C.incorrect) : C.border,
          transition: "background-color 0.3s",
        }} />
      ))}
    </div>
  );
}
