const admin = require('firebase-admin');
const WebSocket = require('ws');
const express = require('express');
require('dotenv').config();

// Initialize Firebase Admin SDK
// You'll need to download serviceAccountKey.json from Firebase Console
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://agnus-aaf83-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();
const app = express();
const PORT = process.env.PORT || 8080;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connections: connections.size });
});

const server = app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Track connections and subscriptions
const connections = new Map(); // userId -> { ws, subscriptions }

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  let userId = null;
  let subscriptions = [];

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data.type, userId ? `from ${userId}` : '');

      switch (data.type) {
        case 'AUTH':
          try {
            // Verify Firebase ID token
            const decodedToken = await admin.auth().verifyIdToken(data.token);
            userId = decodedToken.uid;

            connections.set(userId, { ws, subscriptions });
            console.log(`User authenticated: ${userId}`);

            ws.send(JSON.stringify({
              type: 'AUTH_SUCCESS',
              userId
            }));
          } catch (error) {
            console.error('Auth error:', error);
            ws.send(JSON.stringify({
              type: 'AUTH_ERROR',
              error: error.message
            }));
          }
          break;

        case 'SUBSCRIBE':
          if (!userId) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Not authenticated' }));
            return;
          }

          // Subscribe to a Firebase path
          const path = data.path;
          const ref = db.ref(path);

          const listener = ref.on('value', (snapshot) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'DATA',
                path: path,
                data: snapshot.val()
              }));
            }
          });

          subscriptions.push({ path, ref, listener });
          console.log(`User ${userId} subscribed to ${path}`);
          break;

        case 'UNSUBSCRIBE':
          if (!userId) return;

          const unsubPath = data.path;
          subscriptions = subscriptions.filter(sub => {
            if (sub.path === unsubPath) {
              sub.ref.off('value', sub.listener);
              console.log(`User ${userId} unsubscribed from ${unsubPath}`);
              return false;
            }
            return true;
          });

          if (connections.has(userId)) {
            connections.get(userId).subscriptions = subscriptions;
          }
          break;

        case 'SET':
          if (!userId) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Not authenticated' }));
            return;
          }

          try {
            await db.ref(data.path).set(data.data);
            ws.send(JSON.stringify({
              type: 'SET_SUCCESS',
              path: data.path
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'SET_ERROR',
              path: data.path,
              error: error.message
            }));
          }
          break;

        case 'UPDATE':
          if (!userId) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Not authenticated' }));
            return;
          }

          try {
            await db.ref(data.path).update(data.data);
            ws.send(JSON.stringify({
              type: 'UPDATE_SUCCESS',
              path: data.path
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'UPDATE_ERROR',
              path: data.path,
              error: error.message
            }));
          }
          break;

        case 'PUSH':
          if (!userId) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Not authenticated' }));
            return;
          }

          try {
            const newRef = await db.ref(data.path).push(data.data);
            ws.send(JSON.stringify({
              type: 'PUSH_SUCCESS',
              path: data.path,
              key: newRef.key
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'PUSH_ERROR',
              path: data.path,
              error: error.message
            }));
          }
          break;

        case 'REMOVE':
          if (!userId) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Not authenticated' }));
            return;
          }

          try {
            await db.ref(data.path).remove();
            ws.send(JSON.stringify({
              type: 'REMOVE_SUCCESS',
              path: data.path
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'REMOVE_ERROR',
              path: data.path,
              error: error.message
            }));
          }
          break;

        case 'GET':
          if (!userId) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Not authenticated' }));
            return;
          }

          try {
            const snapshot = await db.ref(data.path).once('value');
            ws.send(JSON.stringify({
              type: 'GET_SUCCESS',
              path: data.path,
              data: snapshot.val()
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'GET_ERROR',
              path: data.path,
              error: error.message
            }));
          }
          break;

        default:
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: `Unknown message type: ${data.type}`
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Connection closed${userId ? ` for user ${userId}` : ''}`);

    // Clean up subscriptions
    subscriptions.forEach(sub => {
      sub.ref.off('value', sub.listener);
    });

    if (userId) {
      connections.delete(userId);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log(`WebSocket server ready on port ${PORT}`);
console.log('Waiting for connections...');
