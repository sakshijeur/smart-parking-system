import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, ScrollView, Alert, Platform, ActivityIndicator, StatusBar, Modal, Animated
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing, radius, typography, shadow } from './theme';

// Point this at your backend.
// - Browser (expo start --web): localhost works fine, same machine.
// - Real phone via USB + adb reverse: keep this as localhost too.
// - Real phone over WiFi/hotspot (no adb reverse): use your laptop's LAN IP instead.
const API_BASE = 'http://localhost:4000';

// Hard-coded for testing until Person 1's auth/discovery module is wired in.
const TEST_USER_ID = 1;
const TEST_VEHICLE_ID = 1;
const TEST_PARKING_AREA_ID = 1;
const TEST_VEHICLE_LABEL = 'MH 12 AB 1234'; // display only, until real vehicle data exists

const LAST_RESERVATION_KEY = 'lastReservationId';

// React Native's built-in SafeAreaView only adds top clearance on iOS —
// on Android it does nothing, so anything positioned near the top
// (like the banner icons) can render underneath the status bar and
// become unclickable. This adds that missing clearance manually.
const ANDROID_STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

// ---------- helpers ----------

function formatForMySQL(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function occupancyColor(percent) {
  if (percent >= 90) return colors.danger;
  if (percent >= 60) return colors.warning;
  return colors.success;
}

function vehicleIcon(type) {
  if (type === 'BIKE') return 'motorbike';
  if (type === 'EV') return 'car-electric';
  return 'car';
}

// Wraps whichever screen is active and fades/slides it in on every screen
// change. Lightweight, dependency-free alternative to a full navigation
// library — good enough for this module; swap for real navigation (React
// Navigation, etc.) once the team's overall app shell is decided.
function ScreenTransition({ screenKey, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true
    }).start();
  }, [screenKey]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }]
      }}
    >
      {children}
    </Animated.View>
  );
}

// ---------- root component ----------

