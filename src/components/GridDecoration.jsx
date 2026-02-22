// --- Grid decoration overlays ---
export const SNOW_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 2 + Math.random() * 4,
  delay: Math.random() * 6,
  duration: 3 + Math.random() * 4,
  drift: -15 + Math.random() * 30,
  opacity: 0.3 + Math.random() * 0.5,
}));

export const BAT_PARTICLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  x: 10 + Math.random() * 80,
  y: 5 + Math.random() * 30,
  size: 10 + Math.random() * 8,
  delay: Math.random() * 4,
  duration: 3 + Math.random() * 2,
}));

export const BUBBLE_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 3 + Math.random() * 6,
  delay: Math.random() * 5,
  duration: 4 + Math.random() * 3,
  opacity: 0.15 + Math.random() * 0.3,
}));

export const PETAL_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 4 + Math.random() * 5,
  delay: Math.random() * 7,
  duration: 4 + Math.random() * 4,
  drift: -20 + Math.random() * 40,
  rotation: Math.random() * 360,
  opacity: 0.25 + Math.random() * 0.35,
}));

export const LEAF_PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 6 + Math.random() * 5,
  delay: Math.random() * 6,
  duration: 4 + Math.random() * 3,
  drift: -25 + Math.random() * 50,
  opacity: 0.2 + Math.random() * 0.25,
}));

export const STAR_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: 5 + Math.random() * 90,
  y: 5 + Math.random() * 90,
  size: 1.5 + Math.random() * 2.5,
  delay: Math.random() * 4,
  duration: 1.5 + Math.random() * 2.5,
  opacity: 0.2 + Math.random() * 0.5,
}));

export const SPRINKLE_PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  width: 6 + Math.random() * 6,
  rotation: Math.random() * 180,
  color: ["#FF6B9D", "#C660E8", "#55D6C2", "#FFBC42", "#FF4F7B", "#00D4AA"][Math.floor(Math.random() * 6)],
  opacity: 0.15 + Math.random() * 0.2,
}));

export const HEART_PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 6 + Math.random() * 6,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 3,
  drift: -10 + Math.random() * 20,
  opacity: 0.12 + Math.random() * 0.18,
}));

export const CONFETTI_PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 3 + Math.random() * 4,
  width: 5 + Math.random() * 7,
  delay: Math.random() * 6,
  duration: 3.5 + Math.random() * 3.5,
  drift: -20 + Math.random() * 40,
  rotation: Math.random() * 360,
  color: ["#FF6B9D", "#FFD700", "#7B68EE", "#00CED1", "#FF8C00", "#FF69B4"][Math.floor(Math.random() * 6)],
  opacity: 0.25 + Math.random() * 0.35,
}));

export const ROTOR_PARTICLES = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  x: 10 + (i * 20),
  y: 15 + (i % 3) * 25,
  size: 14 + Math.random() * 10,
  duration: 6 + Math.random() * 6,
  delay: i * 1.2,
  direction: i % 2 === 0 ? 1 : -1,
  opacity: 0.08 + Math.random() * 0.07,
}));

