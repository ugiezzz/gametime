# 🎮 Riot API Security Setup Guide

## 🔧 **Secure Riot API Implementation**

Your Riot API integration has been updated to use secure Firebase Cloud Functions instead of exposing the API key in the frontend.

### **✅ What Changed**

1. **Removed exposed API key** from `app.json`
2. **Created secure cloud functions** for all Riot API calls
3. **Updated frontend** to use cloud functions instead of direct API calls
4. **Added proper authentication** and error handling

---

## 🚀 **Deployment Steps**

### **Step 1: Set Riot API Key as Firebase Secret**

```bash
# Navigate to your project directory
cd gameTime

# Set the Riot API key as a Firebase secret
firebase functions:secrets:set RIOT_API_KEY
# When prompted, enter your Riot API key: RGAPI-your-actual-key-here
```

### **Step 2: Deploy Cloud Functions**

```bash
# Deploy the updated cloud functions
firebase deploy --only functions
```

### **Step 3: Test the Integration**

```bash
# Test the app to ensure Riot API calls work
npm start
```

---

## 🔍 **Available Cloud Functions**

### **1. `resolveSummonerId`**
- **Purpose**: Resolves Riot ID to PUUID and Summoner ID
- **Input**: `{ riotId: "GameName#TAG", region: "NA1" }`
- **Output**: `{ puuid: "...", summonerId: "...", gameName: "...", tagLine: "...", region: "...", superRegion: "..." }`

### **2. `getActiveGameStatus`**
- **Purpose**: Checks if a player is currently in game
- **Input**: `{ puuid: "...", region: "NA1" }`
- **Output**: `{ inGame: true/false, elapsedMinutes?: number, gameMode?: string, gameType?: string }`

---

## 🛡️ **Security Features**

### **✅ Authentication Required**
- All functions require user authentication
- Prevents unauthorized API usage

### **✅ Rate Limit Handling**
- Proper error handling for Riot API rate limits
- User-friendly error messages

### **✅ API Key Protection**
- Key stored as Firebase secret (encrypted)
- Never exposed in frontend code
- Only accessible by cloud functions

### **✅ Error Handling**
- Specific error messages for different failure scenarios
- Proper logging for debugging

---

## 🔧 **Frontend Usage**

The frontend automatically uses the new secure implementation:

```typescript
import { resolveSummonerId, getActiveGameStatus } from '@/services/riotService';

// These now use secure cloud functions automatically
const result = await resolveSummonerId('GameName#TAG', 'NA1');
const gameStatus = await getActiveGameStatus(puuid, 'NA1');
```

---

## 🚨 **Important Notes**

### **🔑 API Key Management**
- **NEVER** commit API keys to git
- Use `firebase functions:secrets:set` for production
- Regenerate the old exposed key from Riot Developer Portal

### **🌍 Regions Supported**
- Americas: BR1, LA1, LA2, NA1, OC1
- Europe: EUN1, EUW1, TR1, RU
- Asia: JP1, KR
- SEA: PH2, SG2, TH2, TW2, VN2

### **⚡ Performance**
- Cloud functions add ~100-200ms latency
- Caching can be implemented if needed
- Rate limits are shared across all users

---

## 🔍 **Troubleshooting**

### **Functions not deploying:**
```bash
# Check Firebase CLI login
firebase login

# Verify project is selected
firebase use --add

# Check functions syntax
cd functions && npm run lint
```

### **API calls failing:**
```bash
# Check function logs
firebase functions:log

# Verify secret is set
firebase functions:secrets:access RIOT_API_KEY
```

### **Authentication errors:**
- Ensure user is signed in before making Riot API calls
- Check Firebase Auth configuration

---

## ✅ **Success Indicators**

- ✅ `firebase deploy --only functions` succeeds
- ✅ No API key visible in app.json
- ✅ Riot ID resolution works in app
- ✅ Game status checking works
- ✅ No console warnings about deprecated functions

**Your Riot API integration is now secure!** 🎉

