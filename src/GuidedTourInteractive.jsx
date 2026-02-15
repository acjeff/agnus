import React, { useEffect, useState, useRef } from "react";

/**
 * Interactive Guided Tour Component - Redesigned
 *
 * Flow:
 * 1. Intro explaining the game
 * 2. Point to Easy #1 puzzle (pre-selected)
 * 3. In puzzle: guide through solving + checking
 * 4. Menu tour: Quick Play, game modes
 * 5. Mosaic explanation
 * 6. Co-op explanation (requires account)
 * 7. Post-account: "Tried playing with a friend?" popup
 */

export function GuidedTourInteractive({
  step,
  onAdvance,
  onSkip,
  tourPhase,
  colors,
  view,
  onStartPuzzle, // Function to start Easy puzzle #1
  selectedCell,
  fills,
  puzzle,
  gameState,
  radialMenuStack,
}) {
  const [targetElement, setTargetElement] = useState(null);
  const [arrowPosition, setArrowPosition] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);

  // Tour step definitions
  const tourSteps = {
    basic: [
      {
        id: "intro",
        title: "Welcome to Pattrn!",
        description: "Pattrn is a pattern puzzle game. Your goal is to complete grids by finding the hidden pattern. Let's solve your first puzzle!",
        position: "center",
        showArrow: false,
        autoAdvance: false,
      },
      {
        id: "start-puzzle",
        title: "Your First Puzzle",
        description: "This is the easiest puzzle - perfect for learning! Tap 'Let's Go!' to begin.",
        targetSelector: "[data-tour-id='easy-puzzle-1']",
        position: "bottom",
        showArrow: true,
        autoAdvance: true, // Auto-advance when user clicks button
        condition: () => view === "play",
      },
      {
        id: "in-puzzle",
        title: "Study the Pattern",
        description: "Look at the filled cells. Can you see the pattern? Each row and column follows a rule!",
        position: "center",
        showArrow: false,
        autoAdvance: false,
        condition: () => view === "play",
      },
      {
        id: "tap-cell",
        title: "Tap This Cell",
        description: "Tap this empty cell to select it and fill it in!",
        targetSelector: "[data-tour-id='first-blank-cell']",
        position: "top",
        showArrow: true,
        autoAdvance: true,
        condition: () => selectedCell !== null,
      },
      {
        id: "enter-value",
        title: "Enter a Number",
        description: "Use the keypad below to enter your answer. Pick any number!",
        targetSelector: "[data-tour-id='keypad']",
        position: "top",
        showArrow: true,
        autoAdvance: true,
        condition: () => fills && Object.keys(fills).length > 0,
      },
      {
        id: "fill-more",
        title: "Great! Keep Going",
        description: "Now fill in the rest of the empty cells. Look for the pattern!",
        targetSelector: "[data-tour-id='grid']",
        position: "top",
        showArrow: true,
        autoAdvance: true,
        allowAllInteractions: true, // Allow clicking cells AND check button during this step
        condition: () => {
          // Advance when ALL blank cells are filled
          if (!fills || !puzzle || !puzzle.blanks) return false;
          const filledCount = Object.keys(fills).length;
          const blankCount = puzzle.blanks.size;
          return filledCount === blankCount;
        },
      },
      {
        id: "check-answer",
        title: "Check Your Solution!",
        description: "All cells filled! Tap the checkmark ✓ to see if you got it right!",
        targetSelector: "[data-tour-id='check-button']",
        position: "left",
        showArrow: true,
        autoAdvance: true,
        condition: () => gameState === "won" || gameState === "failed", // Advance when they check (win or fail)
      },
      {
        id: "open-menu",
        title: "Great Job!",
        description: "Now let's explore the game! Tap the menu button to see all the features.",
        targetSelector: "[data-tour-id='menu-button']",
        position: "left",
        showArrow: true,
        autoAdvance: true,
        condition: () => radialMenuStack.length > 0,
      },
      {
        id: "quick-play",
        title: "Quick Play",
        description: "Quick Play lets you jump into puzzles of different difficulties. Try Easy, Medium, or Hard!",
        targetSelector: "[data-tour-id='nav-play']",
        position: "left",
        showArrow: true,
        autoAdvance: false,
      },
      {
        id: "daily",
        title: "Daily Puzzle",
        description: "Play a new Daily puzzle every day (Medium difficulty). Build your streak!",
        targetSelector: "[data-tour-id='daily']",
        position: "left",
        showArrow: true,
        autoAdvance: false,
      },
      {
        id: "cascade",
        title: "Cascade Mode",
        description: "Cascade puzzles start easy and get progressively harder. How far can you go?",
        targetSelector: "[data-tour-id='cascade']",
        position: "left",
        showArrow: true,
        autoAdvance: false,
      },
      {
        id: "mosaic",
        title: "Mosaic Gallery",
        description: "Create and share beautiful mosaic artworks using puzzle grids!",
        targetSelector: "[data-tour-id='nav-gallery']",
        position: "left",
        showArrow: true,
        autoAdvance: false,
      },
      {
        id: "coop-teaser",
        title: "Play with Friends!",
        description: "Want to solve puzzles together? Create a free account to unlock Co-op mode!",
        position: "center",
        showArrow: false,
        autoAdvance: false,
      },
    ],
    coopIntro: [
      {
        id: "coop-popup",
        title: "Tried Playing with a Friend?",
        description: "Open the menu and tap Co-op to create or join a multiplayer session!",
        targetSelector: "[data-tour-id='menu-button']",
        position: "left",
        showArrow: true,
        autoAdvance: true,
        condition: () => radialMenuStack.includes("coop"),
      },
    ],
  };

  const steps = tourSteps[tourPhase] || tourSteps.basic;
  const currentStep = steps[step] || steps[0];

  // Find target element and calculate positions
  useEffect(() => {
    if (!currentStep.targetSelector) {
      setTargetElement(null);
      setArrowPosition(null);
      setTooltipPosition(null);
      return;
    }

    let retryCount = 0;
    const maxRetries = 20; // Try for 2 seconds max

    const findElement = () => {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        setTargetElement(element);
        updatePositions(element);
        return true;
      }
      return false;
    };

    // Try immediately
    if (findElement()) return;

    // If not found, retry with backoff
    const interval = setInterval(() => {
      retryCount++;
      if (findElement() || retryCount >= maxRetries) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentStep.targetSelector, step]);

  const updatePositions = (element) => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate arrow position based on desired position
    let arrowX = centerX;
    let arrowY = centerY;
    let arrowRotation = 0;

    switch (currentStep.position) {
      case "top":
        arrowY = rect.top - 40;
        arrowRotation = 180;
        break;
      case "bottom":
        arrowY = rect.bottom + 40;
        arrowRotation = 0;
        break;
      case "left":
        arrowX = rect.left - 40;
        arrowY = centerY;
        arrowRotation = 90;
        break;
      case "right":
        arrowX = rect.right + 40;
        arrowY = centerY;
        arrowRotation = -90;
        break;
    }

    setArrowPosition({ x: arrowX, y: arrowY, rotation: arrowRotation });

    // Calculate tooltip position
    const tooltipWidth = 280;
    const tooltipHeight = 120;
    const padding = 20;

    let tooltipX = centerX - tooltipWidth / 2;
    let tooltipY;

    // Position tooltip on opposite side of arrow
    switch (currentStep.position) {
      case "bottom":
        tooltipY = rect.bottom + 60; // Below element
        break;
      case "top":
        tooltipY = rect.top - tooltipHeight - 60; // Above element
        break;
      case "left":
        tooltipY = arrowY - tooltipHeight / 2;
        tooltipX = rect.left - tooltipWidth - 60;
        break;
      case "right":
        tooltipY = arrowY - tooltipHeight / 2;
        tooltipX = rect.right + 60;
        break;
      default:
        tooltipY = arrowY - tooltipHeight / 2;
    }

    // Keep tooltip on screen
    if (tooltipX < padding) tooltipX = padding;
    if (tooltipX + tooltipWidth > window.innerWidth - padding) {
      tooltipX = window.innerWidth - tooltipWidth - padding;
    }
    if (tooltipY < padding) tooltipY = padding;
    if (tooltipY + tooltipHeight > window.innerHeight - padding) {
      tooltipY = window.innerHeight - tooltipHeight - padding;
    }

    setTooltipPosition({ x: tooltipX, y: tooltipY });
  };

  // Check auto-advance conditions
  useEffect(() => {
    if (!currentStep.autoAdvance || !currentStep.condition) return;

    const checkCondition = () => {
      if (currentStep.condition()) {
        setTimeout(() => onAdvance(), 300);
      }
    };

    const interval = setInterval(checkCondition, 100);
    return () => clearInterval(interval);
  }, [currentStep, onAdvance]);

  // Handle resize and element changes
  useEffect(() => {
    if (!targetElement) return;

    const handleResize = () => updatePositions(targetElement);

    // Use ResizeObserver for smoother position updates
    const resizeObserver = new ResizeObserver(() => {
      updatePositions(targetElement);
    });

    resizeObserver.observe(targetElement);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [targetElement, currentStep]);

  // Raise target element's z-index to make it clickable above overlay
  useEffect(() => {
    if (!targetElement) return;

    const originalZIndex = targetElement.style.zIndex;
    const originalPosition = targetElement.style.position;

    targetElement.style.position = originalPosition || "relative";
    targetElement.style.zIndex = "9999";

    return () => {
      targetElement.style.zIndex = originalZIndex;
      targetElement.style.position = originalPosition;
    };
  }, [targetElement]);

  const isCenterPosition = currentStep.position === "center" || !currentStep.targetSelector;

  // Calculate spotlight cutout for target element
  const spotlightStyle = targetElement ? (() => {
    const rect = targetElement.getBoundingClientRect();
    const padding = 8; // Padding around the element
    return {
      left: rect.left - padding,
      top: rect.top - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
  })() : null;

  return (
    <>
      {/* Blocking overlay with spotlight cutout */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 9998,
          pointerEvents: currentStep.allowAllInteractions ? "none" : "auto", // Allow all clicks if flag set
        }}
      />

      {/* Spotlight cutout - allows clicks through to target */}
      {spotlightStyle && (
        <div
          style={{
            position: "fixed",
            left: spotlightStyle.left,
            top: spotlightStyle.top,
            width: spotlightStyle.width,
            height: spotlightStyle.height,
            zIndex: 9998,
            pointerEvents: "none", // Allow clicks through
            border: `3px solid ${colors.accent}`,
            borderRadius: 12,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px ${colors.accent}`,
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      )}

      {/* Animated arrow pointer */}
      {currentStep.showArrow && arrowPosition && (
        <div
          style={{
            position: "fixed",
            left: arrowPosition.x,
            top: arrowPosition.y,
            transform: `translate(-50%, -50%) rotate(${arrowPosition.rotation}deg)`,
            zIndex: 9999,
            pointerEvents: "none",
            animation: "bounce 1.5s ease-in-out infinite",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 5 L20 30 M20 30 L12 22 M20 30 L28 22"
              stroke={colors.accent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 8px rgba(255,255,255,0.8))"
            />
          </svg>
        </div>
      )}

      {/* Tooltip card */}
      <div
        style={{
          position: "fixed",
          left: isCenterPosition ? "50%" : tooltipPosition?.x,
          top: isCenterPosition ? "50%" : tooltipPosition?.y,
          transform: isCenterPosition ? "translate(-50%, -50%)" : "none",
          width: 320,
          maxWidth: "calc(100vw - 40px)",
          backgroundColor: colors.surface,
          borderRadius: 16,
          border: `2px solid ${colors.accent}`,
          padding: 20,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 2px ${colors.accent}22`,
          zIndex: 10000,
          pointerEvents: "auto",
          animation: "fadeIn 0.3s ease",
        }}
      >
        {/* Progress indicator */}
        <div style={{
          display: "flex",
          gap: 4,
          marginBottom: 12,
        }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: idx <= step ? colors.accent : `${colors.textDim}33`,
                transition: "background-color 0.3s",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: colors.text,
          marginBottom: 8,
        }}>
          {currentStep.title}
        </div>

        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: colors.text,
          lineHeight: 1.5,
          marginBottom: 16,
          opacity: 0.9,
        }}>
          {currentStep.description}
        </div>

        {/* Actions */}
        <div style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
        }}>
          <button
            onClick={onSkip}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              background: "none",
              border: `1px solid ${colors.textDim}55`,
              color: colors.textDim,
              cursor: "pointer",
            }}
          >
            Skip
          </button>

          {!currentStep.autoAdvance && (
            <button
              onClick={onAdvance}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                textTransform: "uppercase",
                letterSpacing: 1,
                background: colors.accent,
                color: colors.bg,
                border: "none",
                cursor: "pointer",
              }}
            >
              {step === steps.length - 1 ? "Got It!" : "Next"}
            </button>
          )}

          {currentStep.autoAdvance && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              fontSize: 10,
              color: colors.textDim,
              fontFamily: "'Inter', sans-serif",
            }}>
              <div style={{
                width: 12,
                height: 12,
                border: `2px solid ${colors.accent}`,
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
              Waiting...
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(${arrowPosition?.rotation || 0}deg) translateY(-5px);
          }
          50% {
            transform: translate(-50%, -50%) rotate(${arrowPosition?.rotation || 0}deg) translateY(5px);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: ${isCenterPosition ? "translate(-50%, -45%)" : "translateY(-10px)"};
          }
          to {
            opacity: 1;
            transform: ${isCenterPosition ? "translate(-50%, -50%)" : "translateY(0)"};
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }
      `}</style>
    </>
  );
}
