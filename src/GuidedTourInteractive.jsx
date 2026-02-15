import React, { useEffect, useState, useRef } from "react";

/**
 * Interactive Guided Tour Component
 *
 * Features:
 * - Spotlight effect that highlights specific UI elements
 * - Tooltips positioned near highlighted elements
 * - Automatic advancement when user performs correct actions
 * - Walks user through their first puzzle
 */

export function GuidedTourInteractive({
  step,
  onAdvance,
  onSkip,
  tourPhase,
  colors,
  view,
  radialMenuStack,
  setRadialMenuStack,
  setView,
  setDifficulty,
  puzzleIndex,
  setPuzzleIndex,
  selectedCell,
  fills,
  puzzle,
  firebaseUser,
}) {
  const [highlightElement, setHighlightElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 });
  const observerRef = useRef(null);

  // Define tour steps with conditions for auto-advancement
  const tourSteps = {
    basic: [
      {
        id: "welcome",
        title: "Welcome to Pattrn!",
        description: "Let's take a quick interactive tour. I'll guide you through your first puzzle!",
        action: "Click Next to begin",
        targetSelector: null, // No highlight for welcome
        advanceCondition: () => false, // Manual advancement
      },
      {
        id: "menu-button",
        title: "Menu Button",
        description: "Click the menu button in the bottom right to get started",
        targetSelector: ".menu-button, [data-tour-id='menu-button']",
        advanceCondition: () => radialMenuStack.length > 0 && radialMenuStack[0] === "root",
      },
      {
        id: "quick-play",
        title: "Quick Play",
        description: "Click 'Quick Play' to choose a puzzle",
        targetSelector: "[data-tour-id='nav-play']",
        advanceCondition: () => radialMenuStack.includes("play"),
      },
      {
        id: "easy-difficulty",
        title: "Choose Easy",
        description: "Select 'Easy' to start with beginner-friendly puzzles",
        targetSelector: "[data-tour-id='easy']",
        advanceCondition: () => view === "play",
      },
      {
        id: "puzzle-intro",
        title: "Let's Solve It!",
        description: "This is a Patterning puzzle. Each row and column must contain the numbers 1-4 exactly once. Click any empty cell to get started!",
        targetSelector: null,
        advanceCondition: () => selectedCell !== null,
      },
      {
        id: "enter-number",
        title: "Enter a Number",
        description: "Great! Now enter a number (1-4) using the keypad at the bottom or your keyboard.",
        targetSelector: ".play-keypad, [data-tour-id='keypad']",
        advanceCondition: () => fills && Object.keys(fills).length > 0,
      },
      {
        id: "keep-going",
        title: "You're Doing Great!",
        description: "Keep filling in cells! Remember: each row and column needs 1-4 exactly once. I'll let you finish on your own now.",
        targetSelector: null,
        advanceCondition: () => fills && Object.keys(fills).length >= 3,
      },
      {
        id: "completion",
        title: "Tour Complete!",
        description: "You're all set! Keep playing to improve your skills. Create an account to track progress and unlock co-op mode!",
        targetSelector: null,
        advanceCondition: () => false, // Manual advancement
      },
    ],
    coop: [
      {
        id: "coop-intro",
        title: "Co-op Mode 🤝",
        description: "Now that you have an account, you can play puzzles with friends in real-time!",
        targetSelector: null,
        advanceCondition: () => false,
      },
      {
        id: "find-coop",
        title: "Find Co-op",
        description: "Open the menu and click 'Co-op' to create or join a multiplayer session",
        targetSelector: "[data-tour-id='coop']",
        advanceCondition: () => radialMenuStack.includes("coop"),
      },
      {
        id: "coop-complete",
        title: "Ready to Play Together!",
        description: "Create a session and invite friends to solve puzzles together. Have fun!",
        targetSelector: null,
        advanceCondition: () => false,
      },
    ],
  };

  const steps = tourSteps[tourPhase] || tourSteps.basic;
  const currentStep = steps[step] || steps[0];

  // Find and highlight target element
  useEffect(() => {
    if (!currentStep.targetSelector) {
      setHighlightElement(null);
      return;
    }

    const findElement = () => {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        setHighlightElement(element);
        updateDimensions(element);
      }
    };

    // Initial find
    findElement();

    // Re-find when DOM changes (e.g., menu opens)
    const timer = setInterval(findElement, 100);

    return () => clearInterval(timer);
  }, [currentStep.targetSelector, step]);

  // Update dimensions when element changes or resizes
  const updateDimensions = (element) => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    setDimensions({
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
    });

    // Position tooltip
    const tooltipHeight = 200;
    const tooltipWidth = 300;
    const padding = 20;

    let top = rect.bottom + padding;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Keep tooltip on screen
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - padding;
    }
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }

    setTooltipPosition({ top, left });
  };

  // Set up ResizeObserver for highlighted element
  useEffect(() => {
    if (!highlightElement) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new ResizeObserver(() => {
      updateDimensions(highlightElement);
    });

    observerRef.current.observe(highlightElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [highlightElement]);

  // Check for auto-advancement conditions
  useEffect(() => {
    if (!currentStep.advanceCondition) return;

    const checkCondition = () => {
      if (currentStep.advanceCondition()) {
        setTimeout(() => onAdvance(), 500); // Small delay for smooth UX
      }
    };

    const interval = setInterval(checkCondition, 100);
    return () => clearInterval(interval);
  }, [currentStep, onAdvance, radialMenuStack, view, puzzleIndex, selectedCell, fills]);

  const isLastStep = step === steps.length - 1;
  const hasHighlight = currentStep.targetSelector && highlightElement;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      pointerEvents: "none", // Allow clicks to pass through except on tooltip
    }}>
      {/* Dark overlay with spotlight cutout */}
      {hasHighlight ? (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={dimensions.left - 8}
                y={dimensions.top - 8}
                width={dimensions.width + 16}
                height={dimensions.height + 16}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      ) : (
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
        }} />
      )}

      {/* Highlight ring around target element */}
      {hasHighlight && (
        <div
          style={{
            position: "absolute",
            top: dimensions.top - 8,
            left: dimensions.left - 8,
            width: dimensions.width + 16,
            height: dimensions.height + 16,
            borderRadius: 12,
            border: `3px solid ${colors.accent}`,
            boxShadow: `0 0 20px ${colors.accent}88, inset 0 0 20px ${colors.accent}33`,
            animation: "pulse 2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{
          position: "absolute",
          top: hasHighlight ? tooltipPosition.top : "50%",
          left: hasHighlight ? tooltipPosition.left : "50%",
          transform: hasHighlight ? "none" : "translate(-50%, -50%)",
          width: 320,
          maxWidth: "calc(100vw - 40px)",
          backgroundColor: colors.surface,
          borderRadius: 16,
          border: `1px solid ${colors.accent}33`,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "fadeUp 0.3s ease both",
          pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.accent}22 0%, ${colors.accent}44 100%)`,
            border: `2px solid ${colors.accent}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}>
            {tourPhase === "coop" ? "🤝" : "👋"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: colors.text,
              lineHeight: 1.2,
            }}>
              {currentStep.title}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: colors.textDim,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}>
              Step {step + 1} of {steps.length}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          color: colors.text,
          lineHeight: 1.6,
          marginBottom: 20,
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
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: 0.5,
              background: "none",
              border: `1px solid ${colors.textDim}44`,
              color: colors.textDim,
              cursor: "pointer",
            }}
          >
            Skip Tour
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {!currentStep.advanceCondition && (
              <button
                onClick={onAdvance}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: 1,
                  background: colors.accent,
                  color: colors.bg,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isLastStep ? "Finish" : "Next"}
              </button>
            )}
          </div>
        </div>

        {/* Waiting indicator for auto-advance steps */}
        {currentStep.advanceCondition && (
          <div style={{
            marginTop: 12,
            padding: 8,
            borderRadius: 8,
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}22`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <div style={{
              width: 16,
              height: 16,
              border: `2px solid ${colors.accent}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: colors.textDim,
            }}>
              Waiting for you to continue...
            </div>
          </div>
        )}
      </div>

      <style>{`
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

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: ${hasHighlight ? "translateY(10px)" : "translate(-50%, calc(-50% + 10px))"};
          }
          to {
            opacity: 1;
            transform: ${hasHighlight ? "translateY(0)" : "translate(-50%, -50%)"};
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
