import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { groceryTheme } from "@src/Utils/groceryTheme";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  onSearchPress: () => void;
  onCartPress: () => void;
  cartCount?: number;
};

type StoredLocation = {
  pincode: string;
  locality: string;
};

const DELIVERY_LOCATION_KEY = "tooldrop_delivery_location_v1";

const DeliveryHeader: React.FC<Props> = ({ onSearchPress, onCartPress, cartCount = 0 }) => {
  const [pincode, setPincode] = useState("560035");
  const [locality, setLocality] = useState("Set your location");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [manualPincode, setManualPincode] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const persistLocation = async (nextPincode: string, nextLocality: string) => {
    const payload: StoredLocation = { pincode: nextPincode, locality: nextLocality };
    await AsyncStorage.setItem(DELIVERY_LOCATION_KEY, JSON.stringify(payload));
  };

  const detectAndSetCurrentLocation = async () => {
    try {
      setLocating(true);
      setLocationError(null);
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setLocationError("Location access denied. Enter your pincode to continue.");
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const reverseRows = await Location.reverseGeocodeAsync({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });

      const geoRow = reverseRows[0];
      const nextPincode = geoRow?.postalCode?.replace(/\D/g, "") || pincode;
      const nextLocality = geoRow?.city || geoRow?.subregion || geoRow?.region || "Current location";

      if (nextPincode) {
        setPincode(nextPincode);
        setManualPincode(nextPincode);
      }

      setLocality(nextLocality);
      await persistLocation(nextPincode || pincode, nextLocality);
      setSheetVisible(false);
    } catch (error) {
      setLocationError("Unable to detect location right now. Try pincode entry.");
    } finally {
      setLocating(false);
    }
  };

  const applyManualPincode = async () => {
    const normalizedPincode = manualPincode.replace(/\D/g, "").slice(0, 6);

    if (normalizedPincode.length < 5) {
      setLocationError("Please enter a valid pincode.");
      return;
    }

    try {
      setLocating(true);
      setLocationError(null);
      let nextLocality = "Serviceable area";

      const geocoded = await Location.geocodeAsync(`${normalizedPincode}, India`);
      if (geocoded.length > 0) {
        const reverseRows = await Location.reverseGeocodeAsync({
          latitude: geocoded[0].latitude,
          longitude: geocoded[0].longitude,
        });

        nextLocality = reverseRows[0]?.city || reverseRows[0]?.subregion || nextLocality;
      }

      setPincode(normalizedPincode);
      setLocality(nextLocality);
      await persistLocation(normalizedPincode, nextLocality);
      setSheetVisible(false);
    } catch (error) {
      setLocationError("Could not verify pincode. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const raw = await AsyncStorage.getItem(DELIVERY_LOCATION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as StoredLocation;
          if (saved?.pincode) {
            setPincode(saved.pincode);
            setManualPincode(saved.pincode);
          }
          if (saved?.locality) {
            setLocality(saved.locality);
          }
          return;
        }
      } catch (error) {
        // Ignore parsing issues and keep default location hint.
      }
    };

    loadSavedLocation();
  }, []);

  return (
    <>
      <View style={styles.topRow}>
        <View style={styles.deliveryRow}>
          <View style={styles.deliveryBadge}>
            <Text style={styles.deliveryMins}>60</Text>
            <Text style={styles.deliveryMinsLabel}>Mins</Text>
          </View>

          <TouchableOpacity style={styles.selectorButton} onPress={() => setSheetVisible(true)}>
            <View style={styles.deliveryTitleRow}>
              <Text style={styles.deliveryTitle}>Deliver To</Text>
              <Ionicons name="chevron-down" size={14} color={groceryTheme.colors.textPrimary} />
            </View>
            <View style={styles.pinRow}>
              <Ionicons name="location-outline" size={14} color={groceryTheme.colors.textSecondary} />
              <Text style={styles.pinText}>{pincode}</Text>
            </View>
            <Text style={styles.localityText} numberOfLines={1}>
              {locality}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
            <Ionicons name="search-outline" size={25} color={groceryTheme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={onCartPress}>
            <Ionicons name="cart-outline" size={23} color={groceryTheme.colors.textPrimary} />
            {cartCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 9 ? "9+" : String(cartCount)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSheetVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetTopRow}>
              <Text style={styles.sheetTitle}>Delivery Time</Text>
              <TouchableOpacity onPress={() => setSheetVisible(false)}>
                <Ionicons name="close" size={34} color={groceryTheme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSubtitle}>
              Please enter Pincode to check delivery time and serviceability.
            </Text>

            <View style={styles.entryRow}>
              <View style={styles.inputWrap}>
                <TextInput
                  value={manualPincode}
                  onChangeText={(value) => setManualPincode(value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Eg. 500087"
                  keyboardType="number-pad"
                  style={styles.pincodeInput}
                  placeholderTextColor={groceryTheme.colors.textMuted}
                />
                <TouchableOpacity style={styles.applyBtn} onPress={applyManualPincode} disabled={locating}>
                  <Text style={styles.applyText}>Apply</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.locateBtn} onPress={() => detectAndSetCurrentLocation()} disabled={locating}>
                {locating ? (
                  <ActivityIndicator size="small" color="#1f8c2e" />
                ) : (
                  <>
                    <Ionicons name="locate-outline" size={20} color="#1f8c2e" />
                    <Text style={styles.locateText}>Locate me</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  topRow: {
    marginTop: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deliveryBadge: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#119d22",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  deliveryMins: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 16,
  },
  deliveryMinsLabel: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
  },
  selectorButton: {
    flex: 1,
  },
  deliveryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryTitle: {
    color: groceryTheme.colors.textSecondary,
    fontSize: 14,
    marginRight: 4,
  },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  pinText: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 2,
    lineHeight: 16,
  },
  localityText: {
    color: groceryTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  actionRow: {
    width: 72,
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 8,
  },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#cc2323",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  sheet: {
    backgroundColor: groceryTheme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: groceryTheme.colors.textPrimary,
  },
  sheetSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: groceryTheme.colors.textSecondary,
  },
  entryRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputWrap: {
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
    borderRadius: 10,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  pincodeInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    color: groceryTheme.colors.textPrimary,
    fontSize: 15,
  },
  applyBtn: {
    paddingHorizontal: 16,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: groceryTheme.colors.border,
  },
  applyText: {
    color: "#2f8d2c",
    fontSize: 14,
    fontWeight: "600",
  },
  locateBtn: {
    width: 142,
    height: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#57a644",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "#f7fff3",
  },
  locateText: {
    marginLeft: 6,
    color: "#1f8c2e",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 10,
    color: groceryTheme.colors.danger,
    fontSize: 12,
  },
});

export default DeliveryHeader;