function GridDecoration({ decoration }) {
  if (!decoration) return null;

  if (decoration === "snow") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {SNOW_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: -8,
            width: p.size, height: p.size, borderRadius: "50%",
            backgroundColor: "#fff", opacity: p.opacity,
            animation: `snowFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }} />
        ))}
        {/* Tinsel top border */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "repeating-linear-gradient(90deg, #C6282800, #C62828 4px, #2E7D32 8px, #FFD700 12px, #2E7D3200 16px)",
          opacity: 0.6, borderRadius: "16px 16px 0 0",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
          background: "repeating-linear-gradient(90deg, #2E7D3200, #FFD700 4px, #C62828 8px, #2E7D32 12px, #C6282800 16px)",
          opacity: 0.6, borderRadius: "0 0 16px 16px",
        }} />
      </div>
    );
  }

  if (decoration === "bats") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {BAT_PARTICLES.map(p => (
          <svg key={p.id} width={p.size} height={p.size * 0.6} viewBox="0 0 24 14" style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            opacity: 0.25,
            animation: `batFloat ${p.duration}s ${p.delay}s ease-in-out infinite`,
          }}>
            <path d="M3,2 L7,8 L10,5 L12,8 L14,5 L17,8 L21,2 C19,6 17,8 12,8 C7,8 5,6 3,2 Z" fill="rgba(255,255,255,0.6)"/>
          </svg>
        ))}
        {/* Web corners */}
        <svg style={{ position: "absolute", top: 0, left: 0, opacity: 0.12 }} width="40" height="40" viewBox="0 0 40 40">
          <path d="M0,0 Q20,5 40,0 M0,0 Q5,20 0,40 M0,0 Q15,15 30,30 M0,0 Q8,20 16,40 M0,0 Q20,8 40,16" fill="none" stroke="white" strokeWidth="0.8"/>
        </svg>
        <svg style={{ position: "absolute", top: 0, right: 0, opacity: 0.12, transform: "scaleX(-1)" }} width="40" height="40" viewBox="0 0 40 40">
          <path d="M0,0 Q20,5 40,0 M0,0 Q5,20 0,40 M0,0 Q15,15 30,30 M0,0 Q8,20 16,40 M0,0 Q20,8 40,16" fill="none" stroke="white" strokeWidth="0.8"/>
        </svg>
      </div>
    );
  }

  if (decoration === "glow") {
    return (
      <div style={{
        position: "absolute", inset: -2, pointerEvents: "none", borderRadius: 18,
        animation: "neonPulse 3s ease-in-out infinite",
        boxShadow: "0 0 15px #FF008044, 0 0 30px #00FF8022, inset 0 0 15px #FF008011",
      }} />
    );
  }

  if (decoration === "bubbles") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {BUBBLE_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, bottom: -10,
            width: p.size, height: p.size, borderRadius: "50%",
            border: "1px solid rgba(100,200,255,0.4)",
            backgroundColor: "rgba(100,200,255,0.08)",
            opacity: p.opacity,
            animation: `bubbleRise ${p.duration}s ${p.delay}s ease-in infinite`,
          }} />
        ))}
        {/* Wave bottom border */}
        <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, opacity: 0.15 }} viewBox="0 0 200 12" preserveAspectRatio="none" height="8">
          <path d="M0,8 C25,2 50,2 75,8 C100,14 125,14 150,8 C175,2 190,2 200,8 L200,12 L0,12 Z" fill="#4FC3F7"/>
        </svg>
      </div>
    );
  }

  if (decoration === "petals") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {PETAL_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: -10,
            width: p.size, height: p.size * 0.6, borderRadius: "50% 0 50% 0",
            backgroundColor: "rgba(255,183,197,0.7)",
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
            animation: `petalFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }} />
        ))}
      </div>
    );
  }

  if (decoration === "rays") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,150,50,0.12) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
          background: "linear-gradient(to top, rgba(200,50,50,0.08), transparent)",
        }} />
      </div>
    );
  }

  if (decoration === "scanlines") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.06,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)",
        }} />
        <div style={{
          position: "absolute", inset: 0, opacity: 0.08,
          animation: "scanlineMove 8s linear infinite",
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,255,150,0.1) 50%, transparent 100%)",
          backgroundSize: "100% 30%",
        }} />
      </div>
    );
  }

  if (decoration === "leaves") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {LEAF_PARTICLES.map(p => (
          <svg key={p.id} width={p.size} height={p.size} viewBox="0 0 12 12" style={{
            position: "absolute", left: `${p.x}%`, top: -12,
            opacity: p.opacity,
            animation: `leafFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }}>
            <path d="M6,1 C9,3 10,7 8,10 C6,12 3,10 2,7 C1,4 3,1 6,1 Z" fill={["#588157", "#A3B18A", "#D4A373", "#40916C"][p.id % 4]} opacity="0.7"/>
          </svg>
        ))}
      </div>
    );
  }

  if (decoration === "stars") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {STAR_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            backgroundColor: "#fff",
            animation: `starTwinkle ${p.duration}s ${p.delay}s ease-in-out infinite`,
            opacity: 0,
          }} />
        ))}
        {/* Nebula tint */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 30% 40%, rgba(123,47,247,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(244,114,182,0.06) 0%, transparent 60%)",
        }} />
      </div>
    );
  }

  if (decoration === "sprinkles") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {SPRINKLE_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.width, height: p.size, borderRadius: p.size,
            backgroundColor: p.color, opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
          }} />
        ))}
      </div>
    );
  }

  if (decoration === "aurora") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "60%",
          background: "linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(99,102,241,0.1) 30%, rgba(14,165,233,0.06) 60%, rgba(192,132,252,0.08) 100%)",
          animation: "auroraShift 6s ease-in-out infinite alternate",
        }} />
        <div style={{
          position: "absolute", top: "10%", left: 0, right: 0, height: "40%",
          background: "linear-gradient(45deg, rgba(52,211,153,0.06) 0%, transparent 50%, rgba(56,189,248,0.06) 100%)",
          animation: "auroraShift 8s 2s ease-in-out infinite alternate-reverse",
        }} />
      </div>
    );
  }

  if (decoration === "hearts") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {HEART_PARTICLES.map(p => (
          <svg key={p.id} width={p.size} height={p.size} viewBox="0 0 12 12" style={{
            position: "absolute", left: `${p.x}%`, bottom: -12,
            opacity: p.opacity,
            animation: `heartFloat ${p.duration}s ${p.delay}s ease-in infinite`,
            "--drift": `${p.drift}px`,
          }}>
            <path d="M6,10 C6,10 2,7 2,4.5 C2,3 3.2,2 4.5,2 C5.3,2 5.7,2.5 6,3 C6.3,2.5 6.7,2 7.5,2 C8.8,2 10,3 10,4.5 C10,7 6,10 6,10 Z" fill={["#FF2D55", "#FF6B8A", "#FFB3C1", "#C9184A"][p.id % 4]} opacity="0.6"/>
          </svg>
        ))}
      </div>
    );
  }

  if (decoration === "springPetals") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {PETAL_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: -10,
            width: p.size, height: p.size * 0.6, borderRadius: "50% 0 50% 0",
            backgroundColor: ["rgba(52,211,153,0.6)", "rgba(251,191,36,0.5)", "rgba(244,114,182,0.5)", "rgba(167,139,250,0.5)"][p.id % 4],
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
            animation: `petalFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }} />
        ))}
      </div>
    );
  }

  if (decoration === "confetti") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {CONFETTI_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: -10,
            width: p.width, height: p.size, borderRadius: 1,
            backgroundColor: p.color, opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }} />
        ))}
        {/* Festive top/bottom borders */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "repeating-linear-gradient(90deg, #FF6B9D00, #FF6B9D 4px, #FFD700 8px, #7B68EE 12px, #00CED100 16px)",
          opacity: 0.5, borderRadius: "16px 16px 0 0",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
          background: "repeating-linear-gradient(90deg, #7B68EE00, #00CED1 4px, #FF8C00 8px, #FF6B9D 12px, #FFD70000 16px)",
          opacity: 0.5, borderRadius: "0 0 16px 16px",
        }} />
      </div>
    );
  }

  if (decoration === "static") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        {/* CRT scanlines */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.12,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
        }} />
        {/* Flicker overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.08,
          backgroundColor: "rgba(255,0,64,0.3)",
          animation: "glitchFlicker 0.15s steps(2) infinite",
        }} />
        {/* Primary glitch scan band - fast */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.25,
          animation: "glitchScan 2s linear infinite",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,0,64,0.3) 45%, rgba(0,255,221,0.3) 55%, transparent 100%)",
          backgroundSize: "100% 15%",
        }} />
        {/* Secondary scan band - offset timing */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.15,
          animation: "glitchScan 3.3s 1s linear infinite reverse",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,0,255,0.25) 48%, rgba(0,255,64,0.2) 52%, transparent 100%)",
          backgroundSize: "100% 10%",
        }} />
        {/* Horizontal glitch displacement bars */}
        <div style={{
          position: "absolute", inset: 0,
          animation: "glitchDisplace 6s steps(1) infinite",
        }}>
          <div style={{
            position: "absolute", left: 0, right: 0, top: "20%", height: 3,
            backgroundColor: "rgba(255,0,64,0.2)",
            boxShadow: "4px 0 0 rgba(0,255,221,0.3), -4px 0 0 rgba(255,0,255,0.3)",
            animation: "glitchBar 4s steps(1) infinite",
          }} />
          <div style={{
            position: "absolute", left: 0, right: 0, top: "65%", height: 2,
            backgroundColor: "rgba(0,255,221,0.15)",
            boxShadow: "3px 0 0 rgba(255,0,64,0.25), -3px 0 0 rgba(255,0,255,0.2)",
            animation: "glitchBar 5.5s 2s steps(1) infinite reverse",
          }} />
        </div>
        {/* RGB split border */}
        <div style={{
          position: "absolute", inset: -1, borderRadius: 17,
          boxShadow: "inset 3px 0 0 rgba(255,0,64,0.25), inset -3px 0 0 rgba(0,255,221,0.25), inset 0 2px 0 rgba(255,0,255,0.15), inset 0 -2px 0 rgba(0,255,64,0.15)",
          animation: "glitchBorder 2s steps(3) infinite",
        }} />
      </div>
    );
  }

  if (decoration === "rotors") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        {/* Slow drifting dark mechanical background */}
        <div style={{
          position: "absolute", inset: "-40%", width: "180%", height: "180%",
          animation: "enigmaBgDrift 20s ease-in-out infinite alternate",
          background: "radial-gradient(ellipse at 30% 25%, rgba(201,168,76,0.06) 0%, transparent 50%), radial-gradient(ellipse at 75% 70%, rgba(140,107,30,0.05) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(91,107,74,0.04) 0%, transparent 60%)",
        }} />
        {/* Animated wiring layer that slowly moves */}
        <svg style={{ position: "absolute", inset: "-20%", width: "140%", height: "140%", opacity: 0.07, animation: "enigmaWireDrift 25s ease-in-out infinite alternate-reverse" }} viewBox="0 0 200 200" preserveAspectRatio="none">
          <path d="M10,30 C40,10 70,70 110,50 S170,90 150,130 S90,150 50,130 S10,90 30,70" fill="none" stroke="rgba(201,168,76,0.9)" strokeWidth="0.7"/>
          <path d="M190,20 C150,40 170,90 130,110 S70,90 90,50 S130,30 170,50" fill="none" stroke="rgba(201,168,76,0.7)" strokeWidth="0.6"/>
          <path d="M30,170 C70,150 50,110 90,90 S150,110 130,150 S70,180 40,160" fill="none" stroke="rgba(201,168,76,0.6)" strokeWidth="0.5"/>
          <path d="M160,180 C130,160 140,120 100,100 S60,130 80,160" fill="none" stroke="rgba(184,150,12,0.5)" strokeWidth="0.5"/>
        </svg>
        {/* Spinning rotor gears */}
        {ROTOR_PARTICLES.map(p => (
          <svg key={p.id} width={p.size} height={p.size} viewBox="0 0 24 24" style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            opacity: p.opacity,
            animation: `enigmaRotor ${p.duration}s ${p.delay}s linear infinite${p.direction < 0 ? " reverse" : ""}`,
          }}>
            <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2"/>
            <circle cx="12" cy="12" r="6" fill="none" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>
            <circle cx="12" cy="12" r="2" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1"/>
            {[0,45,90,135,180,225,270,315].map(angle => (
              <line key={angle}
                x1={12 + Math.cos(angle * Math.PI / 180) * 6}
                y1={12 + Math.sin(angle * Math.PI / 180) * 6}
                x2={12 + Math.cos(angle * Math.PI / 180) * 10}
                y2={12 + Math.sin(angle * Math.PI / 180) * 10}
                stroke="rgba(201,168,76,0.4)" strokeWidth="1.5" strokeLinecap="round"
              />
            ))}
          </svg>
        ))}
        {/* Pulsing brass glow */}
        <div style={{
          position: "absolute", inset: -2, borderRadius: 18,
          animation: "enigmaGlow 4s ease-in-out infinite",
          boxShadow: "inset 0 0 20px rgba(201,168,76,0.06), inset 0 0 60px rgba(140,107,30,0.03)",
        }} />
        {/* Brass mechanical border lines */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), rgba(184,150,12,0.4), rgba(201,168,76,0.3), transparent)",
          borderRadius: "16px 16px 0 0",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), rgba(184,150,12,0.4), rgba(201,168,76,0.3), transparent)",
          borderRadius: "0 0 16px 16px",
        }} />
      </div>
    );
  }

  return null;
}

export default GridDecoration;
