// --- VaultChat Component ---
// Chat panel rendered inside the Liquid Glass menu for vault coop sessions.
// Matches the FriendChat messaging UI style (iMessage / WhatsApp feel).

import { useState, useEffect, useRef, useCallback } from "react";

export default function VaultChat({
  messages,        // { [msgId]: { uid, username, text, timestamp } }
  myUid,
  onSend,          // (text) => void
  C,               // color constants
  onClose,         // () => void — optional close handler
}) {
  const [inputText, setInputText] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scrollRef = useRef(null);
  const prevMsgCount = useRef(0);
  const inputRef = useRef(null);

  // Detect mobile keyboard via visualViewport API
  useEffect(() => {
    const vv = typeof window !== "undefined" && window.visualViewport;
    if (!vv) return;
    const threshold = 100;
    const fullHeight = window.innerHeight;
    const onResize = () => {
      const isKb = fullHeight - vv.height > threshold;
      setKeyboardOpen(isKb);
      if (isKb && scrollRef.current) {
        requestAnimationFrame(() => {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        });
      }
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // Sort messages by timestamp
  const sortedMessages = Object.entries(messages || {})
    .map(([id, msg]) => ({ id, ...msg }))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (sortedMessages.length > prevMsgCount.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevMsgCount.current = sortedMessages.length;
  }, [sortedMessages.length]);

  // Scroll to bottom on initial mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setInputText("");
  }, [inputText, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Format timestamp — show time for today, date for older
  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "now";
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    if (diff < 604800000) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days[date.getDay()] + " " + date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Check if we should show a date separator between messages
  const shouldShowDateSep = (msg, prevMsg) => {
    if (!prevMsg) return true;
    const d1 = new Date(msg.timestamp || 0);
    const d2 = new Date(prevMsg.timestamp || 0);
    return d1.toDateString() !== d2.toDateString();
  };

  // Check if consecutive messages from same sender (for grouping)
  const isSameSender = (msg, prevMsg) => {
    if (!prevMsg) return false;
    return msg.uid === prevMsg.uid && (msg.timestamp - prevMsg.timestamp) < 120000;
  };

  const formatDateSep = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: keyboardOpen ? "4px 4px 4px" : "8px 4px 12px",
        borderBottom: `1px solid ${C.border}44`,
        marginBottom: 0,
        flexShrink: 0,
        transition: "padding 0.2s ease",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: keyboardOpen ? 13 : 15, fontWeight: 700, color: C.text,
            fontFamily: "'Inter', sans-serif",
            transition: "font-size 0.2s ease",
          }}>
            Vault Chat
          </div>
          {!keyboardOpen && (
            <div style={{
              fontSize: 11, color: C.textDim,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
            }}>
              {sortedMessages.length} message{sortedMessages.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        data-drawer-scroll
        style={{
          flex: 1, minHeight: 0,
          overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 2,
          padding: "12px 4px 8px",
        }}
      >
        {sortedMessages.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            padding: "40px 20px",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              backgroundColor: C.accent + "22",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.accent + "88"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div style={{
              fontSize: 13, color: C.textDim + "99",
              fontFamily: "'Inter', sans-serif",
              textAlign: "center",
            }}>
              No messages yet
            </div>
            <div style={{
              fontSize: 11, color: C.textDim + "66",
              fontFamily: "'Inter', sans-serif",
              textAlign: "center",
            }}>
              Say something to your co-op partner!
            </div>
          </div>
        ) : (
          sortedMessages.map((msg, idx) => {
            const isMe = msg.uid === myUid;
            const prevMsg = idx > 0 ? sortedMessages[idx - 1] : null;
            const showDate = shouldShowDateSep(msg, prevMsg);
            const grouped = !showDate && isSameSender(msg, prevMsg);

            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDate && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: idx === 0 ? "0 0 8px" : "12px 0 8px",
                  }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: C.border + "44" }} />
                    <span style={{
                      fontSize: 10, color: C.textDim, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: 0.3, textTransform: "uppercase",
                    }}>
                      {formatDateSep(msg.timestamp)}
                    </span>
                    <div style={{ flex: 1, height: 1, backgroundColor: C.border + "44" }} />
                  </div>
                )}

                {/* Message bubble */}
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                  marginTop: grouped ? 2 : 8,
                }}>
                  {/* Sender name — only show for first message in a group from partner */}
                  {!isMe && !grouped && (
                    <div style={{
                      fontSize: 10, color: C.accent, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      marginBottom: 3, marginLeft: 4,
                    }}>
                      {msg.username || "Partner"}
                    </div>
                  )}
                  <div style={{
                    display: "flex", alignItems: "flex-end", gap: 6,
                    flexDirection: isMe ? "row-reverse" : "row",
                  }}>
                    <div style={{
                      padding: "8px 12px",
                      borderRadius: isMe
                        ? (grouped ? "16px 4px 4px 16px" : "16px 16px 4px 16px")
                        : (grouped ? "4px 16px 16px 4px" : "16px 16px 16px 4px"),
                      backgroundColor: isMe ? (C.accent + "28") : "rgba(255,255,255,0.06)",
                      border: isMe ? `1px solid ${C.accent}22` : "1px solid rgba(255,255,255,0.06)",
                      color: C.text,
                      fontSize: 13,
                      fontFamily: "'Inter', sans-serif",
                      maxWidth: "80%",
                      wordBreak: "break-word",
                      lineHeight: 1.4,
                    }}>
                      {msg.text}
                    </div>
                    {/* Timestamp — show on last message of group or non-grouped */}
                    {(!sortedMessages[idx + 1] || !isSameSender(sortedMessages[idx + 1], msg) || shouldShowDateSep(sortedMessages[idx + 1] || {}, msg)) && (
                      <span style={{
                        fontSize: 9, color: C.textDim + "88",
                        fontFamily: "'Inter', sans-serif",
                        flexShrink: 0, alignSelf: "flex-end",
                        marginBottom: 2,
                      }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input bar */}
      <div style={{
        display: "flex", gap: keyboardOpen ? 6 : 8, alignItems: "center",
        padding: keyboardOpen ? "6px 0 0" : "10px 0 0",
        borderTop: `1px solid ${C.border}44`,
        flexShrink: 0,
        transition: "padding 0.2s ease, gap 0.2s ease",
      }}>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          maxLength={200}
          style={{
            flex: 1, padding: keyboardOpen ? "8px 12px" : "10px 14px",
            borderRadius: 20,
            border: `1px solid ${C.border}`,
            backgroundColor: "rgba(255,255,255,0.04)",
            color: C.text,
            fontSize: keyboardOpen ? 13 : 14,
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            transition: "border-color 0.15s, padding 0.2s ease, font-size 0.2s ease",
          }}
          onFocus={e => { e.target.style.borderColor = C.accent + "66"; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{
            width: keyboardOpen ? 34 : 38, height: keyboardOpen ? 34 : 38,
            borderRadius: "50%",
            border: "none",
            backgroundColor: inputText.trim() ? C.accent : C.textDim + "22",
            color: inputText.trim() ? C.bg : C.textDim,
            cursor: inputText.trim() ? "pointer" : "default",
            transition: "all 0.2s",
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width={keyboardOpen ? 16 : 18} height={keyboardOpen ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Helper: count unread messages since last read timestamp
export function getUnreadCount(messages, lastReadTimestamp, myUid) {
  if (!messages || !lastReadTimestamp) return Object.keys(messages || {}).length;
  let count = 0;
  for (const msg of Object.values(messages || {})) {
    if (msg.uid !== myUid && msg.timestamp > lastReadTimestamp) count++;
  }
  return count;
}
