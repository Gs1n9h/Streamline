#!/bin/bash

echo "🚀 Streamline Mobile - Build Helper"
echo ""
echo "📋 Choose your build option:"
echo ""
echo "1) Expo Go (Quick, Limited Features)"
echo "2) Development Build (Full Features, Background Tracking)"
echo "3) Production Build (EAS Build)"
echo ""
echo "Enter your choice (1-3):"

read choice

case $choice in
    1)
        echo "📱 Starting Expo Go..."
        echo "💡 This gives you: Location pings, Geofencing, Clock in/out"
        echo "❌ This does NOT give you: Background tracking when app is closed"
        npx expo start
        ;;
    2)
        echo "🔧 Creating Development Build..."
        echo "💡 This gives you: ALL features including background tracking"
        echo "⏳ This takes 5-10 minutes..."
        npx expo run:ios --no-dev-client
        ;;
    3)
        echo "🏭 Creating Production Build (EAS)..."
        echo "💡 This gives you: Optimized app ready for App Store"
        echo "⏳ This takes 15-30 minutes..."
        npx eas build --platform ios --profile production
        ;;
    *)
        echo "❌ Invalid choice. Please run again and select 1, 2, or 3."
        ;;
esac
