import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Address } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";

type Props = {
  address: Address;
  selected: boolean;
  onPress: () => void;
};

const AddressCard: React.FC<Props> = ({ address, selected, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{address.name}</Text>
        <Text style={styles.line}>{address.street}</Text>
        <Text style={styles.line}>
          {address.city}, {address.state} {address.zip_code}
        </Text>
      </View>
      <Text style={styles.menu}>...</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: groceryTheme.colors.surface,
    borderRadius: groceryTheme.radius.lg,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d9d9d9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioSelected: {
    borderColor: groceryTheme.colors.brand,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: groceryTheme.colors.brand,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: groceryTheme.colors.textPrimary,
    marginBottom: 6,
  },
  line: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  menu: {
    fontSize: 16,
    color: groceryTheme.colors.textSecondary,
  },
});

export default AddressCard;
