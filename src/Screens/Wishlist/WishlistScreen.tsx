import DataStateNotice from "@components/Feedback/DataStateNotice";
import BottomNavBar from "@components/Layouts/BottomNavBar";
import ScreenContainer from "@components/Layouts/ScreenContainer";
import ScreenHeader from "@components/Layouts/ScreenHeader";
import supabase from "@config/supabase";
import { WishlistItem, WishlistProps } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import { getOptimizedImageUrl } from "@src/Utils/imageOptimization";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

const WishlistScreen: React.FC<WishlistProps> = ({ navigation }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      setNotice(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setItems([]);
        setNotice("Sign in to save and view wishlist items.");
        return;
      }

      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, product:products(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setItems(data || []);
    } catch (error) {
      setItems([]);
      setNotice("Wishlist sync failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadWishlist);
    return unsubscribe;
  }, [navigation]);

  const removeItem = async (id: string) => {
    try {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
      if (error) {
        throw error;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      Alert.alert("Error", "Could not remove this item from wishlist.");
    }
  };

  const wishlistCountLabel = useMemo(() => `${items.length} item${items.length === 1 ? "" : "s"} saved`, [items.length]);

  return (
    <ScreenContainer>
      <ScreenHeader title="My Wishlist" onBack={() => navigation.goBack()} rightLabel="Refresh" onRightPress={loadWishlist} />
      {notice ? <DataStateNotice message={notice} type="warning" actionLabel="Retry" onAction={loadWishlist} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.caption}>{wishlistCountLabel}</Text>

        {!loading && !items.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No saved products yet</Text>
            <Text style={styles.emptyDesc}>Tap the heart on a product page to save it here.</Text>
          </View>
        ) : null}

        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => navigation.navigate("ProductDetail", { productId: item.product_id })}
          >
            <ExpoImage
              source={{ uri: getOptimizedImageUrl(item.product?.image_url || "", "card") || "https://via.placeholder.com/200" }}
              style={styles.image}
              contentFit="cover"
            />
            <View style={styles.textWrap}>
              <Text style={styles.name} numberOfLines={2}>
                {item.product?.name || "Saved Product"}
              </Text>
              <Text style={styles.unit}>{item.product?.unit || "1 unit"}</Text>
              <Text style={styles.price}>₹{item.product?.price?.toFixed(2) || "0.00"}</Text>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },
  caption: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textSecondary,
    marginBottom: 8,
  },
  emptyState: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.xl,
    padding: 20,
  },
  emptyTitle: {
    ...groceryTheme.typography.headlineSm,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyDesc: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textSecondary,
  },
  card: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.xl,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  image: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: groceryTheme.colors.surfaceAlt,
  },
  textWrap: {
    flex: 1,
  },
  name: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 4,
  },
  unit: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textSecondary,
    marginBottom: 6,
  },
  price: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.brandDark,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: groceryTheme.radius.full,
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
  },
  removeText: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.brandDark,
    fontWeight: "700",
  },
});

export default WishlistScreen;
