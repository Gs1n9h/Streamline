import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Job } from '../../types';

const { width: screenWidth } = Dimensions.get('window');

interface ModernClockSliderProps {
  isClockedIn: boolean;
  jobs: Job[];
  onClockIn: (jobId: string | null) => void;
  onClockOut: () => void;
  currentJob?: Job;
  loading?: boolean;
  clockInTime?: Date;
  userName?: string;
  jobSelectionRequired?: boolean;
}

export default function ModernClockSlider({
  isClockedIn,
  jobs,
  onClockIn,
  onClockOut,
  currentJob,
  loading = false,
  clockInTime,
  userName,
  jobSelectionRequired = true,
}: ModernClockSliderProps) {
  const [showJobModal, setShowJobModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const translateX = useRef(new Animated.Value(0)).current;
  const sliderWidth = screenWidth - 48; // Account for padding

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


  const onGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    
    // Calculate precise boundaries
    const containerPadding = 32; // sliderWrapper padding (16 * 2)
    const trackPadding = 8; // sliderTrack paddingHorizontal (4 * 2)
    const thumbWidth = 48;
    const thumbStartPosition = 4; // Initial left position
    
    // Available space for thumb to move
    const availableWidth = sliderWidth - containerPadding - trackPadding - thumbWidth;
    const maxRightSlide = availableWidth - thumbStartPosition;
    const maxLeftSlide = -(availableWidth - thumbStartPosition);
    
    // Strictly constrain translation within bounds
    const constrainedTranslation = Math.max(maxLeftSlide, Math.min(maxRightSlide, translationX));
    
    // Force the animation value to stay within bounds
    translateX.setValue(constrainedTranslation);
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      // Calculate precise boundaries (same as onGestureEvent)
      const containerPadding = 32;
      const trackPadding = 8;
      const thumbWidth = 48;
      const thumbStartPosition = 4;
      
      const availableWidth = sliderWidth - containerPadding - trackPadding - thumbWidth;
      const maxRightSlide = availableWidth - thumbStartPosition;
      const maxLeftSlide = -(availableWidth - thumbStartPosition);
      
      // Constrain translation within bounds
      const constrainedTranslation = Math.max(maxLeftSlide, Math.min(maxRightSlide, translationX));
      
      if (constrainedTranslation > maxRightSlide * 0.6 && !isClockedIn) {
        // Swipe right to clock in (60% of max slide)
        if (jobSelectionRequired && jobs.length > 0) {
          setShowJobModal(true);
        } else {
          // No job selection required, clock in directly
          onClockIn(null);
        }
      } else if (constrainedTranslation < maxLeftSlide * 0.6 && isClockedIn) {
        // Swipe left to clock out (60% of max slide)
        // No confirmation needed - user already slid
        onClockOut();
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
      <View style={styles.jobIcon}>
        <Text style={styles.jobIconText}>💼</Text>
      </View>
      <View style={styles.jobInfo}>
        <Text style={styles.jobName}>{item.name}</Text>
        {item.address && (
          <Text style={styles.jobAddress}>{item.address}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Time Display (when clocked in) */}
      {isClockedIn && (
        <View style={styles.timeDisplay}>
          <Text style={styles.timeLabel}>Time Elapsed</Text>
          <Text style={styles.timeValue}>{elapsedTime}</Text>
          {currentJob && (
            <View style={styles.jobInfo}>
              <Text style={styles.jobLabel}>Working on:</Text>
              <Text style={styles.jobName}>{currentJob.name}</Text>
            </View>
          )}
        </View>
      )}

      {/* Status Badge */}
      <View style={[styles.statusBadge, isClockedIn ? styles.statusActive : styles.statusInactive]}>
        <View style={[styles.statusDot, isClockedIn ? styles.dotActive : styles.dotInactive]} />
        <Text style={[styles.statusText, isClockedIn ? styles.statusTextActive : styles.statusTextInactive]}>
          {isClockedIn ? 'Checked In' : 'Checked Out'}
        </Text>
      </View>

      {/* iPhone-like Slider */}
      <View style={styles.sliderContainer}>
        <View style={styles.sliderWrapper}>
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View style={styles.sliderContent}>
              {/* Slider Track */}
              <View style={[styles.sliderTrack, isClockedIn ? styles.trackCheckedIn : styles.trackCheckedOut]}>
                {/* Track Background with Gradient Effect */}
                <View style={[styles.trackBackground, isClockedIn ? styles.trackBgActive : styles.trackBgInactive]} />
                
                {/* Slider Thumb */}
                <Animated.View
                  style={[
                    styles.sliderThumb,
                    isClockedIn ? styles.thumbCheckedIn : styles.thumbCheckedOut,
                    { transform: [{ translateX }] }
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator 
                      size="small" 
                      color="#ffffff" 
                    />
                  ) : (
                    <View style={styles.thumbContent}>
                      <Text style={styles.thumbIcon}>
                        {isClockedIn ? '✓' : '▶'}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              </View>
              
              {/* Slider Labels */}
              <View style={styles.sliderLabels}>
                <View style={styles.labelContainer}>
                  <Text style={[styles.sliderLabel, !isClockedIn && styles.labelActive]}>
                    Check In
                  </Text>
                  <Text style={[styles.sliderSubLabel, !isClockedIn && styles.subLabelActive]}>
                    Slide to start
                  </Text>
                </View>
                <View style={styles.labelContainer}>
                  <Text style={[styles.sliderLabel, isClockedIn && styles.labelActive]}>
                    Check Out
                  </Text>
                  <Text style={[styles.sliderSubLabel, isClockedIn && styles.subLabelActive]}>
                    Slide to finish
                  </Text>
                </View>
              </View>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </View>


      {/* Job Selection Modal */}
      <Modal
        visible={showJobModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowJobModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Job</Text>
              <Text style={styles.modalSubtitle}>Choose the job you're working on</Text>
            </View>
            
            <FlatList
              data={jobs}
              keyExtractor={(item) => item.id}
              renderItem={renderJobItem}
              style={styles.jobList}
              showsVerticalScrollIndicator={false}
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
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  timeLabel: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '600',
    marginBottom: 8,
  },
  timeValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0c4a6e',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  jobInfo: {
    alignItems: 'center',
  },
  jobLabel: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
    marginBottom: 4,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    alignSelf: 'center',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotActive: {
    backgroundColor: '#16a34a',
  },
  dotInactive: {
    backgroundColor: '#dc2626',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#15803d',
  },
  statusTextInactive: {
    color: '#dc2626',
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  sliderContent: {
    width: '100%',
  },
  sliderTrack: {
    height: 56,
    borderRadius: 28,
    marginBottom: 20,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  trackCheckedIn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  trackCheckedOut: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  trackBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  trackBgActive: {
    backgroundColor: 'transparent',
  },
  trackBgInactive: {
    backgroundColor: 'transparent',
  },
  sliderThumb: {
    position: 'absolute',
    top: 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    left: 4,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  thumbCheckedIn: {
    backgroundColor: '#ffffff',
    left: 'auto',
    right: 4,
  },
  thumbCheckedOut: {
    backgroundColor: '#ffffff',
  },
  thumbContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  labelContainer: {
    alignItems: 'center',
    flex: 1,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  sliderSubLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  labelActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  subLabelActive: {
    color: '#475569',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  jobList: {
    maxHeight: 300,
  },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  jobIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  jobIconText: {
    fontSize: 20,
  },
  jobAddress: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});
