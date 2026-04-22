import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { groceryTheme } from "@src/Utils/groceryTheme";

type Props = {
  message: string;
  type?: "info" | "warning" | "error";
  actionLabel?: string;
  onAction?: () => void;
};

const DataStateNotice: React.FC<Props> = ({
  message,
  type = "info",
  actionLabel,
  onAction,
}) => {
  const toneStyle =
    type === "error"
      ? styles.error
      : type === "warning"
      ? styles.warning
      : styles.info;

  return (
    <View style={[styles.container, toneStyle]}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: groceryTheme.spacing.lg,
    marginBottom: groceryTheme.spacing.sm,
    borderRadius: groceryTheme.radius.md,
    paddingHorizontal: groceryTheme.spacing.md,
    paddingVertical: groceryTheme.spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  message: {
    flex: 1,
    color: groceryTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  action: {
    color: groceryTheme.colors.brandDark,
    fontWeight: "700",
    fontSize: 12,
  },
  info: {
    backgroundColor: "#e9f1ff",
  },
  warning: {
    backgroundColor: groceryTheme.colors.brandSoft,
  },
  error: {
    backgroundColor: "#fdecec",
  },
});

export default DataStateNotice;
