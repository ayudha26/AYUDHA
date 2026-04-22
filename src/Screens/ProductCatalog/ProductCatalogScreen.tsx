import DataStateNotice from "@components/Feedback/DataStateNotice";
import BottomNavBar from "@components/Layouts/BottomNavBar";
import ScreenContainer from "@components/Layouts/ScreenContainer";
import supabase from "@config/supabase";
import { useCart } from "@context/CartContext";
import { Category, ProductCatalogProps } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import { mockCategories } from "@src/Utils/mockData";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

// Define the parent structure that mimics the flat mockup list
const BUCKETS = [
  { id: "mshardware", title: "MS HARDWARE", image: require("../../../assets/category-images/ms-hardware-flap-wheel.png") },
  { id: "plumbing", title: "PLUMBING", image: require("../../../assets/category-images/plumbing-brass-tee.png") },
  { id: "civil", title: "CIVIL", image: require("../../../assets/category-images/civil-cement-bag.png") },
  { id: "electric", title: "ELECTRIC", image: require("../../../assets/category-images/electric-bulb.png") },
  { id: "paint", title: "PAINT", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600" },
  { id: "small", title: "SMALL ITEMS", image: require("../../../assets/category-images/small-items-solution-tape.png") },
  { id: "bolts", title: "BOLTS & NUTS", image: require("../../../assets/category-images/bolts-and-nuts.png"), bgColor: "#E53E3E" },
];

const BUCKET_MAPPING: Record<string, string[]> = {
  mshardware: ["hinge", "channel", "handle", "kitchen", "wardrobe", "door lock", "architectural", "hardware", "ms"],
  plumbing: ["pipe", "pipes", "fitting", "fittings", "cpvc", "pvc", "sanitary", "bath", "tank", "valve", "tap"],
  civil: ["cement", "concrete", "brick", "civil"],
  electric: ["wire", "switch", "socket", "electrical", "lighting", "light"],
  paint: ["paint", "brush", "roller", "primer"],
  small: ["small", "misc"],
  bolts: ["bolt", "nut", "screw", "fastener"],
};

const SUBCAT_ICONS: Record<string, any> = {
  "pipes": "pipe",
  "fittings": "pipe-leak",
  "taps": "water-pump",
  "valves": "valve",
};

const getBucketIdForCategory = (catName: string) => {
  const name = catName.toLowerCase();
  for (const [bucketId, keywords] of Object.entries(BUCKET_MAPPING)) {
    if (keywords.some((kw) => name.includes(kw))) {
      return bucketId;
    }
  }
  return "small"; // fallback
};

const ProductCatalogScreen: React.FC<ProductCatalogProps> = ({ route, navigation }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { cartItems } = useCart();
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      setCategories(data?.length ? data : mockCategories);
      setIsUsingFallback(!data?.length);
    } catch (error) {
      setCategories(mockCategories);
      setIsUsingFallback(true);
      setLoadError("Category sync failed. Preview categories are shown.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="wrench-outline" size={24} color={groceryTheme.colors.brand} style={{ marginRight: 8 }} />
          <Text style={styles.logoText}>AYUDHA</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Cart")}>
          <View>
            <Ionicons name="cart-outline" size={26} color={groceryTheme.colors.textPrimary} />
            {cartItems.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItems.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadError ? (
          <DataStateNotice message={loadError} type="warning" actionLabel="Retry" onAction={loadData} />
        ) : null}
        {!loadError && isUsingFallback ? (
          <DataStateNotice message="Using backup categories while live sync completes." type="info" />
        ) : null}

        <View style={styles.pageTitleContainer}>
          <Text style={styles.pageTitleText}>
            Browse by <Text style={styles.pageTitleHighlight}>Category</Text>
          </Text>
        </View>

        <View style={[styles.searchContainer, isSearchFocused && styles.searchFocused]}>
          <Ionicons name="search" size={20} color={groceryTheme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search plumbing, fasteners, paint..."
            placeholderTextColor={groceryTheme.colors.textMuted}
            style={styles.searchInput}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>

        <View style={styles.bucketGrid}>
          {BUCKETS.map((bucket) => {
            return (
              <TouchableOpacity
                key={bucket.id}
                style={styles.bucketCardWrap}
                onPress={() => {
                  const activeSubCategories = categories.filter((cat) => getBucketIdForCategory(cat.name) === bucket.id);
                  const categoryIds = activeSubCategories.map(c => c.id);
                  
                  // Even if categoryIds is empty, we still pass it so it tries to fetch or show empty state
                  navigation.push("CategoryItems", {
                    categoryId: bucket.id, // fallback for single checks
                    categoryIds: categoryIds,
                    categoryName: bucket.title,
                  });
                }}
              >
                <View style={[styles.bucketCard, bucket.bgColor ? { backgroundColor: bucket.bgColor } : null]}>
                  {bucket.image && (
                    <Image
                      source={bucket.image}
                      style={styles.bucketImage}
                      contentFit="cover"
                      transition={200}
                    />
                  )}
                </View>
                <Text style={styles.bucketTitle}>
                  {bucket.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>



        <View style={styles.bulkBannerContainer}>
          <View style={styles.bulkBannerAccent} />
          <View style={styles.bulkBannerContent}>
            <Text style={styles.bulkTitle}>Looking{'\n'}for Bulk{'\n'}Quotes?</Text>
            <Text style={styles.bulkDesc}>Get exclusive industrial pricing for orders above ₹50,000.</Text>
            <TouchableOpacity style={styles.bulkBtn}>
              <Text style={styles.bulkBtnText}>Contact Sales</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <BottomNavBar
        activeKey="category"
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
            onPress: () => navigation.navigate("ProductCatalog", {}),
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
    paddingBottom: 88,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: groceryTheme.spacing.lg,
    paddingVertical: groceryTheme.spacing.md,
    backgroundColor: groceryTheme.colors.surfaceContainerLowest, // white base
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.brand,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: groceryTheme.colors.brand,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    ...groceryTheme.typography.caption,
    fontSize: 10,
    color: groceryTheme.colors.surfaceContainerLowest,
    fontWeight: "bold",
  },
  pageTitleContainer: {
    paddingHorizontal: groceryTheme.spacing.lg,
    paddingTop: groceryTheme.spacing.xl,
    paddingBottom: groceryTheme.spacing.md,
  },
  pageTitleText: {
    ...groceryTheme.typography.displayLg,
    color: groceryTheme.colors.textPrimary,
    fontSize: 28, // slightly smaller than hero
  },
  pageTitleHighlight: {
    color: groceryTheme.colors.brand,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    marginHorizontal: groceryTheme.spacing.lg,
    borderRadius: groceryTheme.radius.md,
    paddingHorizontal: groceryTheme.spacing.md,
    height: 48,
    marginBottom: groceryTheme.spacing.xl,
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchFocused: {
    borderColor: 'rgba(173, 43, 0, 0.4)', // Ghost border primary color
  },
  searchIcon: {
    marginRight: groceryTheme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textPrimary,
  },
  bucketGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: groceryTheme.spacing.lg,
    rowGap: groceryTheme.spacing.xl,
    marginBottom: groceryTheme.spacing.xxl,
  },
  bucketCardWrap: {
    width: "48%",
    alignItems: "center",
  },
  bucketCard: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: groceryTheme.colors.surfaceContainerLow,
    borderRadius: groceryTheme.radius.xl,
    overflow: "hidden",
    marginBottom: groceryTheme.spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  bucketCardActive: {
    borderColor: 'rgba(173, 43, 0, 0.4)', // Ghost border primary color (40% opacity)
    backgroundColor: 'rgba(217, 57, 0, 0.1)', // subtle primary container background
  },
  bucketImage: {
    width: "100%",
    height: "100%",
  },
  bucketTitle: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textPrimary,
    textAlign: "center",
  },
  bucketTitleActive: {
    color: groceryTheme.colors.primary,
  },
  bulkBannerContainer: {
    margin: groceryTheme.spacing.lg,
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: groceryTheme.spacing.xxl,
  },
  bulkBannerAccent: {
    width: 6,
    backgroundColor: groceryTheme.colors.brand,
  },
  bulkBannerContent: {
    flex: 1,
    padding: groceryTheme.spacing.lg,
  },
  bulkTitle: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
    marginBottom: groceryTheme.spacing.sm,
  },
  bulkDesc: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textSecondary,
    marginBottom: groceryTheme.spacing.xl,
    maxWidth: '80%',
  },
  bulkBtn: {
    backgroundColor: groceryTheme.colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: groceryTheme.spacing.lg,
    paddingVertical: groceryTheme.spacing.sm,
    borderRadius: groceryTheme.radius.md,
  },
  bulkBtnText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.surfaceContainerLowest,
  },
});

export default ProductCatalogScreen;
