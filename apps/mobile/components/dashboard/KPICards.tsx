import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { TimesheetPeriod } from '../../types';

interface KPICardsProps {
  timesheets: TimesheetPeriod[];
  selectedPeriod: 'today' | 'week' | 'month';
  onPeriodChange: (period: 'today' | 'week' | 'month') => void;
  loading?: boolean;
}

export default function KPICards({
  timesheets,
  selectedPeriod,
  onPeriodChange,
  loading = false,
}: KPICardsProps) {
  const calculateTotalHours = (period: 'today' | 'week' | 'month') => {
    // Parse PostgreSQL interval strings and sum them up
    return timesheets.reduce((total, timesheet) => {
      if (!timesheet.duration) return total;
      
      // Parse PostgreSQL interval format (e.g., "02:30:00" or "1 day 02:30:00")
      const durationStr = timesheet.duration;
      let hours = 0;
      
      // Handle different interval formats
      if (durationStr.includes('day')) {
        const dayMatch = durationStr.match(/(\d+) day/);
        const timeMatch = durationStr.match(/(\d{2}):(\d{2}):(\d{2})/);
        
        if (dayMatch) hours += parseInt(dayMatch[1]) * 24;
        if (timeMatch) {
          hours += parseInt(timeMatch[1]) + parseInt(timeMatch[2]) / 60 + parseInt(timeMatch[3]) / 3600;
        }
      } else if (durationStr.includes(':')) {
        // Simple time format "HH:MM:SS"
        const timeMatch = durationStr.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          hours += parseInt(timeMatch[1]) + parseInt(timeMatch[2]) / 60 + parseInt(timeMatch[3]) / 3600;
        }
      }
      
      return total + hours;
    }, 0);
  };

  const totalHours = calculateTotalHours(selectedPeriod);
  const totalShifts = timesheets.length;
  const averageHoursPerShift = totalShifts > 0 ? totalHours / totalShifts : 0;

  const periods = [
    { key: 'today', label: 'Today', icon: '📅' },
    { key: 'week', label: 'This Week', icon: '📊' },
    { key: 'month', label: 'This Month', icon: '📈' },
  ] as const;

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodSelector}
      >
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && styles.periodButtonActive,
            ]}
            onPress={() => onPeriodChange(period.key)}
            disabled={loading}
          >
            <Text style={styles.periodIcon}>{period.icon}</Text>
            <Text
              style={[
                styles.periodLabel,
                selectedPeriod === period.key && styles.periodLabelActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* KPI Cards */}
      <View style={styles.cardsContainer}>
        <View style={[styles.card, loading && styles.cardLoading]}>
          <Text style={styles.cardIcon}>⏰</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <Text style={styles.cardValue}>{totalHours.toFixed(1)}h</Text>
          )}
          <Text style={styles.cardLabel}>Total Hours</Text>
        </View>

        <View style={[styles.card, loading && styles.cardLoading]}>
          <Text style={styles.cardIcon}>📝</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <Text style={styles.cardValue}>{totalShifts}</Text>
          )}
          <Text style={styles.cardLabel}>Shifts</Text>
        </View>

        <View style={[styles.card, loading && styles.cardLoading]}>
          <Text style={styles.cardIcon}>📊</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <Text style={styles.cardValue}>{averageHoursPerShift.toFixed(1)}h</Text>
          )}
          <Text style={styles.cardLabel}>Avg/Shift</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  periodSelector: {
    marginBottom: 20,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  periodIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  periodLabelActive: {
    color: 'white',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLoading: {
    opacity: 0.7,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

