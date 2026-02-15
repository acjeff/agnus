// Real-time WebSocket client for Capacitor
// Connects to backend server that bridges to Firebase

const WEBSOCKET_URL = process.env.VITE_WEBSOCKET_URL || 'ws://localhost:8080';

let ws = null;
let reconnectTimer = null;
let isConnecting = false;
let isAuthenticated = false;
let pendingMessages = [];
let subscriptions = new Map(); // path -> callback
let requestCallbacks = new Map(); // requestId -> { resolve, reject }
let requestId = 0;

export function initRealtimeClient() {
  const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
  if (!isCapacitor) {
    console.log('[RT] Not in Capacitor, skipping WebSocket');
    return;
  }

  console.log('[RT] Initializing real-time client');
}

export async function connectRealtime(idToken) {
  if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) {
    console.log('[RT] Already connected or connecting');
    return;
  }

  isConnecting = true;
  console.log('[RT] Connecting to', WEBSOCKET_URL);

  return new Promise((resolve, reject) => {
    ws = new WebSocket(WEBSOCKET_URL);

    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
      ws?.close();
    }, 10000);

    ws.onopen = () => {
      console.log('[RT] Connected');
      clearTimeout(timeout);
      isConnecting = false;

      // Authenticate
      ws.send(JSON.stringify({
        type: 'AUTH',
        token: idToken
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message, resolve, reject);
      } catch (error) {
        console.error('[RT] Error parsing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[RT] Disconnected');
      isConnecting = false;
      isAuthenticated = false;

      // Reconnect after 3 seconds
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(async () => {
        if (idToken) {
          try {
            await connectRealtime(idToken);
            // Re-subscribe to all paths
            subscriptions.forEach((callback, path) => {
              subscribeToPath(path, callback);
            });
          } catch (error) {
            console.error('[RT] Reconnection failed:', error);
          }
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('[RT] WebSocket error:', error);
      isConnecting = false;
    };
  });
}

function handleMessage(message, connectResolve, connectReject) {
  console.log('[RT] Received:', message.type);

  switch (message.type) {
    case 'AUTH_SUCCESS':
      isAuthenticated = true;
      console.log('[RT] Authenticated as', message.userId);

      // Send any pending messages
      pendingMessages.forEach(msg => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      });
      pendingMessages = [];

      if (connectResolve) {
        connectResolve();
      }
      break;

    case 'AUTH_ERROR':
      console.error('[RT] Auth failed:', message.error);
      isAuthenticated = false;
      if (connectReject) {
        connectReject(new Error(message.error));
      }
      break;

    case 'DATA':
      // Real-time data update
      const callback = subscriptions.get(message.path);
      if (callback) {
        callback(message.data);
      }
      break;

    case 'GET_SUCCESS':
    case 'SET_SUCCESS':
    case 'UPDATE_SUCCESS':
    case 'PUSH_SUCCESS':
    case 'REMOVE_SUCCESS':
      // Handle async operation responses
      const successCb = requestCallbacks.get(message.requestId);
      if (successCb) {
        successCb.resolve(message);
        requestCallbacks.delete(message.requestId);
      }
      break;

    case 'GET_ERROR':
    case 'SET_ERROR':
    case 'UPDATE_ERROR':
    case 'PUSH_ERROR':
    case 'REMOVE_ERROR':
    case 'ERROR':
      console.error('[RT] Error:', message.error);
      const errorCb = requestCallbacks.get(message.requestId);
      if (errorCb) {
        errorCb.reject(new Error(message.error));
        requestCallbacks.delete(message.requestId);
      }
      break;
  }
}

function sendMessage(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[RT] Not connected, queueing message');
    pendingMessages.push(message);
    return;
  }

  if (!isAuthenticated && message.type !== 'AUTH') {
    pendingMessages.push(message);
    return;
  }

  ws.send(JSON.stringify(message));
}

export function subscribeToPath(path, callback) {
  console.log('[RT] Subscribing to', path);
  subscriptions.set(path, callback);

  sendMessage({
    type: 'SUBSCRIBE',
    path
  });

  // Return unsubscribe function
  return () => {
    console.log('[RT] Unsubscribing from', path);
    subscriptions.delete(path);
    sendMessage({
      type: 'UNSUBSCRIBE',
      path
    });
  };
}

export async function realtimeGet(path) {
  return new Promise((resolve, reject) => {
    const reqId = ++requestId;
    requestCallbacks.set(reqId, { resolve, reject });

    sendMessage({
      type: 'GET',
      path,
      requestId: reqId
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (requestCallbacks.has(reqId)) {
        requestCallbacks.delete(reqId);
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
}

export async function realtimeSet(path, data) {
  return new Promise((resolve, reject) => {
    const reqId = ++requestId;
    requestCallbacks.set(reqId, { resolve, reject });

    sendMessage({
      type: 'SET',
      path,
      data,
      requestId: reqId
    });

    setTimeout(() => {
      if (requestCallbacks.has(reqId)) {
        requestCallbacks.delete(reqId);
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
}

export async function realtimeUpdate(path, data) {
  return new Promise((resolve, reject) => {
    const reqId = ++requestId;
    requestCallbacks.set(reqId, { resolve, reject });

    sendMessage({
      type: 'UPDATE',
      path,
      data,
      requestId: reqId
    });

    setTimeout(() => {
      if (requestCallbacks.has(reqId)) {
        requestCallbacks.delete(reqId);
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
}

export async function realtimePush(path, data) {
  return new Promise((resolve, reject) => {
    const reqId = ++requestId;
    requestCallbacks.set(reqId, { resolve, reject });

    sendMessage({
      type: 'PUSH',
      path,
      data,
      requestId: reqId
    });

    setTimeout(() => {
      if (requestCallbacks.has(reqId)) {
        requestCallbacks.delete(reqId);
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
}

export async function realtimeRemove(path) {
  return new Promise((resolve, reject) => {
    const reqId = ++requestId;
    requestCallbacks.set(reqId, { resolve, reject });

    sendMessage({
      type: 'REMOVE',
      path,
      requestId: reqId
    });

    setTimeout(() => {
      if (requestCallbacks.has(reqId)) {
        requestCallbacks.delete(reqId);
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
}

export function disconnectRealtime() {
  clearTimeout(reconnectTimer);
  subscriptions.clear();
  requestCallbacks.clear();
  pendingMessages = [];
  isAuthenticated = false;

  if (ws) {
    ws.close();
    ws = null;
  }

  console.log('[RT] Disconnected');
}

export function isRealtimeConnected() {
  return ws && ws.readyState === WebSocket.OPEN && isAuthenticated;
}
