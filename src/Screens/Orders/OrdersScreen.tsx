import { MaterialCommunityIcons } from "@expo/vector-icons";
import DataStateNotice from "@components/Feedback/DataStateNotice";
import BottomNavBar from "@components/Layouts/BottomNavBar";
import ScreenContainer from "@components/Layouts/ScreenContainer";
import supabase, { isSupabaseConfigured } from "@config/supabase";
import { Order, OrdersProps } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import { mockProducts } from "@src/Utils/mockData";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type TabType = "previous" | "upcoming";

const OrdersScreen: React.FC<OrdersProps> = ({ navigation }) => {
  const [tab, setTab] = useState<TabType>("upcoming");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    setLoadError(null);
    setNeedsSignIn(false);

    if (!isSupabaseConfigured) {
      setOrders([]);
      setLoadError("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setOrders([]);
        setNeedsSignIn(true);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      setOrders([]);
      setLoadError("Unable to fetch order history from Supabase. Check network and RLS policies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const previousStatuses = ["delivered", "cancelled"];
    return orders.filter((order) =>
      tab === "previous"
        ? previousStatuses.includes(order.status.toLowerCase())
        : !previousStatuses.includes(order.status.toLowerCase())
    );
  }, [orders, tab]);

  const getStatusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "out_for_delivery") return "In Transit";
    if (normalized === "confirmed") return "Scheduled";
    if (normalized === "pending") return "Pending";
    if (normalized === "delivered") return "Delivered";
    if (normalized === "cancelled") return "Cancelled";
    return "Active";
  };

  return (
    <ScreenContainer>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#1A1C1C" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>MY ORDERS</Text>
      </View>

      {loadError ? (
        <DataStateNotice message={loadError} type="warning" actionLabel="Retry" onAction={loadOrders} />
      ) : null}
      {!loadError && needsSignIn ? (
        <DataStateNotice message="Sign in to view your orders." type="info" />
      ) : null}

      {orders.length > 0 ? (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "upcoming" && styles.tabBtnActive]}
            onPress={() => setTab("upcoming")}
          >
            <Text style={[styles.tabText, tab === "upcoming" && styles.tabTextActive]}>ACTIVE{'\n'}ORDERS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "previous" && styles.tabBtnActive]}
            onPress={() => setTab("previous")}
          >
            <Text style={[styles.tabText, tab === "previous" && styles.tabTextActive]}>PAST{'\n'}ORDERS</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <Text style={styles.loadingText}>Refreshing orders...</Text> : null}
        {filteredOrders.map((order) => {
          // Select a stable product mockup for this order
          const displayProduct = mockProducts[order.id.charCodeAt(0) % mockProducts.length];
          const isUpcoming = tab === "upcoming";

          return (
            <View key={order.id} style={styles.orderCard}>
              <Image source={{ uri: displayProduct.image_url }} style={styles.heroImage} />
              
              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <View style={styles.leftInfo}>
                    <View style={styles.statusChip}>
                      <Text style={[styles.statusText, isUpcoming ? {color: '#AD2B00'} : {color: '#666'}]}>
                        {getStatusLabel(order.status).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.productName} numberOfLines={2}>{displayProduct.name}</Text>
                    <Text style={styles.orderIdText}>Order ID: #{order.id}</Text>
                  </View>
                  <View style={styles.rightInfo}>
                    <Text style={styles.priceText}>₹{Number(order.total).toLocaleString('en-IN')}</Text>
                    <Text style={styles.expectedText}>
                      {isUpcoming ? "EXPECTED\nTOMORROW" : "COMPLETED"}
                    </Text>
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <MaterialCommunityIcons name="calendar-blank" size={14} color="#1A1C1C" />
                  <Text style={styles.dateText}>
                    {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>{isUpcoming ? "TRACK ORDER" : "MODIFY"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.primaryBtn} 
                    onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}
                  >
                    <Text style={styles.primaryBtnText}>DETAILS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
        
        {orders.length > 0 && (
          <View style={styles.promoBanner}>
            <Text style={styles.promoTitle}>BUILD BETTER.</Text>
            <Text style={styles.promoDesc}>Get 15% off on all heavy machinery servicing with your next 5 orders.</Text>
            <TouchableOpacity style={styles.promoBtn}>
              <Text style={styles.promoBtnText}>UPGRADE TO PRO</Text>
            </TouchableOpacity>
            <MaterialCommunityIcons name="robot-industrial" size={100} color="rgba(255,255,255,0.2)" style={styles.promoIcon} />
          </View>
        )}

        {!loading && !filteredOrders.length ? (
          <Text style={styles.loadingText}>
            {orders.length ? "No orders in this view yet." : "You have no orders yet."}
          </Text>
        ) : null}
      </ScrollView>

      <BottomNavBar
        activeKey="orders"
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
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: groceryTheme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  pageTitle: {
    ...groceryTheme.typography.displayLg,
    color: groceryTheme.colors.textPrimary,
    fontSize: 28,
    textTransform: "uppercase",
  },
  container: {
    flex: 1,
    backgroundColor: groceryTheme.colors.background,
  },
  tabRow: {
    marginHorizontal: 16,
    marginBottom: 20,
    flexDirection: "row",
    backgroundColor: groceryTheme.colors.surfaceContainerLow,
    borderRadius: groceryTheme.radius.xl,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: groceryTheme.radius.xl,
  },
  tabBtnActive: {
    backgroundColor: groceryTheme.colors.primary,
  },
  tabText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textSecondary,
    textAlign: "center",
    letterSpacing: 1,
  },
  tabTextActive: {
    color: groceryTheme.colors.onPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: 0,
    marginBottom: 24,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: 240,
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftInfo: {
    flex: 1,
    paddingRight: 16,
  },
  rightInfo: {
    alignItems: "flex-end",
  },
  statusChip: {
    backgroundColor: '#FDECE6',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  statusText: {
    ...groceryTheme.typography.caption,
    fontWeight: "800",
    letterSpacing: 1,
  },
  productName: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 4,
  },
  orderIdText: {
    ...groceryTheme.typography.body,
    fontSize: 12,
    color: groceryTheme.colors.textSecondary,
  },
  priceText: {
    ...groceryTheme.typography.displayLg,
    fontSize: 24,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 4,
  },
  expectedText: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textSecondary,
    textAlign: "right",
    fontSize: 9,
    letterSpacing: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: groceryTheme.colors.surfaceContainerLow,
  },
  dateText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textPrimary,
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textPrimary,
    letterSpacing: 1,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: groceryTheme.colors.primary,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.onPrimary,
    letterSpacing: 1,
  },
  promoBanner: {
    backgroundColor: '#0070DD',
    borderRadius: groceryTheme.radius.md,
    padding: 24,
    marginTop: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  promoTitle: {
    ...groceryTheme.typography.displayLg,
    color: '#FFFFFF',
    fontSize: 24,
    marginBottom: 8,
    zIndex: 2,
  },
  promoDesc: {
    ...groceryTheme.typography.body,
    color: '#FFFFFF',
    marginBottom: 20,
    maxWidth: '85%',
    zIndex: 2,
  },
  promoBtn: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    zIndex: 2,
  },
  promoBtnText: {
    ...groceryTheme.typography.labelMd,
    color: '#0070DD',
    letterSpacing: 1,
  },
  promoIcon: {
    position: 'absolute',
    bottom: -15,
    right: -10,
    zIndex: 1,
  },
  loadingText: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
});

export default OrdersScreen;
