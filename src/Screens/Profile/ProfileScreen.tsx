import DataStateNotice from "@components/Feedback/DataStateNotice";
import BottomNavBar from "@components/Layouts/BottomNavBar";
import ScreenContainer from "@components/Layouts/ScreenContainer";
import supabase from "@config/supabase";
import { ProfileProps } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PROFILE_IMAGE_BUCKET = "profile-images";

const ProfileScreen: React.FC<ProfileProps> = ({ navigation }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("AYUDHA User");
  const [email, setEmail] = useState("user@example.com");
  const [companyName, setCompanyName] = useState("Independent Contractor");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftCompanyName, setDraftCompanyName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");

  const loadAccountData = async () => {
    try {
      setProfileNotice(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfileNotice("Sign in to save account details, addresses, and wishlist items.");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "user@example.com");

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, company_name, phone, user_type, avatar_url")
        .eq("user_uuid", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      // If profile does not exist yet, create it so user details are persisted
      if (!profileRow) {
        const insertPayload = {
          user_uuid: user.id,
          user_email: user.email || null,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
          company_name: null,
          phone: user.user_metadata?.phone || null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error: insertError } = await supabase.from('profiles').insert(insertPayload);
        if (insertError) {
          console.warn('Could not create profile row:', insertError);
        }
      }

      const nextName = profileRow?.full_name || user.email?.split("@")[0] || "AYUDHA User";
      const nextCompany = profileRow?.company_name || "Independent Contractor";
      const nextPhone = profileRow?.phone || "";
      setName(nextName);
      setCompanyName(nextCompany);
      setPhone(nextPhone);
      setAvatarUrl(profileRow?.avatar_url || null);
      setUserType(profileRow?.user_type || null);

      setDraftName(nextName);
      setDraftCompanyName(nextCompany);
      setDraftPhone(nextPhone);

      const [{ count: addressesExact }, { count: wishlistExact }] = await Promise.all([
        supabase.from("addresses").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("wishlist_items").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setAddressCount(addressesExact || 0);
      setWishlistCount(wishlistExact || 0);
    } catch (error) {
      setProfileNotice("Could not sync profile details. Please try again.");
    }
  };

  useEffect(() => {
    loadAccountData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadAccountData);
    return unsubscribe;
  }, [navigation]);

  const saveProfile = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to save account details.");
      return;
    }

    if (!draftName.trim()) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        user_uuid: userId,
        user_email: email,
        full_name: draftName.trim(),
        company_name: draftCompanyName.trim() || null,
        phone: draftPhone.trim() || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_uuid" });

      if (error) {
        throw error;
      }

      setName(payload.full_name);
      setCompanyName(payload.company_name || "Independent Contractor");
      setPhone(payload.phone || "");
      setEditVisible(false);
      Alert.alert("Saved", "Your account details have been updated.");
    } catch (error) {
      Alert.alert("Error", "Could not save profile details right now.");
    } finally {
      setSaving(false);
    }
  };

  const pickProfilePhoto = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to upload a profile photo.");
      return;
    }

    try {
      setUploadingImage(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Photo library permission is required to upload a profile image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const extension = asset.fileName?.split(".").pop() || asset.mimeType?.split("/").pop() || "jpg";
      const filePath = `${userId}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(filePath, blob, {
        contentType: asset.mimeType || "image/jpeg",
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setProfileNotice("Profile photo uploaded. Tap Save Changes to persist all details.");
      setEditVisible(true);
    } catch (error) {
      Alert.alert(
        "Upload failed",
        "Could not upload the image. Make sure the Supabase bucket 'profile-images' exists and is publicly readable."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: "SignInScreen" }] });
  };

  const memberSubtitle = useMemo(() => (phone ? `${phone} • ${email}` : email), [phone, email]);

  const menuItems = [
    {
      label: "My Addresses",
      desc: `${addressCount} saved location${addressCount === 1 ? "" : "s"}`,
      icon: "map-marker",
      onPress: () => navigation.navigate("AddressManagement"),
    },
    {
      label: "My Wishlist",
      desc: `${wishlistCount} item${wishlistCount === 1 ? "" : "s"} saved for later`,
      icon: "cards-heart",
      onPress: () => navigation.navigate("Wishlist"),
    },
    { label: "Help & Support", desc: "24/7 Assistance", icon: "headset", onPress: () => Alert.alert("Help", "Support center is coming soon.") },
    { label: "Settings", desc: "App preferences and privacy", icon: "cog", onPress: () => Alert.alert("Settings", "Settings screen is coming soon.") },
  ];

  return (
    <ScreenContainer>
      {profileNotice ? <DataStateNotice message={profileNotice} type="warning" /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickProfilePhoto} disabled={uploadingImage}>
            <Image
              source={{ uri: avatarUrl || "https://i.pravatar.cc/150?img=11" }}
              style={styles.avatarImg}
            />
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name={uploadingImage ? "progress-upload" : "pencil"} size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.topInfo}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.memberSince}>{memberSubtitle}</Text>
            <View style={styles.chipRow}>
              <View style={styles.chipBlue}><Text style={styles.chipBlueText}>VERIFIED</Text></View>
            </View>
            <TouchableOpacity style={styles.editProfileBtn} onPress={() => setEditVisible(true)}>
              <Text style={styles.editProfileText}>Edit Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT MANAGEMENT</Text>

        <View style={styles.menuWrap}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuIconBox}>
                <MaterialCommunityIcons name={item.icon as never} size={24} color="#1A1C1C" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#D2D2D2" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#AD2B00" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statCardLight}>
            <MaterialCommunityIcons name="map-marker-radius" size={28} color="#AD2B00" style={styles.statIcon} />
            <Text style={styles.statBigTextLight}>{addressCount}</Text>
            <Text style={styles.statSmallTextLight}>SAVED ADDRESSES</Text>
          </View>
          <View style={styles.statCardDark}>
            <MaterialCommunityIcons name="cards-heart" size={28} color="#FFFFFF" style={styles.statIcon} />
            <Text style={styles.statBigTextDark}>{wishlistCount}</Text>
            <Text style={styles.statSmallTextDark}>WISHLIST ITEMS</Text>
          </View>
        </View>

        <Text style={styles.footerBrand}>AYUDHA V2.4.1 • INDUSTRIAL GRADE RELIABILITY</Text>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Account</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={groceryTheme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.photoRow} onPress={pickProfilePhoto} disabled={uploadingImage}>
              <Image source={{ uri: avatarUrl || "https://i.pravatar.cc/150?img=11" }} style={styles.photoPreview} />
              <View style={styles.photoTextWrap}>
                <Text style={styles.photoTitle}>Profile Photo</Text>
                <Text style={styles.photoSub}>{uploadingImage ? "Uploading..." : "Tap to choose a new picture"}</Text>
              </View>
            </TouchableOpacity>

            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Full name"
              style={styles.input}
              placeholderTextColor={groceryTheme.colors.textMuted}
            />
            <TextInput
              value={draftCompanyName}
              onChangeText={setDraftCompanyName}
              placeholder="Company name"
              style={styles.input}
              placeholderTextColor={groceryTheme.colors.textMuted}
            />
            <TextInput
              value={draftPhone}
              onChangeText={setDraftPhone}
              placeholder="Phone number"
              style={styles.input}
              keyboardType="phone-pad"
              placeholderTextColor={groceryTheme.colors.textMuted}
            />

            {/* Removed b2b/b2c type selection — simple single user type now */}

            <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile} disabled={saving}>
              <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavBar
        activeKey="profile"
        items={[
          {
            key: "home",
            label: "HOME",
            icon: "home-outline",
            activeIcon: "home",
            onPress: () => navigation.navigate("HomeScreen"),
          },
          {
            key: "category",
            label: "CATEGORIES",
            icon: "grid-outline",
            activeIcon: "grid",
            onPress: () => navigation.navigate("ProductCatalog", { openMode: "category" }),
          },
          {
            key: "orders",
            label: "ORDERS",
            icon: "cube-outline",
            activeIcon: "cube",
            onPress: () => navigation.navigate("Orders"),
          },
          {
            key: "profile",
            label: "ACCOUNT",
            icon: "person-outline",
            activeIcon: "person",
            onPress: () => navigation.navigate("Profile"),
          },
        ]}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 80,
  },
  topCard: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.xl,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    padding: 6,
    backgroundColor: "#E8EBE9",
    borderRadius: 16,
    position: "relative",
    marginRight: 20,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  editBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#AD2B00",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  topInfo: {
    flex: 1,
  },
  userName: {
    ...groceryTheme.typography.displayLg,
    fontSize: 24,
    lineHeight: 28,
    color: "#1A1C1C",
    marginBottom: 4,
  },
  memberSince: {
    ...groceryTheme.typography.body,
    fontSize: 13,
    color: groceryTheme.colors.textSecondary,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chipOrange: {
    backgroundColor: "#FDECE6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipOrangeText: {
    ...groceryTheme.typography.caption,
    fontSize: 10,
    color: "#AD2B00",
    fontWeight: "700",
    letterSpacing: 1,
  },
  chipBlue: {
    backgroundColor: "#E6EFFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipBlueText: {
    ...groceryTheme.typography.caption,
    fontSize: 10,
    color: "#0055D4",
    fontWeight: "700",
    letterSpacing: 1,
  },
  editProfileBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: groceryTheme.radius.full,
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editProfileText: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textPrimary,
    fontWeight: "700",
  },
  sectionLabel: {
    ...groceryTheme.typography.labelMd,
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 12,
    color: groceryTheme.colors.textSecondary,
    letterSpacing: 2,
  },
  menuWrap: {
    paddingHorizontal: 16,
  },
  menuItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: groceryTheme.radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  menuIconBox: {
    width: 48,
    height: 48,
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    ...groceryTheme.typography.title,
    fontSize: 16,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 2,
  },
  menuDesc: {
    ...groceryTheme.typography.body,
    fontSize: 13,
    color: groceryTheme.colors.textSecondary,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: "rgba(173, 43, 0, 0.2)",
    borderRadius: groceryTheme.radius.lg,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: {
    ...groceryTheme.typography.labelMd,
    color: "#AD2B00",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 32,
    gap: 16,
  },
  statCardLight: {
    flex: 1,
    backgroundColor: groceryTheme.colors.surfaceContainerLow,
    borderRadius: groceryTheme.radius.xl,
    padding: 24,
  },
  statCardDark: {
    flex: 1,
    backgroundColor: "#AD2B00",
    borderRadius: groceryTheme.radius.xl,
    padding: 24,
  },
  statIcon: {
    marginBottom: 24,
  },
  statBigTextLight: {
    ...groceryTheme.typography.displayLg,
    fontSize: 28,
    color: "#1A1C1C",
    marginBottom: 4,
  },
  statSmallTextLight: {
    ...groceryTheme.typography.caption,
    fontSize: 10,
    color: groceryTheme.colors.textSecondary,
    letterSpacing: 1,
  },
  statBigTextDark: {
    ...groceryTheme.typography.displayLg,
    fontSize: 28,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statSmallTextDark: {
    ...groceryTheme.typography.caption,
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
  },
  footerBrand: {
    ...groceryTheme.typography.caption,
    textAlign: "center",
    marginTop: 40,
    color: "rgba(26, 28, 28, 0.4)",
    fontSize: 9,
    letterSpacing: 1.5,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: {
    ...groceryTheme.typography.headlineSm,
    color: groceryTheme.colors.textPrimary,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    borderRadius: groceryTheme.radius.lg,
    padding: 12,
  },
  photoPreview: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  photoTextWrap: {
    flex: 1,
  },
  photoTitle: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textPrimary,
  },
  photoSub: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textSecondary,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
    borderRadius: groceryTheme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: groceryTheme.colors.textPrimary,
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
  },
  typeRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: groceryTheme.radius.full,
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
  },
  typeChipActive: {
    backgroundColor: groceryTheme.colors.brand,
    borderColor: groceryTheme.colors.brand,
  },
  typeChipText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textPrimary,
  },
  typeChipTextActive: {
    color: groceryTheme.colors.surfaceContainerLowest,
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: groceryTheme.radius.full,
    backgroundColor: groceryTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryBtnText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.surfaceContainerLowest,
  },
});

export default ProfileScreen;
