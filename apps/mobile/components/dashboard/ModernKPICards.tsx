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

interface ModernKPICardsProps {
  timesheets: TimesheetPeriod[];
  selectedPeriod: 'today' | 'week' | 'month';
  onPeriodChange: (period: 'today' | 'week' | 'month') => void;
  loading?: boolean;
}

export default function ModernKPICards({
  timesheets,
  selectedPeriod,
  onPeriodChange,
  loading = false,
}: ModernKPICardsProps) {
  const calculateTotalHours = (period: 'today' | 'week' | 'month') => {
    return timesheets.reduce((total, timesheet) => {
      if (!timesheet.duration) return total;
      
      let hours = 0;
      
      if (timesheet.duration.includes('day')) {
        const dayMatch = timesheet.duration.match(/(\d+) day/);
        const timeMatch = timesheet.duration.match(/(\d{2}):(\d{2}):(\d{2})/);
        
        if (dayMatch) hours += parseInt(dayMatch[1]) * 24;
        if (timeMatch) {
          hours += parseInt(timeMatch[1]) + parseInt(timeMatch[2]) / 60 + parseInt(timeMatch[3]) / 3600;
        }
      } else if (timesheet.duration.includes(':')) {
        const timeMatch = timesheet.duration.match(/(\d{2}):(\d{2}):(\d{2})/);
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
        contentContainerStyle={styles.periodSelectorContent}
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
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>⏰</Text>
            <Text style={styles.cardTitle}>Hours</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text style={styles.cardValue}>{totalHours.toFixed(1)}</Text>
          )}
          <Text style={styles.cardUnit}>hrs</Text>
        </View>

        <View style={[styles.card, loading && styles.cardLoading]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📝</Text>
            <Text style={styles.cardTitle}>Shifts</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text style={styles.cardValue}>{totalShifts}</Text>
          )}
          <Text style={styles.cardUnit}>total</Text>
        </View>

        <View style={[styles.card, loading && styles.cardLoading]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>Average</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text style={styles.cardValue}>{averageHoursPerShift.toFixed(1)}</Text>
          )}
          <Text style={styles.cardUnit}>hrs/shift</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  periodSelector: {
    marginBottom: 20,
  },
  periodSelectorContent: {
    paddingHorizontal: 4,
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
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardLoading: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardUnit: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
