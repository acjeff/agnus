# Real-time Firebase Setup for iOS

This app now has **real-time Firebase features** for iOS via a WebSocket backend.

## Architecture

```
[iOS App] <--WebSocket--> [Node.js Server] <--Firebase Admin SDK--> [Firebase]
```

- **iOS App**: Uses Capacitor with native Firebase Auth + WebSocket client
- **Node.js Server**: Bridges WebSocket to Firebase, enabling real-time features
- **Firebase**: Your database with real-time capabilities

## Quick Start

### 1. Start the Real-time Server Locally

```bash
cd realtime-server

# Install dependencies
npm install

# Download Firebase service account key
# Go to: https://console.firebase.google.com/project/agnus-aaf83/settings/serviceaccounts/adminsdk
# Click "Generate new private key"
# Save as serviceAccountKey.json in realtime-server/

# Start server
npm run dev
```

Server will run on `ws://localhost:8080`

### 2. Test the iOS App

```bash
# From project root
npm run build
npx cap sync ios
open ios/App/App.xcworkspace
```

Run in Xcode - the app will:
1. Authenticate with Firebase (native)
2. Connect to WebSocket server (localhost:8080)
3. Use real-time features automatically!

## How It Works

### When you're connected to real-time server:
- ✅ Real-time data updates (instant)
- ✅ Live multiplayer features
- ✅ Presence tracking
- ✅ All Firebase real-time features work

### When real-time server is unavailable:
- ✅ Automatic fallback to REST API
- ✅ Authentication still works
- ✅ Data sync still works
- ❌ No real-time updates (must refresh manually)

## Production Deployment

### Option 1: Railway (Recommended)

```bash
cd realtime-server

# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway init

# Set environment variables
railway variables set FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccountKey.json)"
railway variables set FIREBASE_DATABASE_URL="https://agnus-aaf83-default-rtdb.europe-west1.firebasedatabase.app"

# Deploy
railway up

# Get your URL (will be something like https://xxx.railway.app)
railway status
```

### Option 2: Render

1. Go to [render.com](https://render.com)
2. New Web Service → Connect GitHub repo
3. Settings:
   - **Build Command**: `cd realtime-server && npm install`
   - **Start Command**: `cd realtime-server && npm start`
   - **Environment Variables**:
     - `FIREBASE_SERVICE_ACCOUNT`: (paste contents of serviceAccountKey.json)
     - `FIREBASE_DATABASE_URL`: `https://agnus-aaf83-default-rtdb.europe-west1.firebasedatabase.app`

### Option 3: Heroku

```bash
cd realtime-server
heroku create agnus-realtime
heroku config:set FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccountKey.json)"
heroku config:set FIREBASE_DATABASE_URL="https://agnus-aaf83-default-rtdb.europe-west1.firebasedatabase.app"
git push heroku main
```

### Update iOS App with Production URL

Once deployed, update `.env`:

```env
# Change from:
VITE_WEBSOCKET_URL=ws://localhost:8080

# To your production URL:
VITE_WEBSOCKET_URL=wss://your-app.railway.app
```

Then rebuild:
```bash
npm run build
npx cap sync ios
```

## Testing Real-time Features

### Test WebSocket Connection

```bash
# Install wscat
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8080

# Send auth message (get token from iOS app logs)
{"type":"AUTH","token":"YOUR_FIREBASE_ID_TOKEN"}

# Subscribe to data
{"type":"SUBSCRIBE","path":"users/YOUR_USER_ID/data/gameData"}

# You should see DATA messages when data changes!
```

### Test in iOS App

1. Sign in to the app
2. Check logs for `[RT] Connected`
3. Make changes to data
4. Changes should sync instantly across devices!

## Cost Estimate

### Railway (Free Tier)
- **$0/month** for 500 hours (20+ days)
- **$5/month** for unlimited

### Render (Free Tier)
- **$0/month** with auto-sleep (spins up in ~30s)
- **$7/month** for always-on

### Firebase
- Same as current usage
- Real-time features use Firebase bandwidth (generous free tier)

## Troubleshooting

### "Failed to connect to real-time server"
- Make sure server is running (`cd realtime-server && npm run dev`)
- Check firewall/network settings
- Verify `VITE_WEBSOCKET_URL` in `.env`

### "AUTH_ERROR"
- Check Firebase service account key is valid
- Verify user is authenticated in iOS app

### Real-time updates not working
- Check WebSocket connection in logs: look for `[RT] Connected`
- Verify subscriptions: look for `[RT] Subscribing to...`
- Check server logs for errors

## Next Steps

1. ✅ Test locally with `npm run dev` in realtime-server
2. ✅ Verify iOS app connects and syncs
3. 🚀 Deploy to Railway/Render/Heroku
4. 🔄 Update .env with production URL
5. 📱 Rebuild and ship iOS app

Your app now has **full real-time Firebase features**! 🎉
