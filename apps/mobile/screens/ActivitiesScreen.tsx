import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
// Using emoji icons for consistency with the rest of the app
import { RootStackParamList } from '../App';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase';
import ModernTimesheetList from '../components/dashboard/ModernTimesheetList';
import { TimesheetPeriod } from '../types';

type ActivitiesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Activities'>;

export default function ActivitiesScreen() {
  const navigation = useNavigation<ActivitiesScreenNavigationProp>();
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<TimesheetPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const fetchTimesheets = async (period: 'today' | 'week' | 'month', showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!membership) return;

      let startDate: Date;
      const now = new Date();

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
          startDate = new Date(now.setDate(diff));
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          id,
          clock_in,
          clock_out,
          clock_in_latitude,
          clock_in_longitude,
          clock_out_latitude,
          clock_out_longitude,
          jobs!inner (
            id,
            name
          )
        `)
        .eq('staff_id', user?.id)
        .eq('company_id', membership.company_id)
        .gte('clock_in', startDate.toISOString())
        .order('clock_in', { ascending: false });

      if (error) throw error;

      const formattedTimesheets = data?.map(timesheet => ({
        id: timesheet.id,
        clock_in: timesheet.clock_in,
        clock_out: timesheet.clock_out,
        clock_in_latitude: timesheet.clock_in_latitude,
        clock_in_longitude: timesheet.clock_in_longitude,
        clock_out_latitude: timesheet.clock_out_latitude,
        clock_out_longitude: timesheet.clock_out_longitude,
        job_name: timesheet.jobs.name,
        duration: timesheet.clock_out 
          ? calculateDuration(timesheet.clock_in, timesheet.clock_out)
          : calculateDuration(timesheet.clock_in, new Date().toISOString())
      })) || [];

      setTimesheets(formattedTimesheets);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadData = async () => {
    await fetchTimesheets(selectedPeriod);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePeriodChange = async (period: 'today' | 'week' | 'month') => {
    setSelectedPeriod(period);
    await fetchTimesheets(period, true);
  };

  const navigateToMap = (timesheetId: string, clockInLocation: any, clockOutLocation?: any) => {
    navigation.navigate('MapModal', {
      timesheetId,
      clockInLocation,
      clockOutLocation,
    });
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const getPeriodLabel = (period: 'today' | 'week' | 'month') => {
    switch (period) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Recent Activities</Text>
          <Text style={styles.headerSubtitle}>
            {timesheets.length} {timesheets.length === 1 ? 'entry' : 'entries'} • {getPeriodLabel(selectedPeriod)}
          </Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['today', 'week', 'month'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => handlePeriodChange(period)}
            disabled={loading}
          >
            <Text style={styles.periodIcon}>
              {period === 'today' ? '📅' : period === 'week' ? '📊' : '📈'}
            </Text>
            <Text
              style={[
                styles.periodLabel,
                selectedPeriod === period && styles.periodLabelActive,
              ]}
            >
              {getPeriodLabel(period)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Activities List */}
      <View style={styles.content}>
        <ModernTimesheetList
          timesheets={timesheets}
          onTimesheetPress={navigateToMap}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  periodIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  periodLabelActive: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
});
