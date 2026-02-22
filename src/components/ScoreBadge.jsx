import { C } from "../constants/theme.js";

export default function ScoreBadge({ attempts }) {
  const tier = attempts <= 1 ? { label: "Gold", color: C.gold } : attempts <= 2 ? { label: "Silver", color: C.silver } : { label: "Bronze", color: C.bronze };
  return <span style={{ color: tier.color, fontWeight: 700 }}>{tier.label}</span>;
}
