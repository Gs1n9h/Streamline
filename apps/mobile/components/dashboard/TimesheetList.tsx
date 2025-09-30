import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { TimesheetPeriod } from '../../types';

interface TimesheetListProps {
  timesheets: TimesheetPeriod[];
  onTimesheetPress: (timesheetId: string, clockInLocation: any, clockOutLocation?: any) => void;
}

export default function TimesheetList({ timesheets, onTimesheetPress }: TimesheetListProps) {
  const formatDuration = (duration: string) => {
    if (!duration) return '0h 0m';
    
    // Parse PostgreSQL interval format
    let hours = 0;
    let minutes = 0;
    
    if (duration.includes('day')) {
      const dayMatch = duration.match(/(\d+) day/);
      const timeMatch = duration.match(/(\d{2}):(\d{2}):(\d{2})/);
      
      if (dayMatch) hours += parseInt(dayMatch[1]) * 24;
      if (timeMatch) {
        hours += parseInt(timeMatch[1]);
        minutes += parseInt(timeMatch[2]);
      }
    } else if (duration.includes(':')) {
      const timeMatch = duration.match(/(\d{2}):(\d{2}):(\d{2})/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
      }
    }
    
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderTimesheetItem = ({ item }: { item: TimesheetPeriod }) => {
    const hasLocationData = item.clock_in_latitude && item.clock_in_longitude;
    
    return (
      <TouchableOpacity
        style={styles.timesheetItem}
        onPress={() => {
          if (hasLocationData) {
            onTimesheetPress(
              item.id,
              {
                latitude: item.clock_in_latitude,
                longitude: item.clock_in_longitude,
              },
              item.clock_out_latitude && item.clock_out_longitude ? {
                latitude: item.clock_out_latitude,
                longitude: item.clock_out_longitude,
              } : undefined
            );
          }
        }}
        disabled={!hasLocationData}
      >
        <View style={styles.timesheetHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.jobName}>{item.job_name}</Text>
            <Text style={styles.date}>{formatDate(item.clock_in)}</Text>
          </View>
          <View style={styles.durationContainer}>
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
            {hasLocationData && (
              <Text style={styles.locationIcon}>📍</Text>
            )}
          </View>
        </View>
        
        <View style={styles.timeInfo}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>In:</Text>
            <Text style={styles.timeValue}>{formatTime(item.clock_in)}</Text>
          </View>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Out:</Text>
            <Text style={styles.timeValue}>
              {item.clock_out ? formatTime(item.clock_out) : 'Active'}
            </Text>
          </View>
        </View>
        
        {!hasLocationData && (
          <Text style={styles.noLocationText}>
            No location data available
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timesheet History</Text>
        <Text style={styles.headerSubtitle}>
          {timesheets.length} {timesheets.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>
      
      {timesheets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No timesheet entries</Text>
          <Text style={styles.emptySubtitle}>
            Clock in to start tracking your time
          </Text>
        </View>
      ) : (
        <FlatList
          data={timesheets}
          keyExtractor={(item) => item.id}
          renderItem={renderTimesheetItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    paddingBottom: 20,
  },
  timesheetItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timesheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  durationContainer: {
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 4,
  },
  locationIcon: {
    fontSize: 16,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  noLocationText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

