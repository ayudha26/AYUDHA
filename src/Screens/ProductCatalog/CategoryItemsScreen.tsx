import DataStateNotice from "@components/Feedback/DataStateNotice";
import BottomNavBar from "@components/Layouts/BottomNavBar";
import ScreenContainer from "@components/Layouts/ScreenContainer";
import ScreenHeader from "@components/Layouts/ScreenHeader";
import supabase from "@config/supabase";
import { useCart } from "@context/CartContext";
import { CategoryItemsProps, Product } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import { getOptimizedImageUrl } from "@src/Utils/imageOptimization";
import { mockProducts } from "@src/Utils/mockData";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CategoryItemsScreen: React.FC<CategoryItemsProps> = ({ route, navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { cartItems } = useCart();

  const loadProducts = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });

      // Resolve category identifiers: the route may pass category IDs (uuid) or slugs/names like 'civil'.
      const resolveCategoryIds = async () => {
        if (route.params.categoryIds && route.params.categoryIds.length > 0) {
          const ids: string[] = [];
          const names: string[] = [];
          for (const v of route.params.categoryIds) {
            // simple UUID v4 check
            if (/^[0-9a-fA-F-]{36}$/.test(String(v))) ids.push(String(v));
            else names.push(String(v));
          }

          if (names.length) {
            const { data: catRows } = await supabase
              .from("categories")
              .select("id,name")
              .ilike("name", `%${names[0]}%`); // fallback: try matching by name
            if (catRows?.length) {
              catRows.forEach((r: any) => ids.push(r.id));
            }
          }

          return ids;
        }

        if (route.params.categoryId) {
          const v = String(route.params.categoryId);
          if (/^[0-9a-fA-F-]{36}$/.test(v)) return [v];

          // not a uuid — try to resolve by category name or catalog_key
          const { data: catRows } = await supabase
            .from("categories")
            .select("id,name")
            .ilike("name", `%${v}%`)
            .limit(1);
          if (catRows && catRows.length) return [catRows[0].id];
          return [];
        }

        return [];
      };

      const resolved = await resolveCategoryIds();
      if (resolved && resolved.length > 0) {
        if (resolved.length === 1) query = query.eq("category_id", resolved[0]);
        else query = query.in("category_id", resolved);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setProducts(data || []);
    } catch (error) {
      // Log the underlying error for debugging (stringify safely)
      const safe = (obj: any) => {
        try {
          return JSON.stringify(obj, Object.getOwnPropertyNames(obj), 2);
        } catch (e) {
          return String(obj);
        }
      };
      // eslint-disable-next-line no-console
      console.error('[CategoryItems] loadProducts error:', safe(error), { message: (error as any)?.message, stack: (error as any)?.stack });
      let fallbackRows = [];
      if (route.params.categoryIds && route.params.categoryIds.length > 0) {
        fallbackRows = mockProducts.filter((product) => route.params.categoryIds?.includes(product.category_id));
      } else {
        fallbackRows = mockProducts.filter((product) => product.category_id === route.params.categoryId);
      }
      setProducts(fallbackRows);
      setLoadError("Could not fetch this category from live catalog. Showing fallback items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [route.params.categoryId, route.params.categoryIds]);

  useEffect(() => {
    const urls = products
      .map((item) => getOptimizedImageUrl(item.image_url, "card"))
      .filter(Boolean);

    if (urls.length) {
      ExpoImage.prefetch(urls, "memory-disk").catch(() => {});
    }
  }, [products]);

  const headerTitle = useMemo(() => route.params.categoryName || "Category Items", [route.params.categoryName]);

  return (
    <ScreenContainer>
      <ScreenHeader title={headerTitle} onBack={() => navigation.goBack()} />

      {loadError ? (
        <DataStateNotice message={loadError} type="warning" actionLabel="Retry" onAction={loadProducts} />
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.itemGrid}>
          {products.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemTile}
              onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
            >
              <View style={styles.itemImageWrap}>
                <ExpoImage
                  source={{ uri: getOptimizedImageUrl(item.image_url, "card") }}
                  style={styles.itemImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={100}
                />
              </View>
              <Text style={styles.itemName} numberOfLines={3}>
                {item.name}
              </Text>
              {item.brand ? (
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.brand}
                </Text>
              ) : null}
              {item.material ? (
                <Text style={styles.itemSubMeta} numberOfLines={1}>
                  {item.material}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {!loading && !products.length ? <Text style={styles.helperText}>No items found in this category.</Text> : null}
      </ScrollView>

      <BottomNavBar
        activeKey="category"
        items={[
          {
            key: "home",
            label: "Home",
            icon: "home-outline",
            activeIcon: "home",
            onPress: () => navigation.navigate("HomeScreen"),
          },
          {
            key: "category",
            label: "Category",
            icon: "grid-outline",
            activeIcon: "grid",
            onPress: () => navigation.navigate("ProductCatalog", { openMode: "category" }),
          },
          {
            key: "orders",
            label: "Orders",
            icon: "receipt-outline",
            activeIcon: "receipt",
            onPress: () => navigation.navigate("Orders"),
          },
          {
            key: "profile",
            label: "Account",
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
    paddingHorizontal: 16,
    paddingBottom: 92,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
  },
  itemTile: {
    width: "30.6%",
    marginBottom: 18,
  },
  itemImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: groceryTheme.colors.surfaceAlt,
    marginBottom: 8,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemName: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  itemMeta: {
    color: groceryTheme.colors.brandDark,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  itemSubMeta: {
    color: groceryTheme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  helperText: {
    textAlign: "center",
    color: groceryTheme.colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 10,
  },
});

export default CategoryItemsScreen;
