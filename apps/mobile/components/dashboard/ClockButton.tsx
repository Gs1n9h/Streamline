import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Job } from '../../types';

interface ClockButtonProps {
  isClockedIn: boolean;
  jobs: Job[];
  onClockIn: (jobId: string) => void;
  onClockOut: () => void;
  currentJob?: Job;
  loading?: boolean;
  clockInTime?: Date;
}

export default function ClockButton({
  isClockedIn,
  jobs,
  onClockIn,
  onClockOut,
  currentJob,
  loading = false,
  clockInTime,
}: ClockButtonProps) {
  const [showJobModal, setShowJobModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const translateX = new Animated.Value(0);

  // Update current time every second when clocked in
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isClockedIn && clockInTime) {
      interval = setInterval(() => {
        const now = new Date();
        setCurrentTime(now);
        
        const elapsed = now.getTime() - clockInTime.getTime();
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isClockedIn, clockInTime]);

  const handleClockIn = (jobId: string) => {
    setShowJobModal(false);
    onClockIn(jobId);
  };

  const handleClockOut = () => {
    Alert.alert(
      'Checkout',
      'Are you sure you want to checkout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Checkout', onPress: onClockOut },
      ]
    );
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (translationX > 100 && !isClockedIn) {
        // Swipe right to clock in
        setShowJobModal(true);
      } else if (translationX < -100 && isClockedIn) {
        // Swipe left to clock out
        handleClockOut();
      }
      
      // Reset position
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobItem}
      onPress={() => handleClockIn(item.id)}
    >
      <Text style={styles.jobName}>{item.name}</Text>
      {item.address && (
        <Text style={styles.jobAddress}>{item.address}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Elapsed Time Display (when clocked in) */}
      {isClockedIn && (
        <View style={styles.timeDisplay}>
          <Text style={styles.timeLabel}>Time Elapsed</Text>
          <Text style={styles.timeValue}>{elapsedTime}</Text>
          {currentJob && (
            <Text style={styles.jobText}>Working: {currentJob.name}</Text>
          )}
        </View>
      )}

      {/* Status Display */}
      <View style={[styles.statusContainer, isClockedIn ? styles.clockedIn : styles.clockedOut]}>
        <Text style={styles.statusText}>
          {isClockedIn ? '🟢 CHECKED IN' : '🔴 CHECKED OUT'}
        </Text>
      </View>

      {/* Swipable Clock Button */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.clockButtonContainer,
            { transform: [{ translateX }] }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.clockButton, 
              isClockedIn ? styles.clockOutButton : styles.clockInButton,
              loading && styles.clockButtonLoading
            ]}
            onPress={isClockedIn ? handleClockOut : () => setShowJobModal(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.clockButtonText}>
                {isClockedIn ? 'CHECKOUT' : 'CHECKIN'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>

      {/* Swipe Instructions */}
      <Text style={styles.swipeInstructions}>
        {isClockedIn 
          ? 'Swipe left to checkout' 
          : 'Swipe right to checkin or tap button'
        }
      </Text>

      {/* Job Selection Modal */}
      <Modal
        visible={showJobModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowJobModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Job</Text>
            <Text style={styles.modalSubtitle}>Choose the job you're working on</Text>
            
            <FlatList
              data={jobs}
              keyExtractor={(item) => item.id}
              renderItem={renderJobItem}
              style={styles.jobList}
            />
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowJobModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20, // Move to bottom position
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  timeLabel: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '600',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0c4a6e',
    fontFamily: 'monospace',
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  clockedIn: {
    backgroundColor: '#dcfce7',
  },
  clockedOut: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  jobText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  clockButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  clockButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  clockButtonLoading: {
    opacity: 0.7,
  },
  swipeInstructions: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  clockInButton: {
    backgroundColor: '#10b981',
  },
  clockOutButton: {
    backgroundColor: '#ef4444',
  },
  clockButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  jobList: {
    maxHeight: 300,
  },
  jobItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  jobName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 14,
    color: '#6b7280',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

