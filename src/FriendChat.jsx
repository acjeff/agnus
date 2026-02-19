// --- FriendChat Component ---
// Chat panel for direct messaging between friends.
// Designed to feel like a classic messaging app (iMessage / WhatsApp style).

import { useState, useEffect, useRef, useCallback } from "react";

export default function FriendChat({
  friendName,      // display name of the friend
  friendPicture,   // profile picture URL (optional)
  messages,        // { [msgId]: { uid, username, text, timestamp } }
  myUid,
  onSend,          // (text) => void
  onBack,          // () => void — navigate back to friends list
  C,               // color constants
  isOnline,        // boolean — whether friend is currently online
}) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef(null);
  const prevMsgCount = useRef(0);

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

  // Also scroll to bottom on initial mount
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
    if (diff < 604800000) { // within a week
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
    return msg.uid === prevMsg.uid && (msg.timestamp - prevMsg.timestamp) < 120000; // within 2 min
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
      {/* Header bar — messaging app style */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "8px 4px 12px",
        borderBottom: `1px solid ${C.border}44`,
        marginBottom: 0,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "none",
            color: C.text,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
            flexShrink: 0,
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Friend avatar — larger */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {friendPicture ? (
            <img src={friendPicture} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              backgroundColor: C.accent + "33",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, color: C.accent, fontWeight: 700,
            }}>
              {(friendName || "?")[0].toUpperCase()}
            </div>
          )}
          {/* Online indicator */}
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: "50%",
            backgroundColor: isOnline ? "#22C55E" : C.textDim + "66",
            border: `2px solid ${C.surface || "#1a1a2e"}`,
            transition: "background-color 0.3s",
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: C.text,
            fontFamily: "'Inter', sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {friendName}
          </div>
          <div style={{
            fontSize: 11, color: isOnline ? "#22C55E" : C.textDim,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
          }}>
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Messages Area — flex to fill all available space */}
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
            {/* Friend avatar in empty state */}
            <div style={{ position: "relative" }}>
              {friendPicture ? (
                <img src={friendPicture} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", opacity: 0.6 }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  backgroundColor: C.accent + "22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color: C.accent + "88", fontWeight: 700,
                }}>
                  {(friendName || "?")[0].toUpperCase()}
                </div>
              )}
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
              Say hi to {friendName}!
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
                  {/* Sender name — only show for first message in a group from friend */}
                  {!isMe && !grouped && (
                    <div style={{
                      fontSize: 10, color: C.accent, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      marginBottom: 3, marginLeft: 4,
                    }}>
                      {msg.username || friendName}
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

      {/* Input bar — messaging app style */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        padding: "10px 0 0",
        borderTop: `1px solid ${C.border}44`,
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          maxLength={200}
          style={{
            flex: 1, padding: "10px 14px",
            borderRadius: 20,
            border: `1px solid ${C.border}`,
            backgroundColor: "rgba(255,255,255,0.04)",
            color: C.text,
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={e => { e.target.style.borderColor = C.accent + "66"; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{
            width: 38, height: 38,
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
