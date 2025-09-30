import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { TimesheetPeriod } from '../../types';

interface ModernTimesheetListProps {
  timesheets: TimesheetPeriod[];
  onTimesheetPress: (timesheetId: string, clockInLocation: any, clockOutLocation?: any) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function ModernTimesheetList({ 
  timesheets, 
  onTimesheetPress, 
  refreshing = false,
  onRefresh 
}: ModernTimesheetListProps) {
  const formatDuration = (duration: string) => {
    if (!duration) return '0h 0m';
    
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
    yesterday.setDate(today.getDate() - 1);
    
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
              <View style={styles.locationBadge}>
                <Text style={styles.locationIcon}>📍</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.timeInfo}>
          <View style={styles.timeItem}>
            <View style={styles.timeDot} />
            <Text style={styles.timeLabel}>In:</Text>
            <Text style={styles.timeValue}>{formatTime(item.clock_in)}</Text>
          </View>
          <View style={styles.timeItem}>
            <View style={[styles.timeDot, item.clock_out ? styles.timeDotActive : styles.timeDotInactive]} />
            <Text style={styles.timeLabel}>Out:</Text>
            <Text style={styles.timeValue}>
              {item.clock_out ? formatTime(item.clock_out) : 'Active'}
            </Text>
          </View>
        </View>
        
        {!hasLocationData && (
          <View style={styles.noLocationContainer}>
            <Text style={styles.noLocationText}>
              No location data available
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
      </View>
      <Text style={styles.emptyTitle}>No timesheet entries</Text>
      <Text style={styles.emptySubtitle}>
        Clock in to start tracking your time
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Activity</Text>
        <Text style={styles.headerSubtitle}>
          {timesheets.length} {timesheets.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>
      
      <FlatList
        data={timesheets}
        keyExtractor={(item) => item.id}
        renderItem={renderTimesheetItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          timesheets.length === 0 && styles.emptyListContent
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
              colors={["#3b82f6"]}
            />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  timesheetItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timesheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  durationContainer: {
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 8,
  },
  locationBadge: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationIcon: {
    fontSize: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  timeDotActive: {
    backgroundColor: '#16a34a',
  },
  timeDotInactive: {
    backgroundColor: '#f59e0b',
  },
  timeLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginRight: 8,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  noLocationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  noLocationText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
