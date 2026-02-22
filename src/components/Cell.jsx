import { C } from "../constants/theme.js";
import { SHAPES } from "../constants/shapes.jsx";
import { parseToken, getShapeStroke } from "../utils/helpers.js";

function Cell({ token, isBlank, isSelected, isFilled, isCorrect, isWrong, isRevealed, isLocked, onClick, onPointerDown, onPointerUp, onPointerEnter, cellSize, iconSize, mode, isPrefilled, fallDelay = 0, wrongFallDelay = 0, emptyCellDelay, isWon, winCelebrateDelay = 0, colorMap, shapesArr, isJustPlaced, isRemoving, removingToken, themeId, coopOwnerColor, coopBorderColor }) {
  const effectiveToken = isRemoving ? removingToken : token;
  const showContent = isRemoving || isRevealed || isLocked || !isBlank || isFilled;
  const parsed = showContent && effectiveToken ? parseToken(effectiveToken) : null;
  const displayColor = parsed ? (colorMap ? (colorMap[parsed.color] || parsed.color) : parsed.color) : null;
  const shapes = shapesArr || SHAPES;
  const isEasy = mode === "easy";
  const isEnigma = themeId === "enigma";
  const fallAnimation = isPrefilled ? `fallIntoPlace 0.5s ${fallDelay}s cubic-bezier(0.34, 1.56, 0.64, 1) both` : "none";
  const wrongAnimation = isWrong ? `fallOff 0.32s ${wrongFallDelay}s cubic-bezier(0.55, 0.09, 0.68, 0.53) forwards` : "none";
  const isEmptyUnfilled = isBlank && !isFilled && !isRevealed && !isLocked && !isRemoving;
  const emptyCellAnimation = isEmptyUnfilled && emptyCellDelay != null ? `emptyCellIn 0.35s ${emptyCellDelay}s ease-out forwards` : "none";
  const winAnimation = isWon && showContent
    ? (isEnigma
      ? `enigmaDecrypt 0.8s ${winCelebrateDelay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`
      : `tilesWinCelebrate 0.6s ${winCelebrateDelay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`)
    : "none";
  const placeAnimation = isJustPlaced ? "blockPlace 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both" : "none";
  const removeAnimation = isRemoving ? "blockRemove 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards" : "none";

  const resolvedAnimation = winAnimation !== "none" ? winAnimation
    : wrongAnimation !== "none" ? wrongAnimation
    : removeAnimation !== "none" ? removeAnimation
    : placeAnimation !== "none" ? placeAnimation
    : emptyCellAnimation !== "none" ? emptyCellAnimation
    : fallAnimation;

  // Enigma theme: circular tiles with brass wiring borders
  const enigmaBorderRadius = "50%";
  const enigmaEmptyBorder = `2px dashed rgba(201,168,76,0.35)`;
  const enigmaFilledBorder = showContent && displayColor
    ? `2px solid rgba(201,168,76,0.5)` : `2px solid rgba(201,168,76,0.2)`;
  const enigmaActiveBorder = isLocked ? `2.5px solid ${C.correct}`
    : isSelected ? `2.5px solid rgba(201,168,76,0.9)`
    : isWrong ? `2.5px solid ${C.incorrect}`
    : isEmptyUnfilled ? enigmaEmptyBorder
    : enigmaFilledBorder;
  const enigmaBoxShadow = isLocked ? `0 0 14px ${C.correct}55, inset 0 0 8px rgba(201,168,76,0.15)`
    : isCorrect ? `0 0 14px ${C.correct}55, inset 0 0 8px rgba(201,168,76,0.15)`
    : isWrong ? `0 0 12px ${C.incorrect}66`
    : isSelected ? `0 0 16px rgba(201,168,76,0.4), inset 0 0 10px rgba(201,168,76,0.12)`
    : showContent && displayColor ? `inset 0 0 6px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.4)` : "none";

  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      style={{
        width: cellSize, height: cellSize,
        borderRadius: isEnigma ? enigmaBorderRadius : (cellSize > 44 ? 10 : 8),
        backgroundColor: showContent && displayColor ? displayColor
          : coopOwnerColor && isBlank && !isFilled && !isRevealed && !isLocked ? coopOwnerColor
          : (isEnigma ? "rgba(12,12,8,0.7)" : C.surfaceLight),
        border: isEnigma ? enigmaActiveBorder
          : isLocked ? `2.5px solid ${C.correct}`
          : isSelected ? `2.5px solid ${C.accent}`
          : isWrong ? `2.5px solid ${C.incorrect}`
          : isBlank && !isFilled && !isRevealed && !isRemoving ? (coopBorderColor ? `2.5px solid ${coopBorderColor}` : `2.5px dashed ${C.border}`)
          : "2.5px solid transparent",
        cursor: isBlank && !isRevealed && !isLocked ? "pointer" : "default",
        transition: "transform 0.15s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s cubic-bezier(0.4,0,0.2,1)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
        opacity: isEmptyUnfilled && emptyCellDelay != null ? 0 : (isBlank && !isFilled && !isRevealed && !isLocked && !isRemoving ? 0.45 : 1),
        boxShadow: isEnigma ? enigmaBoxShadow
          : isLocked ? `0 0 14px ${C.correct}55`
          : isCorrect ? `0 0 14px ${C.correct}55`
          : isWrong ? `0 0 12px ${C.incorrect}66`
          : isSelected ? `0 0 14px ${C.accent}44` : "none",
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none", userSelect: "none",
        zIndex: isWrong ? 10 : undefined,
        animation: resolvedAnimation,
        outline: isEnigma && showContent && displayColor ? "1px solid rgba(201,168,76,0.12)" : undefined,
        outlineOffset: isEnigma ? "3px" : undefined,
      }}
    >
      {showContent && parsed && shapes[parsed.shapeIndex % shapes.length](iconSize, getShapeStroke(displayColor, isEasy))}
    </div>
  );
}

export default Cell;
