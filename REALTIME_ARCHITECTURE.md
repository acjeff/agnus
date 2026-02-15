# Real-time Firebase Architecture for Production

## The Problem
Firebase's real-time features don't work in Capacitor iOS because:
1. Firebase JS SDK uses iframes for authentication
2. iOS webviews block iframe-based auth for security
3. The Capacitor Firebase plugin doesn't properly sync with JS SDK

## Solution: WebSocket Proxy Backend

### Architecture
```
[iOS App] <--WebSocket--> [Node.js Backend] <--Firebase SDK--> [Firebase]
```

### Backend Setup (server.js)
```javascript
const admin = require('firebase-admin');
const WebSocket = require('ws');
const express = require('express');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json'),
  databaseURL: 'https://agnus-aaf83-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();
const app = express();
const wss = new WebSocket.Server({ port: 8080 });

// WebSocket connections
const connections = new Map(); // userId -> WebSocket

wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'AUTH':
        // Verify the Firebase ID token from the mobile app
        try {
          const decodedToken = await admin.auth().verifyIdToken(data.token);
          userId = decodedToken.uid;
          connections.set(userId, ws);

          // Subscribe to user's data changes
          const userRef = db.ref(`users/${userId}/data/gameData`);
          userRef.on('value', (snapshot) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'DATA_UPDATE',
                data: snapshot.val()
              }));
            }
          });

          ws.send(JSON.stringify({ type: 'AUTH_SUCCESS' }));
        } catch (error) {
          ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: error.message }));
        }
        break;

      case 'SAVE_DATA':
        // Save data to Firebase
        if (userId) {
          await db.ref(`users/${userId}/data/gameData`).set(data.payload);
        }
        break;
    }
  });

  ws.on('close', () => {
    if (userId) {
      connections.delete(userId);
    }
  });
});

console.log('WebSocket server running on ws://localhost:8080');
```

### Mobile App Changes (websocket.js)
```javascript
let ws = null;
let reconnectTimer = null;

export function connectWebSocket(idToken) {
  ws = new WebSocket('wss://your-backend.com');

  ws.onopen = () => {
    console.log('[WS] Connected');
    // Authenticate with Firebase ID token
    ws.send(JSON.stringify({
      type: 'AUTH',
      token: idToken
    }));
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'AUTH_SUCCESS':
        console.log('[WS] Authenticated');
        break;

      case 'DATA_UPDATE':
        // Real-time data update from Firebase
        handleDataUpdate(message.data);
        break;
    }
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected, reconnecting...');
    reconnectTimer = setTimeout(() => connectWebSocket(idToken), 3000);
  };
}

export function saveData(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'SAVE_DATA',
      payload: data
    }));
  }
}
```

### Deployment
1. Deploy the Node.js backend to a service like:
   - Heroku
   - Railway
   - Render
   - DigitalOcean
   - AWS/GCP

2. Update mobile app to use wss://your-backend.com

3. Update Firebase rules to allow admin SDK access

### Cost Considerations
- Backend hosting: $5-20/month (depending on traffic)
- Firebase: Same as current (data transfer + storage)
- WebSocket connections: ~100-1000 concurrent connections per $5/month server

## Alternative: Polling (Simpler but Less Real-time)
Instead of WebSockets, use REST API with polling:
```javascript
setInterval(async () => {
  const token = await user.getIdToken();
  const response = await fetch(`https://api.your-backend.com/data`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  updateLocalData(data);
}, 5000); // Poll every 5 seconds
```

Pros:
- Much simpler to implement
- No WebSocket infrastructure needed
- Works everywhere

Cons:
- 5-second delay instead of instant updates
- More Firebase reads = higher costs
- Less efficient

## My Recommendation
For production, I would:

1. **Short term (MVP)**: Use the current REST API approach
   - Authentication works
   - Basic CRUD works
   - No real-time, but functional
   - Launch and get user feedback

2. **Medium term**: Add polling for pseudo-real-time
   - 10-second polls for active users
   - Good enough for most use cases
   - Minimal infrastructure

3. **Long term**: Either:
   - Build WebSocket backend if you need true real-time
   - OR rebuild as React Native app
   - OR rebuild as native Swift app

The current implementation you have will work for production - users just won't get instant updates. For a game, that's usually acceptable.
