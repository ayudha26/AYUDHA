import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { groceryTheme } from "@src/Utils/groceryTheme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type NavItem = {
  key: string;
  label: string;
  onPress: () => void;
  icon?: IconName;
  activeIcon?: IconName;
};

type Props = {
  activeKey: string;
  items: NavItem[];
};

const BottomNavBar: React.FC<Props> = ({ activeKey, items }) => {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const iconName = isActive ? item.activeIcon || item.icon : item.icon;

        return (
          <TouchableOpacity key={item.key} onPress={item.onPress} style={styles.item}>
            {iconName ? (
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isActive ? groceryTheme.colors.brandDark : groceryTheme.colors.textPrimary}
                />
              </View>
            ) : null}
            <Text style={isActive ? styles.activeText : styles.text}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 76,
    backgroundColor: groceryTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: groceryTheme.colors.border,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  item: {
    minWidth: 68,
    alignItems: "center",
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: groceryTheme.colors.brand,
  },
  text: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  activeText: {
    color: groceryTheme.colors.brandDark,
    fontSize: 14,
    fontWeight: "700",
  },
});

export default BottomNavBar;
