import CartItem from "@components/CartItem/CartItem";
import DataStateNotice from "@components/Feedback/DataStateNotice";
import ScreenContainer from "@components/Layouts/ScreenContainer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import supabase, { isSupabaseConfigured } from "@config/supabase";
import { useCart } from "@context/CartContext";
import { Address, CartProps } from "@src/Types/types";
import { groceryTheme } from "@src/Utils/groceryTheme";
import { mockProducts } from "@src/Utils/mockData";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CartScreen: React.FC<CartProps> = ({ navigation, route }) => {
  const {
    cartItems,
    loading,
    mutating,
    error,
    updateQuantity,
    clearCart,
    cartTotal,
    clearError,
  } = useCart();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(
    route.params?.selectedAddressId
  );
  const [addressNotice, setAddressNotice] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const deliveryFee = 60;
  const gstAmount = cartTotal * 0.18;
  const totalPayable = cartTotal + deliveryFee + gstAmount;

  const suggestedProducts = useMemo(() => mockProducts.slice(0, 3), []);
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) || addresses[0],
    [addresses, selectedAddressId]
  );

  useEffect(() => {
    if (route.params?.selectedAddressId) {
      setSelectedAddressId(route.params.selectedAddressId);
    }
  }, [route.params?.selectedAddressId]);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        setAddressNotice(null);
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;

        if (!user) {
          setIsSignedIn(false);
          setAddresses([]);
          setSelectedAddressId(undefined);
          setAddressNotice("Guest mode: sign in when you are ready to place your order.");
          return;
        }

        setIsSignedIn(true);

        const { data, error } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at");
        if (error) throw error;

        if (data?.length) {
          setAddresses(data);
          if (!route.params?.selectedAddressId) {
            const defaultAddress = data.find((row) => row.is_default) || data[0];
            setSelectedAddressId(defaultAddress.id);
          }
        } else {
          setAddresses([]);
          setSelectedAddressId(undefined);
          setAddressNotice("No saved addresses found yet. Add one before placing your order.");
        }
      } catch (error) {
        setAddresses([]);
        setSelectedAddressId(undefined);
        setAddressNotice("Address sync failed. Please refresh and try again.");
      }
    };

    loadAddresses();
  }, [route.params?.selectedAddressId]);

  const handlePlaceOrder = async () => {
    if (!cartItems.length) {
      Alert.alert("Cart Empty", "Please add items before placing an order.");
      return;
    }

    if (!isSupabaseConfigured) {
      Alert.alert(
        "Supabase not configured",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment."
      );
      return;
    }

    if (!selectedAddress) {
      Alert.alert("Missing address", "Please add and select a delivery address before placing your order.", [
        { text: "Not now", style: "cancel" },
        { text: "Manage Addresses", onPress: () => navigation.navigate("AddressManagement") },
      ]);
      return;
    }

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;

      if (!user) {
        Alert.alert("Sign in required", "Please sign in to place your order.", [
          { text: "Not now", style: "cancel" },
          { text: "Sign In", onPress: () => navigation.navigate("SignInScreen") },
        ]);
        return;
      }

      setPlacingOrder(true);

      const deliveryAddress = `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zip_code}`;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "confirmed",
          total: totalPayable,
          delivery_address: deliveryAddress,
          delivery_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .select("*")
        .single();

      if (orderError || !order) {
        throw orderError || new Error("Could not create order");
      }

      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.product?.price || 0,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        await supabase.from("orders").delete().eq("id", order.id);
        throw itemsError;
      }

      await clearCart();
      Alert.alert("Order placed", "Your order has been placed successfully.", [
        { text: "View Orders", onPress: () => navigation.navigate("Orders") },
      ]);
    } catch (error) {
      Alert.alert("Could not place order", "Please check your setup and try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#1A1C1C" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>YOUR <Text style={styles.pageTitleHighlight}>CARGO</Text></Text>
        <Text style={styles.pageDesc}>Professional grade hardware selected for precision. Review your order before dispatch.</Text>
      </View>

      {addressNotice ? <DataStateNotice message={addressNotice} type="warning" /> : null}
      {error ? <DataStateNotice message={error} type="error" actionLabel="Dismiss" onAction={clearError} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <Text style={styles.empty}>Loading cart...</Text> : null}

        {!loading && !cartItems.length ? <Text style={styles.empty}>Your cart is empty.</Text> : null}

        {cartItems.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
            onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
            onRemove={() => updateQuantity(item.id, 0)}
          />
        ))}

        {isSignedIn ? (
          <TouchableOpacity style={styles.addressCta} onPress={() => navigation.navigate("AddressManagement", { selectedAddressId })}>
            <Text style={styles.addressCtaLabel}>DELIVERY ADDRESS</Text>
            <Text style={styles.addressCtaTitle}>
              {selectedAddress ? selectedAddress.name : "Add a delivery address"}
            </Text>
            <Text style={styles.addressCtaText}>
              {selectedAddress
                ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zip_code}`
                : "You need one saved address in Supabase before placing an order."}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>FREQUENTLY BOUGHT TOGETHER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
          {suggestedProducts.map((product) => (
            <TouchableOpacity key={product.id} style={styles.suggestCard}>
              <View style={styles.suggestImageWrap}>
                 <Image source={{ uri: product.image_url }} style={styles.suggestImage} resizeMode="contain" />
              </View>
              <Text style={styles.suggestName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.suggestPrice}>₹{product.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.orderSummaryBlock}>
          <Text style={styles.summaryTitle}>ORDER SUMMARY</Text>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal ({cartItems.length} items)</Text>
            <Text style={styles.totalValue}>₹{cartTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Delivery</Text>
            <Text style={styles.totalValue}>₹{deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (GST 18%)</Text>
            <Text style={styles.totalValue}>₹{gstAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>TOTAL PAYABLE</Text>
            <Text style={styles.grandValue}>₹{totalPayable.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkoutBtn, (placingOrder || mutating) && styles.checkoutBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={placingOrder || mutating}
          >
            <Text style={styles.checkoutBtnText}>
              {placingOrder || mutating ? "PROCESSING..." : "PROCEED TO CHECKOUT"}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{marginLeft: 4}} />
          </TouchableOpacity>
          <Text style={styles.secureText}>SECURE INDUSTRIAL TRANSACTION</Text>
        </View>

        <View style={styles.guaranteeBlock}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#AD2B00" />
          <View style={styles.guaranteeTextWrap}>
            <Text style={styles.guaranteeTitle}>AYUDHA Guarantee</Text>
            <Text style={styles.guaranteeDesc}>Verified quality & timely delivery.</Text>
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  pageTitle: {
    ...groceryTheme.typography.displayLg,
    color: groceryTheme.colors.textPrimary,
    fontSize: 32,
    textTransform: "uppercase",
  },
  pageTitleHighlight: {
    color: groceryTheme.colors.primary,
  },
  pageDesc: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textSecondary,
    marginTop: 8,
    fontSize: 14,
    maxWidth: "90%",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  empty: {
    marginTop: 20,
    color: groceryTheme.colors.textSecondary,
    textAlign: "center",
  },
  sectionTitle: {
    ...groceryTheme.typography.labelMd,
    marginTop: 24,
    marginBottom: 16,
    color: groceryTheme.colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  addressCta: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.xl,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  addressCtaLabel: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textSecondary,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  addressCtaTitle: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 6,
  },
  addressCtaText: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textSecondary,
  },
  suggestScroll: {
    marginBottom: 32,
  },
  suggestCard: {
    width: 130,
    backgroundColor: groceryTheme.colors.surfaceContainerLow,
    borderRadius: groceryTheme.radius.md,
    marginRight: 12,
    padding: 12,
  },
  suggestImageWrap: {
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    borderRadius: groceryTheme.radius.md,
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    padding: 4,
  },
  suggestImage: {
    width: 100,
    height: 100,
  },
  suggestName: {
    ...groceryTheme.typography.labelMd,
    color: groceryTheme.colors.textPrimary,
    minHeight: 36,
  },
  suggestPrice: {
    ...groceryTheme.typography.title,
    color: '#AD2B00',
    marginTop: 4,
  },
  orderSummaryBlock: {
    backgroundColor: "#1A1C1C",
    borderRadius: groceryTheme.radius.xl,
    padding: 24,
    marginBottom: 20,
  },
  summaryTitle: {
    ...groceryTheme.typography.headlineSm,
    color: "#FFFFFF",
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    ...groceryTheme.typography.body,
    color: "#E2E2E2",
    fontSize: 14,
  },
  totalValue: {
    ...groceryTheme.typography.body,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  grandRow: {
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginBottom: 32,
  },
  grandLabel: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  grandValue: {
    ...groceryTheme.typography.displayLg,
    color: "#FFFFFF",
    fontSize: 32,
  },
  checkoutBtn: {
    backgroundColor: groceryTheme.colors.primary,
    borderRadius: groceryTheme.radius.md,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  checkoutBtnDisabled: {
    opacity: 0.7,
  },
  checkoutBtnText: {
    ...groceryTheme.typography.labelMd,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  secureText: {
    ...groceryTheme.typography.caption,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1.5,
  },
  guaranteeBlock: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    borderRadius: groceryTheme.radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  guaranteeTextWrap: {
    marginLeft: 12,
  },
  guaranteeTitle: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
    fontSize: 14,
  },
  guaranteeDesc: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textSecondary,
    fontSize: 12,
  },
});

export default CartScreen;
