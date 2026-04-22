import DataStateNotice from "@components/Feedback/DataStateNotice";
import ScreenContainer from "@components/Layouts/ScreenContainer";
import ScreenHeader from "@components/Layouts/ScreenHeader";
import supabase from "@config/supabase";
import { useCart } from "@context/CartContext";
import { Product, ProductDetailProps, ProductVariant } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import { getOptimizedImageUrl } from "@src/Utils/imageOptimization";
import { mockProducts } from "@src/Utils/mockData";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const ProductDetailScreen: React.FC<ProductDetailProps> = ({ route, navigation }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addToCart } = useCart();

  const loadProduct = async () => {
    setNotice(null);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", route.params.productId)
        .single();

      if (error) throw error;
      const currentProduct = data || mockProducts.find((item) => item.id === route.params.productId) || mockProducts[0];
      setProduct(currentProduct);

      const { data: variantData } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", currentProduct.id)
        .order("created_at", { ascending: true });

      const variantRows = variantData || [];
      setVariants(variantRows);
      setSelectedVariantId(variantRows.length ? variantRows[0].id : null);

      const { data: relatedData, error: relatedError } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", currentProduct.category_id)
        .neq("id", currentProduct.id)
        .limit(4);

      if (relatedError) throw relatedError;
      setRelatedProducts(relatedData?.length ? relatedData.slice(0, 2) : mockProducts.filter((item) => item.id !== currentProduct.id).slice(0, 2));
    } catch (error) {
      const fallbackProduct = mockProducts.find((item) => item.id === route.params.productId) || mockProducts[0];
      setProduct(fallbackProduct);
      setVariants([]);
      setSelectedVariantId(null);
      setRelatedProducts(mockProducts.filter((item) => item.id !== fallbackProduct.id).slice(0, 2));
      setNotice("Live product details are unavailable. Showing preview material data.");
    }
  };

  useEffect(() => {
    loadProduct();
  }, [route.params.productId]);

  useEffect(() => {
    const loadWishlistState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsWishlisted(false);
          return;
        }

        const { data, error } = await supabase
          .from("wishlist_items")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", route.params.productId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        setIsWishlisted(Boolean(data));
      } catch (error) {
        setIsWishlisted(false);
      }
    };

    loadWishlistState();
  }, [route.params.productId]);

  const similarProducts = useMemo(() => relatedProducts, [relatedProducts]);
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) || variants[0] || null,
    [selectedVariantId, variants],
  );
  const activeUnit = selectedVariant?.size_label || product?.unit || "";
  const activeImage = selectedVariant?.image_url || product?.image_url || "";
  const activePrice = selectedVariant?.price ?? product?.price ?? 0;
  const oldPrice = activePrice > 0 ? activePrice + 8 : 0;

  useEffect(() => {
    const urls = [
      getOptimizedImageUrl(activeImage, "detail"),
      ...similarProducts.map((item) => getOptimizedImageUrl(item.image_url, "card")),
    ].filter(Boolean);

    if (urls.length) {
      ExpoImage.prefetch([...new Set(urls)], "memory-disk").catch(() => {});
    }
  }, [activeImage, similarProducts]);

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      await addToCart(product.id, quantity);
      const selectedSizeLabel = selectedVariant?.size_label || product.unit;
      Alert.alert("Added to cart", `${quantity} item(s) of ${selectedSizeLabel} added to cart.`, [
        { text: "Continue" },
        { text: "Go to Cart", onPress: () => navigation.navigate("Cart") },
      ]);
    } catch (error) {
      Alert.alert("Error", "Could not add item to cart.");
    }
  };

  const toggleWishlist = async () => {
    try {
      setWishlistLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !product) {
        Alert.alert("Sign in required", "Please sign in to save wishlist items.");
        return;
      }

      if (isWishlisted) {
        const { error } = await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", product.id);

        if (error) {
          throw error;
        }

        setIsWishlisted(false);
        return;
      }

      const { error } = await supabase.from("wishlist_items").insert({
        user_id: user.id,
        product_id: product.id,
      });

      if (error) {
        throw error;
      }

      setIsWishlisted(true);
    } catch (error) {
      Alert.alert("Error", "Could not update wishlist right now.");
    } finally {
      setWishlistLoading(false);
    }
  };

  if (!product) {
    return (
      <ScreenContainer>
        <Text style={styles.loading}>Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Material Details" onBack={() => navigation.goBack()} rightLabel="Refresh" onRightPress={loadProduct} />
      {notice ? <DataStateNotice message={notice} type="warning" actionLabel="Retry" onAction={loadProduct} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        <ExpoImage
          source={{ uri: getOptimizedImageUrl(activeImage, "detail") }}
          style={styles.heroImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={120}
        />

        <View style={styles.utilityRow}>
          <TouchableOpacity style={styles.wishlistBtn} onPress={toggleWishlist} disabled={wishlistLoading}>
            <MaterialCommunityIcons
              name={isWishlisted ? "heart" : "heart-outline"}
              size={18}
              color={isWishlisted ? groceryTheme.colors.brand : groceryTheme.colors.textPrimary}
            />
            <Text style={styles.wishlistText}>{isWishlisted ? "Saved" : "Save"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.unitTag}>{activeUnit}</Text>
        <Text style={styles.rating}>4.8 (214 contractor reviews)</Text>

        {product.brand ? <Text style={styles.metaLine}>Brand: {product.brand}</Text> : null}
        {product.material ? <Text style={styles.metaLine}>Material: {product.material}</Text> : null}

        {variants.length ? (
          <View style={styles.variantWrap}>
            <Text style={styles.variantTitle}>Available Sizes</Text>
            <View style={styles.variantRow}>
              {variants.map((variant) => {
                const isActive = selectedVariant?.id === variant.id;
                return (
                  <TouchableOpacity
                    key={variant.id}
                    style={[styles.variantChip, isActive ? styles.variantChipActive : null]}
                    onPress={() => setSelectedVariantId(variant.id)}
                  >
                    <Text style={[styles.variantText, isActive ? styles.variantTextActive : null]}>
                      {variant.size_label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{activePrice.toFixed(2)}</Text>
          <Text style={styles.oldPrice}>₹{oldPrice.toFixed(2)}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Bulk Deal</Text>
          </View>
        </View>

        <Text style={styles.description}>
          {product.description || "Site-ready construction material with dependable quality and fast dispatch."}
        </Text>

        <Text style={styles.sectionTitle}>Related Materials</Text>
        <View style={styles.similarRow}>
          {similarProducts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.similarCard}
              onPress={() => navigation.replace("ProductDetail", { productId: item.id })}
            >
              <ExpoImage
                source={{ uri: getOptimizedImageUrl(item.image_url, "card") }}
                style={styles.similarImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={90}
              />
              <Text style={styles.similarName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.similarPrice}>₹{item.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.counter}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
          >
            <Text style={styles.counterSymbol}>-</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{quantity}</Text>
          <TouchableOpacity style={styles.counterBtn} onPress={() => setQuantity((prev) => prev + 1)}>
            <Text style={styles.counterSymbol}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
          <Text style={styles.addButtonText}>Add to Cart</Text>
          <Text style={styles.addButtonPrice}>₹{(activePrice * quantity).toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  heroImage: {
    width: "100%",
    height: 280,
    marginBottom: 12,
  },
  utilityRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  wishlistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
    borderRadius: groceryTheme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
  },
  wishlistText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textPrimary,
  },
  name: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  rating: {
    color: groceryTheme.colors.textSecondary,
    marginTop: 6,
    fontSize: 14,
  },
  unitTag: {
    marginTop: 8,
    color: groceryTheme.colors.brandDark,
    fontWeight: "600",
    fontSize: 14,
  },
  metaLine: {
    marginTop: 4,
    color: groceryTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  variantWrap: {
    marginTop: 14,
  },
  variantTitle: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  variantChip: {
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: groceryTheme.colors.surface,
  },
  variantChipActive: {
    borderColor: groceryTheme.colors.brand,
    backgroundColor: groceryTheme.colors.brand,
  },
  variantText: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  variantTextActive: {
    color: groceryTheme.colors.inverse,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  price: {
    fontWeight: "800",
    fontSize: 24,
    color: groceryTheme.colors.textPrimary,
  },
  oldPrice: {
    marginLeft: 8,
    textDecorationLine: "line-through",
    color: "#b0b0b0",
    fontSize: 16,
  },
  badge: {
    backgroundColor: groceryTheme.colors.brand,
    borderRadius: 8,
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    marginTop: 14,
    lineHeight: 22,
    color: groceryTheme.colors.textPrimary,
    fontSize: 15,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "700",
    color: groceryTheme.colors.textPrimary,
  },
  similarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  similarCard: {
    width: "48%",
    backgroundColor: groceryTheme.colors.surface,
    borderRadius: groceryTheme.radius.md,
    padding: 10,
  },
  similarImage: {
    width: "100%",
    height: 90,
  },
  similarName: {
    color: groceryTheme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    minHeight: 42,
  },
  similarPrice: {
    fontWeight: "700",
    fontSize: 15,
    marginTop: 6,
    color: groceryTheme.colors.textPrimary,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: groceryTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: groceryTheme.colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  counter: {
    width: 110,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginRight: 10,
  },
  counterBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  counterSymbol: {
    fontSize: 20,
    color: groceryTheme.colors.brandDark,
  },
  counterValue: {
    fontWeight: "700",
    fontSize: 18,
    color: groceryTheme.colors.textPrimary,
  },
  addButton: {
    flex: 1,
    height: 54,
    backgroundColor: groceryTheme.colors.brand,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  addButtonPrice: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  loading: {
    textAlign: "center",
    marginTop: 40,
    color: groceryTheme.colors.textSecondary,
  },
});

export default ProductDetailScreen;
