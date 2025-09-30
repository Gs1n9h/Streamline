#!/bin/bash

echo "🔍 Checking iOS Info.plist for location permissions..."
echo ""

if [ -f "ios/streamlinemobile/Info.plist" ]; then
    echo "✅ Info.plist found at: ios/streamlinemobile/Info.plist"
    echo ""
    echo "📋 Location Permission Keys:"
    echo "----------------------------"
    
    if grep -q "NSLocationWhenInUseUsageDescription" ios/streamlinemobile/Info.plist; then
        echo "✅ NSLocationWhenInUseUsageDescription: FOUND"
    else
        echo "❌ NSLocationWhenInUseUsageDescription: MISSING"
    fi
    
    if grep -q "NSLocationAlwaysAndWhenInUseUsageDescription" ios/streamlinemobile/Info.plist; then
        echo "✅ NSLocationAlwaysAndWhenInUseUsageDescription: FOUND"
    else
        echo "❌ NSLocationAlwaysAndWhenInUseUsageDescription: MISSING"
    fi
    
    if grep -q "NSLocationAlwaysUsageDescription" ios/streamlinemobile/Info.plist; then
        echo "✅ NSLocationAlwaysUsageDescription: FOUND"
    else
        echo "❌ NSLocationAlwaysUsageDescription: MISSING"
    fi
    
    if grep -q "UIBackgroundModes" ios/streamlinemobile/Info.plist; then
        echo "✅ UIBackgroundModes: FOUND"
    else
        echo "❌ UIBackgroundModes: MISSING"
    fi
    
    echo ""
    echo "📄 Full location-related entries:"
    echo "----------------------------"
    grep -A 1 "NSLocation" ios/streamlinemobile/Info.plist || echo "No location keys found"
    
else
    echo "❌ Info.plist not found!"
    echo "💡 Run: npx expo prebuild --clean"
fi

echo ""
echo "🔍 Checking Android permissions..."
echo ""

if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
    echo "✅ AndroidManifest.xml found"
    echo ""
    echo "📋 Location Permissions:"
    echo "----------------------------"
    
    if grep -q "ACCESS_FINE_LOCATION" android/app/src/main/AndroidManifest.xml; then
        echo "✅ ACCESS_FINE_LOCATION: FOUND"
    else
        echo "❌ ACCESS_FINE_LOCATION: MISSING"
    fi
    
    if grep -q "ACCESS_BACKGROUND_LOCATION" android/app/src/main/AndroidManifest.xml; then
        echo "✅ ACCESS_BACKGROUND_LOCATION: FOUND"
    else
        echo "❌ ACCESS_BACKGROUND_LOCATION: MISSING"
    fi
    
else
    echo "❌ AndroidManifest.xml not found!"
    echo "💡 Run: npx expo prebuild --clean"
fi

echo ""
echo "✅ Verification complete!"
