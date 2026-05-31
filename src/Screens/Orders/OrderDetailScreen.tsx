import DataStateNotice from "@components/Feedback/DataStateNotice";
import ScreenContainer from "@components/Layouts/ScreenContainer";
import ScreenHeader from "@components/Layouts/ScreenHeader";
import supabase from "@config/supabase";
import { Order, OrderDetailProps, OrderItem } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

type OrderItemWithProduct = OrderItem & {
  product?: {
    id: string;
    name: string;
    image_url: string;
    unit: string;
  } | null;
};

const OrderDetailScreen: React.FC<OrderDetailProps> = ({ navigation, route }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setNotice(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setOrder(null);
        setItems([]);
        setNotice("Sign in to view order details.");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            product:products (
              id,
              name,
              image_url,
              unit
            )
          )
        `)
        .eq("id", route.params.orderId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        throw error;
      }

      setOrder(data);
      setItems(data.order_items || []);
    } catch (error) {
      setOrder(null);
      setItems([]);
      setNotice("Could not load order details from Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [route.params.orderId]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return (
    <ScreenContainer>
      <ScreenHeader title="Order Details" onBack={() => navigation.goBack()} rightLabel="Refresh" onRightPress={loadOrder} />
      {notice ? <DataStateNotice message={notice} type="warning" actionLabel="Retry" onAction={loadOrder} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <Text style={styles.loading}>Loading order...</Text> : null}

        {order ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
              <Text style={styles.orderId}>Order ID: #{order.id}</Text>
              <Text style={styles.row}>Status: {order.status}</Text>
              <Text style={styles.row}>Items: {itemCount}</Text>
              <Text style={styles.row}>Delivery: {new Date(order.delivery_date).toLocaleString()}</Text>
              <Text style={styles.total}>Total Paid: ₹{Number(order.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.sectionLabel}>DELIVERY ADDRESS</Text>
              <Text style={styles.address}>{order.delivery_address}</Text>
            </View>

            <Text style={styles.itemsLabel}>ORDER ITEMS</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <ExpoImage
                  source={{ uri: item.product?.image_url || "https://via.placeholder.com/200?text=Item" }}
                  style={styles.image}
                  contentFit="cover"
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product?.name || "Product"}</Text>
                  <Text style={styles.itemMeta}>
                    Qty {item.quantity} • {item.product?.unit || "unit"}
                  </Text>
                  <Text style={styles.itemPrice}>
                    ₹{Number(item.price_at_purchase).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  loading: {
    textAlign: "center",
    color: groceryTheme.colors.textSecondary,
    marginTop: 24,
  },
  summaryCard: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.xl,
    padding: 16,
  },
  sectionLabel: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  orderId: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 10,
  },
  row: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textSecondary,
    marginBottom: 6,
  },
  total: {
    ...groceryTheme.typography.headlineSm,
    color: groceryTheme.colors.textPrimary,
    marginTop: 8,
  },
  address: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textPrimary,
    lineHeight: 22,
  },
  itemsLabel: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  itemCard: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.xl,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: groceryTheme.colors.surfaceAlt,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 4,
  },
  itemMeta: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textSecondary,
    marginBottom: 6,
  },
  itemPrice: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.brandDark,
  },
});

export default OrderDetailScreen;
