import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthProvider, { useAuth } from './components/auth/AuthProvider';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import ActivitiesScreen from './screens/ActivitiesScreen';
import MapModalScreen from './screens/MapModalScreen';

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  Settings: undefined;
  Activities: undefined;
  MapModal: {
    timesheetId: string;
    clockInLocation: { latitude: number; longitude: number };
    clockOutLocation?: { latitude: number; longitude: number };
  };
};

const Stack = createStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { user, loading } = useAuth();

  console.log('🧭 AppNavigator: Auth state', { 
    hasUser: !!user, 
    loading, 
    userEmail: user?.email 
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {user ? (
        // User is signed in
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Activities" component={ActivitiesScreen} />
          <Stack.Screen 
            name="MapModal" 
            component={MapModalScreen}
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Location History',
            }}
          />
        </>
      ) : (
        // User is not signed in
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}