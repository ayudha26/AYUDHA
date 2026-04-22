import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CartItem as CartItemType, Product } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";

import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  item: CartItemType & { product?: Product };
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
};

const CartItem: React.FC<Props> = ({ item, onIncrease, onDecrease, onRemove }) => {
  const product = item.product;
  const categoryName = "TOOLS / HARDWARE"; // Mock category for now

  return (
    <View style={styles.container}>
      <View style={styles.imageWrap}>
         <Image
           source={{ uri: product?.image_url || "https://via.placeholder.com/150" }}
           style={styles.image}
         />
      </View>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.category}>{categoryName}</Text>
          <Text style={styles.price}>₹{(product?.price || 0).toFixed(2)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {product?.name || "Item"}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          Industrial Grade hardware for professionals
        </Text>
      </View>
      
      <View style={styles.actionsRow}>
        <View style={styles.qtyPill}>
          <TouchableOpacity onPress={onDecrease} style={styles.qtyBtn}>
            <Text style={styles.qtyBtnText}>–</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>
            {item.quantity < 10 ? `0${item.quantity}` : item.quantity}
          </Text>
          <TouchableOpacity onPress={onIncrease} style={[styles.qtyBtn, styles.qtyBtnPlus]}>
            <Text style={styles.qtyBtnTextPlus}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <MaterialCommunityIcons name="delete-outline" size={16} color="#AD2B00" />
          <Text style={styles.removeText}>REMOVE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.lg,
    padding: 16,
    marginBottom: 20,
  },
  imageWrap: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
  },
  image: {
    width: 140,
    height: 140,
    backgroundColor: "#f0f0f0", // or surface
    borderRadius: 8,
  },
  info: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  category: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textSecondary,
    letterSpacing: 1,
    marginTop: 4,
  },
  title: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
    fontSize: 18,
    marginBottom: 4,
  },
  desc: {
    ...groceryTheme.typography.body,
    fontSize: 13,
    color: groceryTheme.colors.textSecondary,
  },
  price: {
    ...groceryTheme.typography.headlineSm,
    fontWeight: "800",
    color: groceryTheme.colors.textPrimary,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    borderRadius: 24,
    padding: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnPlus: {
    backgroundColor: groceryTheme.colors.primary,
  },
  qtyBtnText: {
    color: groceryTheme.colors.textSecondary,
    fontSize: 20,
    fontWeight: "400",
  },
  qtyBtnTextPlus: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: "600",
  },
  qtyText: {
    width: 32,
    textAlign: "center",
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textPrimary,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  removeText: {
    ...groceryTheme.typography.labelMd,
    color: '#AD2B00',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export default CartItem;