export default function App() {
  const [screen, setScreen] = useState('details'); // details | booking | confirmation | qr | myReservation
  const [parkingArea, setParkingArea] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState(null);
  const [lastReservationId, setLastReservationId] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null); // fresh booking response
  const [qrViewData, setQrViewData] = useState(null); // whatever reservation is being shown on the QR screen

  useEffect(() => {
    loadLastReservationId();
  }, []);

  // Re-fetch parking details every time the Details screen becomes active —
  // not just once on app startup. Without this, occupancy stays stuck at
  // whatever it was when the app first loaded, even after a booking changes it.
  useEffect(() => {
    if (screen === 'details') {
      fetchParkingDetails();
    }
  }, [screen]);

  const loadLastReservationId = async () => {
    try {
      const saved = await AsyncStorage.getItem(LAST_RESERVATION_KEY);
      if (saved) setLastReservationId(Number(saved));
    } catch (err) {
      console.warn('Could not read saved reservation id:', err);
    }
  };

  const saveLastReservationId = async (id) => {
    setLastReservationId(id);
    try {
      await AsyncStorage.setItem(LAST_RESERVATION_KEY, String(id));
    } catch (err) {
      console.warn('Could not persist reservation id:', err);
    }
  };

  const fetchParkingDetails = async () => {
    setLoadingDetails(true);
    setDetailsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/parking/${TEST_PARKING_AREA_ID}`);
      const data = await res.json();
      if (!res.ok) {
        setDetailsError(data.error || 'Could not load parking details');
        return;
      }
      setParkingArea(data);
    } catch (err) {
      setDetailsError('Could not reach the server. Is the backend running?');
    } finally {
      setLoadingDetails(false);
    }
  };

  const goTo = (target) => setScreen(target);

  // ---- screen routing ----

  let content;

  if (screen === 'qr') {
    content = (
      <QRScreen
        data={qrViewData}
        onBack={() => goTo(qrViewData?.fromScreen || 'myReservation')}
      />
    );
  } else if (screen === 'confirmation') {
    content = (
      <ConfirmationScreen
        booking={confirmationData}
        parkingArea={parkingArea}
        onViewQr={() => {
          setQrViewData({ ...confirmationData, fromScreen: 'confirmation', parkingName: parkingArea?.name });
          goTo('qr');
        }}
        onDone={() => goTo('details')}
      />
    );
  } else if (screen === 'myReservation') {
    content = (
      <MyReservationScreen
        reservationId={lastReservationId}
        onBack={() => goTo('details')}
        onViewQr={(reservation) => {
          setQrViewData({
            reservationId: reservation.id,
            slot: { slot_number: reservation.slot_number },
            qrImage: reservation.qrImage,
            parkingName: reservation.parking_area_name,
            fromScreen: 'myReservation'
          });
          goTo('qr');
        }}
      />
    );
  } else if (screen === 'booking') {
    content = (
      <BookingScreen
        parkingArea={parkingArea}
        onBack={() => goTo('details')}
        onBooked={(reservationId, bookingData) => {
          saveLastReservationId(reservationId);
          setConfirmationData(bookingData);
          goTo('confirmation');
        }}
      />
    );
  } else {
    content = (
      <ParkingDetailsScreen
        parkingArea={parkingArea}
        loading={loadingDetails}
        error={detailsError}
        onRetry={fetchParkingDetails}
        onProceed={() => goTo('booking')}
        hasSavedReservation={!!lastReservationId}
        onViewReservation={() => goTo('myReservation')}
      />
    );
  }

  return <ScreenTransition screenKey={screen}>{content}</ScreenTransition>;
}

function GradientButton({ onPress, disabled, loading, label, variant = 'primary', style }) {
  const colorPair = variant === 'success' ? gradients.success : gradients.primary;
  const shadowStyle = variant === 'success' ? shadow.buttonSuccess : shadow.button;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={disabled ? ['#C9C6E0', '#B4B0D6'] : colorPair}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientButton, !disabled && shadowStyle]}
      >
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ---------- shared bits ----------

function BottomNav({ active }) {
  const items = [
    { key: 'Home', icon: 'home-outline' },
    { key: 'Bookings', icon: 'bookmark-outline' },
    { key: 'Profile', icon: 'person-outline' }
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => {
              if (item.key !== active) {
                Alert.alert(item.key, 'This tab belongs to another teammate\'s module — coming once integrated.');
              }
            }}
          >
            <Ionicons name={item.icon} size={22} color={isActive ? colors.primary : colors.textMuted} />
            <Text style={[styles.navLabel, isActive && { color: colors.primary, fontWeight: '700' }]}>{item.key}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------- Screen: Parking Details ----------

function ParkingDetailsScreen({ parkingArea, loading, error, onRetry, onProceed, hasSavedReservation, onViewReservation }) {
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading parking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="cloud-offline-outline" size={26} color={colors.danger} />
            </View>
            <Text style={styles.errorCardTitle}>Couldn't Load Parking Details</Text>
            <Text style={styles.errorCardText}>{error}</Text>
            <GradientButton label="Retry" onPress={onRetry} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const occColor = occupancyColor(parkingArea.occupancy.occupancyPercent);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <LinearGradient colors={gradients.primaryBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bannerPlaceholder}>
          <TouchableOpacity style={styles.bannerIconLeft} onPress={hasSavedReservation ? onViewReservation : undefined}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </TouchableOpacity>
          {hasSavedReservation && (
            <TouchableOpacity style={styles.bannerIconRight} onPress={onViewReservation}>
              <Ionicons name="bookmark" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          <MaterialCommunityIcons name="parking" size={56} color="rgba(255,255,255,0.9)" />
        </LinearGradient>

        <View style={styles.sheet}>
          <Text style={typography.title}>{parkingArea.name}</Text>
          <View style={styles.rowCenter}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.subText}>{parkingArea.address}</Text>
          </View>

          <View style={styles.occupancyCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.subtitle}>Current Occupancy</Text>
              <Text style={[styles.occupancyPercent, { color: occColor }]}>
                {parkingArea.occupancy.occupancyPercent}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${parkingArea.occupancy.occupancyPercent}%`, backgroundColor: occColor }]} />
            </View>
            <Text style={styles.subText}>{parkingArea.occupancy.available} of {parkingArea.occupancy.totalSlots} slots free</Text>
          </View>

          <View style={styles.infoGrid}>
            <InfoTile icon="car-outline" label="Total Capacity" value={`${parkingArea.totalCapacity} vehicles`} />
            <InfoTile icon="pricetag-outline" label="Rate" value={`₹${parkingArea.ratePerHour} / hour`} />
            <InfoTile icon="time-outline" label="Operating Hours" value={parkingArea.operatingHours} full />
          </View>

          <Text style={styles.sectionLabel}>Vehicle Types</Text>
          <View style={styles.pillRow}>
            {parkingArea.vehicleTypesSupported.map((t) => (
              <View key={t} style={styles.pill}>
                <MaterialCommunityIcons name={vehicleIcon(t)} size={14} color={colors.primary} />
                <Text style={styles.pillText}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Facilities</Text>
          <View style={styles.pillRow}>
            {parkingArea.evFacility && (
              <View style={styles.pill}>
                <Ionicons name="flash-outline" size={14} color={colors.primary} />
                <Text style={styles.pillText}>EV Charging</Text>
              </View>
            )}
            {parkingArea.accessibleParking && (
              <View style={styles.pill}>
                <Ionicons name="accessibility-outline" size={14} color={colors.primary} />
                <Text style={styles.pillText}>Accessible</Text>
              </View>
            )}
            {!parkingArea.evFacility && !parkingArea.accessibleParking && (
              <Text style={styles.subText}>No special facilities listed</Text>
            )}
          </View>

          {parkingArea.parkingRules ? (
            <>
              <Text style={styles.sectionLabel}>Parking Rules</Text>
              <Text style={styles.rulesText}>{parkingArea.parkingRules}</Text>
            </>
          ) : null}

          <GradientButton
            label={parkingArea.occupancy.available === 0 ? 'Fully Booked' : 'Proceed to Book'}
            onPress={onProceed}
            disabled={parkingArea.occupancy.available === 0}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoTile({ icon, label, value, full }) {
  return (
    <View style={[styles.infoTile, full && { width: '100%' }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={{ marginLeft: spacing.sm }}>
        <Text style={styles.infoTileLabel}>{label}</Text>
        <Text style={styles.infoTileValue}>{value}</Text>
      </View>
    </View>
  );
}

// ---------- Screen: Booking ----------

function BookingScreen({ parkingArea, onBack, onBooked }) {
  const [vehicleType, setVehicleType] = useState('CAR');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [duration, setDuration] = useState('120');
  const [arrivalDate, setArrivalDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const durationNum = Number(duration);
    if (!duration || isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Invalid duration', 'Please enter a duration greater than 0 minutes.');
      return false;
    }
    if (durationNum > 1440) {
      Alert.alert('Invalid duration', 'Duration cannot exceed 24 hours (1440 minutes).');
      return false;
    }
    if (arrivalDate.getTime() < Date.now() - 60 * 1000) {
      Alert.alert('Invalid arrival time', 'Arrival time cannot be in the past.');
      return false;
    }
    return true;
  };

  const handleBook = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const arrivalTime = formatForMySQL(arrivalDate);
      const res = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          vehicleId: TEST_VEHICLE_ID,
          vehicleType,
          parkingAreaId: parkingArea.id,
          arrivalTime,
          durationMinutes: Number(duration)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Booking failed', data.error || 'Unknown error');
        return;
      }
      onBooked(data.reservationId, { ...data, arrivalDate, vehicleType, duration });
    } catch (err) {
      Alert.alert('Network error', 'Could not reach the booking server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: arrivalDate,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event, selectedDate) => {
          if (event.type === 'dismissed' || !selectedDate) return;
          DateTimePickerAndroid.open({
            value: selectedDate,
            mode: 'time',
            onChange: (event2, selectedTime) => {
              if (event2.type === 'dismissed' || !selectedTime) return;
              const merged = new Date(selectedDate);
              merged.setHours(selectedTime.getHours(), selectedTime.getMinutes());
              setArrivalDate(merged);
            }
          });
        }
      });
    } else {
      setShowPicker(true);
    }
  };

  const onPickerChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) setArrivalDate(selectedDate);
  };

  const arrivalLabel = arrivalDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const durationNum = Number(duration);
  const rate = parkingArea?.ratePerHour || 0;
  const estimatedCost = (Number.isFinite(durationNum) && durationNum > 0) ? ((durationNum / 60) * rate).toFixed(2) : null;
  const availableTypes = parkingArea?.vehicleTypesSupported?.length ? parkingArea.vehicleTypesSupported : ['CAR', 'BIKE', 'EV'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[typography.title, { marginLeft: spacing.sm }]}>Book Your Slot</Text>
        </View>

        <View style={styles.miniCard}>
          <View style={styles.miniCardImage}>
            <MaterialCommunityIcons name="parking" size={26} color={colors.white} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.subtitle}>{parkingArea?.name}</Text>
            <Text style={styles.subText}>{parkingArea?.occupancy.occupancyPercent}% full</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Select Vehicle</Text>
        <TouchableOpacity
          style={styles.dropdownField}
          onPress={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
        >
          <MaterialCommunityIcons name="account-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.dropdownFieldText}>{TEST_VEHICLE_LABEL} ({vehicleType})</Text>
          <Ionicons name={vehicleDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        {vehicleDropdownOpen && (
          <View style={styles.dropdownList}>
            {availableTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.dropdownOption}
                onPress={() => { setVehicleType(type); setVehicleDropdownOpen(false); }}
              >
                <MaterialCommunityIcons name={vehicleIcon(type)} size={16} color={colors.primary} />
                <Text style={styles.dropdownOptionText}>{TEST_VEHICLE_LABEL} ({type})</Text>
                {vehicleType === type && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.helperText}>Real saved vehicles arrive with Person 1's module — showing a test vehicle for now.</Text>

        <Text style={styles.sectionLabel}>Expected Arrival Time</Text>
        {Platform.OS === 'web' ? (
          <input
            type="datetime-local"
            style={webInputStyle}
            value={toLocalInputValue(arrivalDate)}
            onChange={(e) => setArrivalDate(new Date(e.target.value))}
          />
        ) : (
          <>
            <TouchableOpacity style={styles.dropdownField} onPress={openPicker}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.dropdownFieldText}>{arrivalLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {Platform.OS === 'ios' && showPicker && (
              <DateTimePicker value={arrivalDate} mode="datetime" display="default" onChange={onPickerChange} minimumDate={new Date()} />
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>Expected Duration (minutes)</Text>
        <View style={styles.dropdownField}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <TextInput
            style={styles.dropdownFieldInput}
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g. 120"
          />
        </View>
        {estimatedCost !== null && (
          <Text style={styles.helperText}>Estimated cost: ₹{estimatedCost} (at ₹{rate}/hour) — final amount may include overstay charges</Text>
        )}

        <GradientButton
          label="Find Best Slot"
          onPress={handleBook}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Screen: Confirmation ("Slot Reserved!") ----------

function ConfirmationScreen({ booking, parkingArea, onViewQr, onDone }) {
  if (!booking) return null;
  const arrivalLabel = booking.arrivalDate?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { alignItems: 'center' }]}>
        <LinearGradient colors={gradients.success} style={[styles.successCircle, shadow.buttonSuccess]}>
          <Ionicons name="checkmark" size={40} color={colors.white} />
        </LinearGradient>
        <Text style={[typography.title, { marginTop: spacing.md }]}>Slot Reserved!</Text>
        <Text style={[styles.subText, { textAlign: 'center', marginTop: 4 }]}>
          Your slot has been automatically assigned based on availability, vehicle type, and distance.
        </Text>

        <View style={[styles.card, shadow.card, { width: '100%', marginTop: spacing.lg }]}>
          <Text style={styles.subtitle}>Reservation Details</Text>
          <Text style={[typography.title, { fontSize: 16, marginTop: 4 }]}>{parkingArea?.name}</Text>
          <DetailLine label="Slot Number" value={booking.slot?.slot_number} />
          <DetailLine label="Arrival Time" value={arrivalLabel} />
          <DetailLine label="Duration" value={`${booking.duration} minutes`} />
          <DetailLine label="Vehicle" value={`${TEST_VEHICLE_LABEL} (${booking.vehicleType})`} />
          <DetailLine label="Estimated Cost" value={`₹${booking.estimatedCost}`} />

          <View style={styles.qrPreviewBox}>
            <Image source={{ uri: booking.qrImage }} style={{ width: 120, height: 120 }} />
          </View>
          <Text style={[styles.subText, { textAlign: 'center' }]}>Reservation ID: #{booking.reservationId}</Text>
        </View>

        <GradientButton
          label="View QR Code"
          onPress={onViewQr}
          variant="success"
          style={{ width: '100%', marginTop: spacing.lg }}
        />

        <View style={styles.footerNote}>
          <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            You'll also receive these details on your email & in your bookings.
          </Text>
        </View>

        <TouchableOpacity onPress={onDone} style={{ marginTop: spacing.md }}>
          <Text style={styles.linkText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailLine({ label, value }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.subText}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ---------- Screen: QR (dark) ----------

function QRScreen({ data, onBack }) {
  const [infoVisible, setInfoVisible] = useState(false);

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.dark }]}>
        <View style={styles.centered}>
          <Text style={{ color: colors.white }}>No reservation to show.</Text>
          <TouchableOpacity onPress={onBack} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.primaryLight }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dark }]}>
      <View style={[styles.headerRowDark, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={[typography.title, { color: colors.white, marginLeft: spacing.sm }]}>Scan QR Code</Text>
        </View>
        <TouchableOpacity style={styles.infoIconButton} onPress={() => setInfoVisible(true)}>
          <Ionicons name="information-circle-outline" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.centered}>
        <View style={styles.qrGlowRing}>
          <View style={styles.qrScannerFrame}>
            <View style={[styles.qrCorner, styles.qrCornerTL]} />
            <View style={[styles.qrCorner, styles.qrCornerTR]} />
            <View style={[styles.qrCorner, styles.qrCornerBL]} />
            <View style={[styles.qrCorner, styles.qrCornerBR]} />
            <View style={styles.qrWhiteBox}>
              <Image source={{ uri: data.qrImage }} style={{ width: 190, height: 190 }} />
            </View>
          </View>
        </View>
        <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>Reservation ID</Text>
        <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>#{data.reservationId}</Text>

        <View style={[styles.darkCard, shadow.card]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="person-circle-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.white, fontWeight: '700', marginLeft: 6 }}>{data.parkingName}</Text>
          </View>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>Slot {data.slot?.slot_number}</Text>
        </View>

        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
          Show this QR code to the operator at the entrance.
        </Text>
      </View>

      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setInfoVisible(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Reservation QR</Text>
            <Text style={styles.modalBody}>
              Show this code to the operator at the entrance to check in. It's valid for this reservation only and can't be reused once scanned.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setInfoVisible(false)}>
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- Screen: My Booking ----------

function MyReservationScreen({ reservationId, onBack, onViewQr }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [tab, setTab] = useState('Active');

  useEffect(() => { fetchReservation(); }, [reservationId]);

  const fetchReservation = async () => {
    if (!reservationId) {
      setLoading(false);
      setError('No reservation found on this device yet.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/reservations/${reservationId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load reservation');
        return;
      }
      setReservation(data);
    } catch (err) {
      setError('Could not reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.title, { marginLeft: spacing.sm }]}>My Booking</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'Active' && styles.tabActive]} onPress={() => setTab('Active')}>
          <Text style={tab === 'Active' ? styles.tabTextActive : styles.tabText}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'History' && styles.tabActive]} onPress={() => setTab('History')}>
          <Text style={tab === 'History' ? styles.tabTextActive : styles.tabText}>History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === 'History' && (
          <Text style={styles.subText}>History comes from Person 4's module once exit/payment is wired in.</Text>
        )}

        {tab === 'Active' && loading && (
          <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
        )}

        {tab === 'Active' && !loading && error && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconCircle}>
              <Ionicons
                name={error.includes('No reservation') ? 'bookmark-outline' : 'alert-circle-outline'}
                size={26}
                color={colors.danger}
              />
            </View>
            <Text style={styles.errorCardTitle}>
              {error.includes('No reservation') ? 'No Active Booking' : 'Something Went Wrong'}
            </Text>
            <Text style={styles.errorCardText}>{error}</Text>
            {reservationId && (
              <GradientButton label="Retry" onPress={fetchReservation} style={{ marginTop: spacing.md }} />
            )}
          </View>
        )}

        {tab === 'Active' && !loading && !error && reservation && (
          <View style={[styles.card, shadow.card]}>
            <View style={styles.rowBetween}>
              <View style={styles.miniCardImage}>
                <MaterialCommunityIcons name="parking" size={22} color={colors.white} />
              </View>
            </View>
            <Text style={[styles.subtitle, { marginTop: spacing.sm }]}>{reservation.parking_area_name}</Text>
            <Text style={styles.subText}>Slot {reservation.slot_number}</Text>
            <View style={styles.rowCenter}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.subText}>
                {new Date(reservation.arrival_time_expected).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                {' · '}{reservation.duration_expected_minutes} min
              </Text>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusRowText}>
                {reservation.status === 'CONFIRMED' ? 'Upcoming' : reservation.status}
              </Text>
            </View>
            <TouchableOpacity style={[styles.outlineButtonSuccess, { marginTop: spacing.md }]} onPress={() => onViewQr(reservation)}>
              <Text style={styles.outlineButtonSuccessText}>View QR Code</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomNav active="Bookings" />
    </SafeAreaView>
  );
}

// ---------- styles ----------

const webInputStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  padding: 12,
  fontSize: 14,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: ANDROID_STATUS_BAR_HEIGHT },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { fontSize: 14, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },

  errorCard: {
    alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.xl, width: '100%', ...shadow.card
  },
  errorIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.dangerLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md
  },
  errorCardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  errorCardText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  headerRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  headerRowDark: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },

  bannerPlaceholder: {
    height: 160, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center'
  },
  bannerIconLeft: { position: 'absolute', top: spacing.md, left: spacing.md, backgroundColor: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: radius.pill },
  bannerIconRight: { position: 'absolute', top: spacing.md, right: spacing.md, backgroundColor: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: radius.pill },

  sheet: {
    backgroundColor: colors.card, marginTop: -radius.xl, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.lg, ...shadow.card
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subText: { fontSize: 13, color: colors.textSecondary },
  subtitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  occupancyCard: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  occupancyPercent: { fontSize: 18, fontWeight: '800' },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: radius.pill, marginVertical: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  infoTile: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background,
    borderRadius: radius.md, padding: spacing.sm, width: '48%'
  },
  infoTileLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' },
  infoTileValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  sectionLabel: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill
  },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  pillSelectable: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill
  },
  pillSelectableActive: { backgroundColor: colors.primary },
  pillSelectableText: { color: colors.primary, fontWeight: '600' },
  pillSelectableTextActive: { color: colors.white, fontWeight: '600' },

  rulesText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 4 },
  helperText: { fontSize: 11, color: colors.textMuted, marginTop: 6 },

  fieldInput: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: 12, backgroundColor: colors.card
  },

  miniCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
    ...shadow.card
  },
  miniCardImage: {
    width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center'
  },

  primaryButton: {
    backgroundColor: colors.primary, padding: 16, borderRadius: radius.md, alignItems: 'center'
  },
  primaryButtonSuccess: {
    backgroundColor: colors.success, padding: 16, borderRadius: radius.md, alignItems: 'center'
  },
  primaryButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  buttonDisabled: { backgroundColor: colors.textMuted },

  outlineButton: {
    borderWidth: 1, borderColor: colors.primary, padding: 12, borderRadius: radius.md, alignItems: 'center'
  },
  outlineButtonText: { color: colors.primary, fontWeight: '700' },

  linkText: { color: colors.primary, fontWeight: '600' },

  card: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadow.card
  },
  detailValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  successCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl
  },
  qrPreviewBox: { alignItems: 'center', marginTop: spacing.md },

  qrWhiteBox: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: radius.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8
  },
  darkCard: {
    backgroundColor: colors.darkCard, borderRadius: radius.md, padding: spacing.md,
    marginTop: spacing.lg, width: '80%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6
  },

  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.background },
  tabActive: { backgroundColor: colors.success },
  tabText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.white, fontWeight: '700', fontSize: 13 },

  statusBadge: { backgroundColor: colors.successLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  statusBadgeText: { color: colors.success, fontWeight: '700', fontSize: 11 },

  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card
  },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  gradientButton: {
    paddingVertical: 16, paddingHorizontal: spacing.xl, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', minWidth: 140
  },

  dropdownField: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: 12, backgroundColor: colors.card, gap: spacing.sm
  },
  dropdownFieldText: { flex: 1, fontSize: 14, color: colors.textPrimary },
  dropdownFieldInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  dropdownList: {
    backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    marginTop: 4, overflow: 'hidden', ...shadow.card
  },
  dropdownOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border
  },
  dropdownOptionText: { flex: 1, fontSize: 13, color: colors.textPrimary },

  footerNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.md,
    paddingHorizontal: spacing.md
  },
  footerNoteText: { fontSize: 12, color: colors.textMuted, flex: 1, lineHeight: 17 },

  infoIconButton: { backgroundColor: 'rgba(255,255,255,0.12)', padding: 6, borderRadius: radius.pill },

  qrGlowRing: {
    padding: 3, borderRadius: radius.xl + 4,
    backgroundColor: 'rgba(108, 76, 255, 0.35)',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12
  },
  qrScannerFrame: { position: 'relative', padding: spacing.md },
  qrCorner: { position: 'absolute', width: 28, height: 28, borderColor: colors.success },
  qrCornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  qrCornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  qrCornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  qrCornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg
  },
  modalCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg,
    width: '100%', maxWidth: 340, alignItems: 'center', ...shadow.card
  },
  modalIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  modalBody: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: spacing.md },
  modalButton: {
    backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: spacing.xl,
    borderRadius: radius.md, width: '100%', alignItems: 'center'
  },
  modalButtonText: { color: colors.white, fontWeight: '700' },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  statusRowText: { fontSize: 12, fontWeight: '700', color: colors.success },

  outlineButtonSuccess: {
    borderWidth: 1.5, borderColor: colors.success, padding: 12, borderRadius: radius.md, alignItems: 'center'
  },
  outlineButtonSuccessText: { color: colors.success, fontWeight: '700' }
});
