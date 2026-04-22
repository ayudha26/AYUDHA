import AddressCard from "@components/AddressCard/AddressCard";
import DataStateNotice from "@components/Feedback/DataStateNotice";
import supabase from "@config/supabase";
import { Address, AddressManagementProps } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import { mockAddresses } from "@src/Utils/mockData";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type AddressDraft = {
  id?: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
};

const emptyDraft: AddressDraft = {
  name: "",
  street: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
};

const AddressManagementScreen: React.FC<AddressManagementProps> = ({ navigation, route }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AddressDraft>(emptyDraft);

  const loadAddresses = async () => {
    try {
      setNotice(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setAddresses(mockAddresses);
        setSelectedId(route.params?.selectedAddressId || mockAddresses[0].id);
        setNotice("Sign in to manage saved delivery addresses.");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");

      if (error) {
        throw error;
      }

      const rows = data || [];
      setAddresses(rows);

      const selectedAddress = rows.find((row) => row.id === route.params?.selectedAddressId);
      const defaultAddress = rows.find((row) => row.is_default);
      setSelectedId(selectedAddress?.id || defaultAddress?.id || rows[0]?.id || null);
    } catch (error) {
      setAddresses(mockAddresses);
      setSelectedId(route.params?.selectedAddressId || mockAddresses[0].id);
      setNotice("Could not sync addresses. Showing fallback delivery sites.");
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [route.params?.selectedAddressId]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedId) || null,
    [addresses, selectedId]
  );

  const openAddEditor = () => {
    setDraft(emptyDraft);
    setEditorVisible(true);
  };

  const openEditEditor = () => {
    if (!selectedAddress) {
      Alert.alert("Select address", "Choose an address to edit first.");
      return;
    }

    setDraft({
      id: selectedAddress.id,
      name: selectedAddress.name,
      street: selectedAddress.street,
      city: selectedAddress.city,
      state: selectedAddress.state,
      zip_code: selectedAddress.zip_code,
      phone: selectedAddress.phone,
    });
    setEditorVisible(true);
  };

  const saveAddress = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to save addresses.");
      return;
    }

    if (!draft.name || !draft.street || !draft.city || !draft.state || !draft.zip_code || !draft.phone) {
      Alert.alert("Missing details", "Please fill in all address fields.");
      return;
    }

    try {
      setSaving(true);

      if (draft.id) {
        const { error } = await supabase
          .from("addresses")
          .update({
            name: draft.name.trim(),
            street: draft.street.trim(),
            city: draft.city.trim(),
            state: draft.state.trim(),
            zip_code: draft.zip_code.trim(),
            phone: draft.phone.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", draft.id)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from("addresses").insert({
          user_id: userId,
          name: draft.name.trim(),
          street: draft.street.trim(),
          city: draft.city.trim(),
          state: draft.state.trim(),
          zip_code: draft.zip_code.trim(),
          phone: draft.phone.trim(),
          is_default: addresses.length === 0,
        });

        if (error) {
          throw error;
        }
      }

      setEditorVisible(false);
      setDraft(emptyDraft);
      await loadAddresses();
    } catch (error) {
      Alert.alert("Error", "Could not save the address right now.");
    } finally {
      setSaving(false);
    }
  };

  const useSelectedAddress = () => {
    if (route.params?.selectedAddressId !== undefined) {
      navigation.replace("Cart", { selectedAddressId: selectedId || undefined });
      return;
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dimmedArea} />
      <View style={styles.sheet}>
        <View style={styles.drag} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Manage Delivery Sites</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.close}>x</Text>
          </TouchableOpacity>
        </View>

        {notice ? <DataStateNotice message={notice} type="warning" /> : null}

        <ScrollView contentContainerStyle={styles.list}>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selected={selectedId === address.id}
              onPress={() => setSelectedId(address.id)}
            />
          ))}

          {!addresses.length ? <Text style={styles.helperText}>No saved addresses yet. Add your first delivery site.</Text> : null}
        </ScrollView>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={openEditEditor}>
            <Text style={styles.secondaryBtnText}>Edit Selected</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openAddEditor}>
            <Text style={styles.addBtnText}>+ Add New Site</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={useSelectedAddress}>
          <Text style={styles.confirmBtnText}>{route.params?.selectedAddressId !== undefined ? "Use Selected Address" : "Done"}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditorVisible(false)} />
          <View style={styles.editorSheet}>
            <Text style={styles.editorTitle}>{draft.id ? "Edit Address" : "Add Address"}</Text>
            <TextInput value={draft.name} onChangeText={(value) => setDraft((prev) => ({ ...prev, name: value }))} placeholder="Site name" style={styles.input} />
            <TextInput value={draft.street} onChangeText={(value) => setDraft((prev) => ({ ...prev, street: value }))} placeholder="Street address" style={styles.input} />
            <TextInput value={draft.city} onChangeText={(value) => setDraft((prev) => ({ ...prev, city: value }))} placeholder="City" style={styles.input} />
            <TextInput value={draft.state} onChangeText={(value) => setDraft((prev) => ({ ...prev, state: value }))} placeholder="State" style={styles.input} />
            <TextInput value={draft.zip_code} onChangeText={(value) => setDraft((prev) => ({ ...prev, zip_code: value }))} placeholder="Pincode" style={styles.input} keyboardType="number-pad" />
            <TextInput value={draft.phone} onChangeText={(value) => setDraft((prev) => ({ ...prev, phone: value }))} placeholder="Phone number" style={styles.input} keyboardType="phone-pad" />

            <TouchableOpacity style={styles.saveBtn} onPress={saveAddress} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Address"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.14)",
    justifyContent: "flex-end",
  },
  dimmedArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: groceryTheme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    minHeight: "75%",
  },
  drag: {
    alignSelf: "center",
    width: 46,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#dadada",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: groceryTheme.colors.border,
    paddingBottom: 10,
  },
  title: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  close: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  list: {
    paddingTop: 14,
    paddingBottom: 12,
  },
  helperText: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  addBtn: {
    flex: 1,
    backgroundColor: groceryTheme.colors.brand,
    borderRadius: 12,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: groceryTheme.colors.surface,
    borderRadius: 12,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
  },
  secondaryBtnText: {
    color: groceryTheme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  confirmBtn: {
    marginTop: 10,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: groceryTheme.colors.brand,
    backgroundColor: groceryTheme.colors.surface,
  },
  confirmBtnText: {
    color: groceryTheme.colors.brandDark,
    fontWeight: "700",
    fontSize: 15,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  editorSheet: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  editorTitle: {
    ...groceryTheme.typography.headlineSm,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 4,
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
  saveBtn: {
    marginTop: 8,
    borderRadius: groceryTheme.radius.full,
    backgroundColor: groceryTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  saveBtnText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.surfaceContainerLowest,
  },
});

export default AddressManagementScreen;
