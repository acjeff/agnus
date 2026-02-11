# New Game Mode Ideas

Brainstorm for new modes that build on Pattrn's core mechanic: fill blank cells with the correct color-shape token by deducing the underlying pattern.

---

## 1. Decay

The grid is slowly falling apart. Every N seconds, a revealed (pre-filled) hint cell disappears, removing information you were relying on. You race against entropy -- solve it before you're flying completely blind. Later levels decay faster.

**Why it's fun:** Creates genuine tension. You instinctively scan the grid to memorize hints before they vanish, turning a logic puzzle into a logic + memory hybrid.

---

## 2. Fog of War

You start seeing only a small cluster of revealed cells. As you correctly fill in blanks, adjacent hidden cells become visible -- the fog lifts outward from your correct placements. Wrong guesses push the fog back in. You're exploring the grid, not just solving it.

**Why it's fun:** Makes each correct placement feel like discovery. The grid becomes a territory you conquer, and the uncertainty about what lies in the fog creates suspense.

---

## 3. Mirror

Only the left (or top) half of the grid is shown. The other half is a reflection -- but you don't know which kind. It could be a horizontal mirror, vertical mirror, 180-degree rotation, or diagonal transpose. You must deduce the symmetry type from context and fill in the hidden half.

**Why it's fun:** Adds a meta-puzzle layer on top of the pattern. You're not just reading the pattern, you're figuring out how the pattern maps onto itself.

---

## 4. Relay

A sequence of 5 rapid-fire micro-puzzles (3x3 or 4x4) with a shared attempt counter. Miss on any puzzle and the penalty carries forward. Gold requires clearing all 5 with zero mistakes. It's Cascade's intensity compressed into a single sitting.

**Why it's fun:** The small grids are individually easy, but the compounding pressure across the relay makes it tense. Great for short play sessions.

---

## 5. Shapeshifter

After each check (right or wrong), the pattern *mutates*. Colors shift one step around the palette, or the pattern generator rotates 90 degrees. The answer you're looking for is a moving target. You get a brief flash showing the new state before blanks are re-hidden.

**Why it's fun:** Breaks the "stare and deduce" loop. You need to think dynamically and adapt on every attempt, rather than narrowing down one fixed answer.

---

## 6. Duel (Async Multiplayer)

Two players get the same seeded puzzle. Each player solves independently, and results are compared: fewest attempts wins, with time as tiebreaker. Could work as a challenge-a-friend link (`?duel=SEED`) or a weekly matchmaking ladder.

**Why it's fun:** Competitive tension without real-time infrastructure. The shared seed guarantees fairness, and the link-based challenge makes it social.

---

## 7. Architect (Puzzle Creator)

Reverse the game: players design puzzles instead of solving them. Pick a grid size, paint a pattern, choose which cells to blank out, then the game validates that the puzzle is solvable and rates its difficulty. Share your creation with a code/link.

**Why it's fun:** Taps into a completely different creative instinct. Players who've mastered solving will love crafting devious puzzles for friends. User-generated content extends the game's life indefinitely.

---

## 8. Eclipse

Every few seconds, a "shadow" sweeps across the grid, temporarily hiding a row or column of revealed cells. The shadow moves in a pattern (left-to-right, spiral, random). You can only place tokens in illuminated cells. Demands spatial awareness and timing.

**Why it's fun:** Introduces a rhythm/timing element to a logic game. You learn to "read ahead" -- studying a row before the shadow reaches it.

---

## 9. One-Shot

A single large puzzle (8x8 or 9x9) where you get exactly one check. Every blank must be filled before you can submit, and there's no partial feedback. Either you nail it all at once or you lose. High difficulty, high reward.

**Why it's fun:** Pure confidence mode. No safety net, no iterating. Appeals to players who want to prove total mastery. A gold medal here would be a real flex.

---

## 10. Inference Chain

The grid starts with only 1-2 revealed cells, far fewer than normal. But each correctly placed token immediately reveals one new adjacent cell's true value (like dominoes). Wrong placements reveal nothing. The puzzle unfolds through a chain of deductions.

**Why it's fun:** Feels like detective work -- each correct guess unlocks new evidence. The chain mechanic rewards careful, incremental reasoning over brute-force guessing.

---

## 11. Palette Swap

You solve the puzzle normally, but the token palette is *wrong*. The shapes are correct, but every color has been remapped to a different one. A small Rosetta Stone in the corner shows partial mappings (e.g., "red -> blue") but not all of them. You must deduce the full color translation table while simultaneously solving the pattern.

**Why it's fun:** A brain-bending twist -- you're solving two puzzles at once (the spatial pattern and the color cipher). Simple concept, surprisingly deep.

---

## 12. Marathon

An endless mode with escalating difficulty. Starts at 3x3, grows to 4x4 after 3 solves, then 5x5, and so on. Attempt budget refreshes each puzzle but shrinks over time (5 -> 4 -> 3 -> 2 -> 1). Tracks your longest streak/highest grid size reached. No gold/silver/bronze, just "how far can you go?"

**Why it's fun:** The "one more round" loop is addictive. Escalating difficulty keeps it from getting stale, and the shrinking attempt budget creates a natural difficulty curve without needing harder patterns.

---

## 13. Blackout

Like Blind mode, but you also can't see which tokens you've placed. After placing a token, the cell shows a neutral "filled" indicator instead of revealing the color/shape. You must track your own placements mentally. On check, everything is revealed at once.

**Why it's fun:** Extreme memory challenge. Players who've mastered Blind will love having another layer of difficulty. The reveal moment after a check is either triumphant or hilarious.

---

## 14. Split Screen

Two grids side by side that share the same underlying pattern but have different cells blanked out. Clues visible in Grid A help solve Grid B and vice versa. You can switch between them freely. Both must be completed to win, with a shared attempt counter.

**Why it's fun:** Cross-referencing between grids is a novel spatial reasoning challenge. It mimics the "aha!" moment of seeing the same thing from two angles.

---

## 15. Trickster

The grid contains 1-3 "liar" cells -- pre-filled cells that show the *wrong* token. They look identical to real hints. You must identify which hints are fake, override them, and still solve the grid. The number of liars is shown but not their locations.

**Why it's fun:** Subverts the core trust mechanic of the game. Every hint cell becomes suspicious, and proving which ones are liars is deeply satisfying.

---

## Honorable Mentions

| Idea | Concept |
|------|---------|
| **Zen** | Infinite untimed puzzles, no attempt limit, no scoring -- just vibes |
| **Color Only** | Shapes are hidden; solve using only color patterns |
| **Shape Only** | Colors are hidden; solve using only shape patterns |
| **Rush** | 3 small grids share a single token pool -- placing a token in one grid removes it from the others |
| **Rewind** | You see the completed grid for 5 seconds, then blanks appear and you recreate it from memory |
| **Weekly Tournament** | Curated set of 5 puzzles, global leaderboard, resets every Monday |
