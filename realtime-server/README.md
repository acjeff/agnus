# Agnus Real-time Server

WebSocket server that bridges Capacitor iOS app to Firebase real-time database.

## Setup

1. **Download Firebase Service Account Key**:
   - Go to Firebase Console: https://console.firebase.google.com/project/agnus-aaf83/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in this directory

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Run locally**:
   ```bash
   npm run dev
   ```

## Deployment

### Option 1: Railway (Recommended - Free tier available)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add service account key as environment variable
railway variables set FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccountKey.json)"

# Deploy
railway up
```

### Option 2: Render
1. Create account at render.com
2. New Web Service
3. Connect GitHub repo
4. Set:
   - Build Command: `cd realtime-server && npm install`
   - Start Command: `cd realtime-server && npm start`
5. Add environment variable `FIREBASE_SERVICE_ACCOUNT` with contents of serviceAccountKey.json

### Option 3: Heroku
```bash
heroku create agnus-realtime
heroku config:set FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccountKey.json)"
git subtree push --prefix realtime-server heroku main
```

## Testing

```bash
# Test WebSocket connection
wscat -c ws://localhost:8080

# Send auth message
{"type":"AUTH","token":"YOUR_FIREBASE_ID_TOKEN"}

# Subscribe to path
{"type":"SUBSCRIBE","path":"users/YOUR_USER_ID/data/gameData"}
```

## Production URL
Once deployed, update the mobile app's WebSocket URL in `src/realtimeClient.js` to your production URL (e.g., `wss://agnus-realtime.railway.app`)
