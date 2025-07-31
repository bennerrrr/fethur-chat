# 🎤 Voice Chat Troubleshooting Guide

## 🚨 **Common Voice Chat Issues**

### **Issue: Voice Controls Disabled After Connection**

**Symptoms**:
- WebSocket connection successful but voice controls remain grayed out
- Console shows "WebSocket is open but not registered"
- Cannot join voice channels despite successful connection

**Quick Fixes** (try in order):

1. **Wait and Retry** (2-3 seconds)
   - Sometimes the registration completes automatically
   - Try clicking "Join Voice" again

2. **Page Refresh**
   - Refresh the browser page
   - Re-login if necessary
   - Try joining voice channel again

3. **Manual Re-registration** (Advanced)
   - Open browser console (F12)
   - Run: `voiceClient.forceReRegistration()`
   - Wait for success message
   - Try joining voice channel

4. **Check Registration State**
   - Open browser console (F12)
   - Run: `voiceClient.checkAndFixRegistration()`
   - Check console output for registration status

## 🔧 **Debugging Commands**

### **Available Console Methods**:

```javascript
// Check current registration state
voiceClient.checkAndFixRegistration()

// Manually trigger registration
voiceClient.triggerRegistration()

// Force re-registration
voiceClient.forceReRegistration()

// Show detailed state information
voiceClient.debugState()

// Test WebRTC connection
voiceClient.testWebRTCConnection()

// Check backend connectivity
voiceClient.checkBackendConnectivity()
```

### **Understanding Console Output**:

**✅ Successful Registration**:
```
=== TRIGGERING REGISTRATION ===
Sending ping to trigger registration...
Registration triggered successfully!
Final state after registration trigger: {isRegistered: true, ...}
```

**❌ Failed Registration**:
```
=== TRIGGERING REGISTRATION ===
Sending ping to trigger registration...
Registration trigger timeout
Final state after registration trigger: {isRegistered: false, ...}
```

## 🐛 **Root Cause Analysis**

### **Why This Happens**:
The voice chat registration involves a complex sequence:
1. WebSocket connection establishment
2. Client registration in voice hub
3. 'connected' message delivery to client
4. Client state update to `isRegistered: true`

**Race Condition**: Sometimes step 3 fails due to timing issues, leaving the client connected but not registered.

### **Technical Details**:
- **Client State**: `isConnected: true` but `isRegistered: false`
- **Server State**: Client registered in hub but 'connected' message not delivered
- **Impact**: Voice controls disabled, cannot join channels

## 🛠️ **Advanced Troubleshooting**

### **Server-Side Debugging**:
```bash
# Check voice hub status
curl -k https://localhost:8081/api/voice/stats

# Check server logs
tail -f logs/server.log | grep -i voice
```

### **Client-Side Debugging**:
```javascript
// Monitor WebSocket messages
voiceClient.ws.addEventListener('message', (event) => {
    console.log('WebSocket message:', JSON.parse(event.data));
});

// Monitor state changes
voiceClient.stateStore.subscribe(state => {
    console.log('Voice state changed:', state);
});
```

## 📞 **Getting Help**

If the above solutions don't work:

1. **Check the logs**: Look for error messages in browser console and server logs
2. **Report the issue**: Include console output and steps to reproduce
3. **Temporary workaround**: Use text chat until voice is fixed

## 🔄 **Prevention**

To minimize registration issues:
- Wait for page to fully load before joining voice
- Avoid rapid connect/disconnect cycles
- Use stable network connections
- Keep browser updated

---

**Last Updated**: 2025-07-30
**Related**: [VOICE_CHAT_FIXES_SUMMARY.md](../VOICE_CHAT_FIXES_SUMMARY.md) 