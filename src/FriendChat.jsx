// --- FriendChat Component ---
// Chat panel for direct messaging between friends.
// Adapted from VaultChat with friend-specific header and back navigation.

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

  // Format timestamp to relative time
  const formatTime = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - ts;
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Header with back button and friend info */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            width: 28, height: 28, borderRadius: 8,
            backgroundColor: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textDim,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
            flexShrink: 0,
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Friend avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {friendPicture ? (
            <img src={friendPicture} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: C.accent + "33",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: C.accent, fontWeight: 700,
            }}>
              {(friendName || "?")[0].toUpperCase()}
            </div>
          )}
          {/* Online indicator */}
          {isOnline && (
            <div style={{
              position: "absolute", bottom: -1, right: -1,
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: C.correct,
              border: `2px solid ${C.surface}`,
            }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: C.text,
            fontFamily: "'Inter', sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {friendName}
          </div>
          <div style={{
            fontSize: 10, color: isOnline ? C.correct : C.textDim,
            fontFamily: "'Inter', sans-serif",
          }}>
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>

        <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
          {sortedMessages.length} msg{sortedMessages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        data-drawer-scroll
        style={{
          maxHeight: 220, minHeight: 80,
          overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 4,
          padding: 4,
          borderRadius: 8,
          backgroundColor: C.bg + "80",
        }}
      >
        {sortedMessages.length === 0 ? (
          <div style={{
            fontSize: 12, color: C.textDim + "88",
            fontFamily: "'Inter', sans-serif",
            textAlign: "center", padding: "20px 8px",
          }}>
            No messages yet. Say hi!
          </div>
        ) : (
          sortedMessages.map((msg) => {
            const isMe = msg.uid === myUid;
            return (
              <div key={msg.id} style={{
                display: "flex", flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
                gap: 1,
              }}>
                <div style={{
                  fontSize: 10, color: C.textDim,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                }}>
                  {isMe ? "You" : (msg.username || friendName)}
                  <span style={{ fontWeight: 400, marginLeft: 4, opacity: 0.6 }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div style={{
                  padding: "5px 10px",
                  borderRadius: isMe ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                  backgroundColor: isMe ? (C.accent + "22") : (C.surfaceLight),
                  color: C.text,
                  fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                  maxWidth: "85%",
                  wordBreak: "break-word",
                  lineHeight: 1.35,
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 6, alignItems: "center",
      }}>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={200}
          style={{
            flex: 1, padding: "7px 10px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            backgroundColor: C.bg,
            color: C.text,
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "none",
            backgroundColor: inputText.trim() ? C.accent : C.textDim + "33",
            color: inputText.trim() ? C.bg : C.textDim,
            fontSize: 13, fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            cursor: inputText.trim() ? "pointer" : "default",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
