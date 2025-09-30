# 🎯 Geofencing & Background Tracking Test Guide

## 📱 Testing Background Location Tracking

### Prerequisites
1. **Physical Device Required**: Background location tracking doesn't work in simulators
2. **Location Permissions**: Ensure both foreground and background location permissions are granted
3. **Geofences Created**: Create geofences in the web dashboard settings

### Test Steps

#### 1. **Setup Test Environment**
- Open web dashboard: `http://localhost:3000`
- Go to Settings → Geofencing
- Create a test geofence (e.g., around your current location with 100m radius)
- Activate the geofence

#### 2. **Test Background Tracking**
- Open mobile app
- Check in to start work
- Verify "🔄 Background tracking active" appears in header
- Minimize the app (don't kill it)
- Move around outside the geofence
- Check web dashboard for location pings and geofence events

#### 3. **Test Geofence Detection**
- **Enter Geofence**: Walk into the geofenced area
- **Expected**: Notification on mobile + geofence event recorded
- **Exit Geofence**: Walk out of the geofenced area  
- **Expected**: Notification on mobile + geofence event recorded

#### 4. **Test App Minimized State**
- Check in on mobile app
- Minimize app (press home button)
- Move around (enter/exit geofences)
- **Expected**: Events still recorded in database
- Reopen app to see notifications

#### 5. **Test App Killed State**
- Check in on mobile app
- Kill the app completely (swipe up and close)
- Move around
- **Expected**: No tracking (by design)

### 🔍 Debugging

#### Check Logs
```bash
# In mobile app console, look for:
🎯 Background location update: {latitude, longitude, accuracy}
🎯 Geofence events detected in background: X
📍 Background location ping created
```

#### Check Database
```sql
-- Check location pings
SELECT * FROM streamline.location_pings 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check geofence events  
SELECT * FROM streamline.geofence_events
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

#### Check Permissions
- iOS: Settings → Privacy & Security → Location Services → Streamline → Allow Location Access: "Always"
- Android: Settings → Apps → Streamline → Permissions → Location → "Allow all the time"

### ⚠️ Common Issues

1. **No Background Tracking**: Check if background location permission is granted
2. **No Geofence Events**: Ensure geofences are active and user is moving
3. **App Crashes**: Check console for errors, ensure expo-task-manager is properly configured
4. **No Location Pings**: Verify user is clocked in and location permissions are granted

### 🎯 Expected Behavior

- ✅ **App Active**: Full tracking + notifications
- ✅ **App Minimized**: Background tracking + geofence detection (no UI notifications)
- ❌ **App Killed**: No tracking (by design for privacy/battery)
- ✅ **Reopen App**: Shows accumulated notifications and updates UI

### 📊 Success Metrics

- Location pings created every 30 seconds when clocked in
- Geofence events recorded when entering/exiting areas
- Background tracking continues when app is minimized
- No tracking when app is killed
- Proper notifications when app is reopened
