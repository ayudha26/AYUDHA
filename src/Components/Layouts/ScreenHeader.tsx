import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { groceryTheme } from "@src/Utils/groceryTheme";

type Props = {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
};

const ScreenHeader: React.FC<Props> = ({ title, onBack, rightLabel, onRightPress }) => {
  return (
    <View style={styles.row}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.sideBtn}>
          <Ionicons name="chevron-back" size={22} color={groceryTheme.colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideBtn} />
      )}

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      {rightLabel ? (
        <TouchableOpacity onPress={onRightPress} style={styles.sideBtn}>
          <Text style={styles.rightText}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.sideBtn} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: groceryTheme.spacing.lg,
    paddingVertical: groceryTheme.spacing.md,
  },
  sideBtn: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rightText: {
    color: groceryTheme.colors.brandDark,
    fontWeight: "700",
    fontSize: 13,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: groceryTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 8,
  },
});

export default ScreenHeader;
