import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold, useFonts } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import supabase, { isSupabaseConfigured } from './src/Config/supabase';
import { DeliveryOrder, DeliveryProfile } from './src/Types/delivery';
import { theme } from './src/Utils/theme';

type Tab = 'dashboard' | 'routes' | 'profile';

type AppSession = {
  user: {
    id: string;
    email?: string;
  };
};

const DEMO_SESSION: AppSession = {
  user: {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'delivery-demo@ayudha.local'
  }
};

const ORDER_SELECT = `
  *,
  order_items (
    id,
    order_id,
    product_id,
    quantity,
    price_at_purchase,
    products (
      id,
      name,
      unit,
      image_url
    )
  )
`;

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold
  });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return <DeliveryShell activeTab={activeTab} session={DEMO_SESSION} setActiveTab={setActiveTab} />;
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <Screen>
      <View style={styles.welcomeWrap}>
        <View style={styles.phonePreview}>
          <View style={styles.previewTop} />
          <View style={styles.previewBolt}>
            <MaterialCommunityIcons name="flash" size={42} color={theme.colors.dark} />
          </View>
          <Text style={styles.previewTitle}>Welcome!</Text>
          <Text style={styles.previewText}>Your delivery journey starts here.</Text>
          <View style={styles.previewButton} />
        </View>

        <Text style={styles.welcomeTitle}>Welcome!</Text>
        <Text style={styles.welcomeCopy}>Your delivery journey starts here smarter, faster, and easier than ever.</Text>
      </View>

      <View style={styles.bottomAction}>
        <Pressable style={styles.primaryAction} onPress={onStart}>
          <Text style={styles.primaryActionText}>GET STARTED</Text>
        </Pressable>
        <Text style={styles.helpLink}>Need help joining?</Text>
      </View>
    </Screen>
  );
}

function LoginScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (!isSupabaseConfigured) {
      setError('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before signing in.');
      return;
    }

    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setLoading(false);

    if (signInError) setError(signInError.message);
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginWrap}>
        <Pressable onPress={onBack} style={styles.backLink}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.loginTitle}>LOGIN</Text>
        <View style={styles.loginLead}>
          <View style={styles.redRule} />
          <Text style={styles.loginLeadText}>Log in to continue your journey.</Text>
        </View>

        <Text style={styles.fieldLabel}>USER CREDENTIALS</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email Address"
          placeholderTextColor="#6f7888"
          style={styles.input}
          value={email}
        />
        <View style={styles.passwordRow}>
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#6f7888"
            secureTextEntry={secure}
            style={[styles.input, styles.passwordInput]}
            value={password}
          />
          <Pressable onPress={() => setSecure((value) => !value)} style={styles.eyeButton}>
            <MaterialCommunityIcons name={secure ? 'eye-off-outline' : 'eye-outline'} size={30} color="#916f66" />
          </Pressable>
        </View>
        <Text style={styles.forgot}>FORGOT PASSWORD?</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </KeyboardAvoidingView>

      <View style={styles.bottomAction}>
        <Pressable disabled={loading} style={[styles.loginButton, loading && styles.disabled]} onPress={signIn}>
          <Text style={styles.loginButtonText}>{loading ? 'LOGGING IN...' : 'LOGIN'}</Text>
          <View style={styles.loginArrow}>
            <MaterialCommunityIcons name="arrow-right" size={36} color={theme.colors.primary} />
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}

function DeliveryShell({
  activeTab,
  session,
  setActiveTab
}: {
  activeTab: Tab;
  session: AppSession;
  setActiveTab: (tab: Tab) => void;
}) {
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [{ data: userRes }, { data: profileRow, error: profileError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('*').eq('user_uuid', session.user.id).maybeSingle()
      ]);

      const signedInUserId = userRes.user?.id;
      const orderQuery = supabase
        .from('orders')
        .select(ORDER_SELECT)
        .in('status', ['confirmed', 'out_for_delivery', 'delivered'])
        .order('delivery_date', { ascending: true });

      if (signedInUserId) {
        orderQuery.or(`assigned_delivery_user_id.is.null,assigned_delivery_user_id.eq.${signedInUserId}`);
      }

      const { data: orderRows, error: orderError } = await orderQuery;

      if (profileError && signedInUserId) throw profileError;
      if (orderError) throw orderError;

      setProfile(profileRow);
      setOrders((orderRows || []) as DeliveryOrder[]);
    } catch {
      setOrders([]);
      setError(
        isSupabaseConfigured
          ? 'Could not load delivery orders. Apply the delivery migration and check order RLS for preview access.'
          : 'Supabase is not configured yet, so this preview is showing the app shell only.'
      );
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('delivery-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const isSignedInDeliveryUser = profile?.user_type === 'delivery';

  const stats = useMemo(() => {
    const assignedToday = orders.filter((order) => order.assigned_delivery_user_id === session.user.id);
    return {
      routes: orders.filter((order) => order.status !== 'delivered').length,
      scheduled: orders.filter((order) => order.status === 'confirmed').length,
      live: orders.filter((order) => order.status === 'out_for_delivery').length,
      complete: orders.filter((order) => order.status === 'delivered').length,
      shipmentNew: orders.filter((order) => order.status === 'confirmed').length,
      pickedUp: assignedToday.filter((order) => order.status === 'out_for_delivery').length,
      outForDelivery: orders.filter((order) => order.status === 'out_for_delivery').length
    };
  }, [orders, session.user.id]);

  const updateOrder = async (order: DeliveryOrder, action: 'accept' | 'deliver') => {
    const { data: userRes } = await supabase.auth.getUser();
    const signedInUserId = userRes.user?.id;

    if (!signedInUserId) {
      Alert.alert('Preview mode', 'Sign in later to update live order statuses. Browsing is open for now.');
      return;
    }

    if (!isSignedInDeliveryUser) {
      Alert.alert('Delivery access required', 'Set this account profile user_type to delivery in Supabase.');
      return;
    }

    setMutatingId(order.id);
    const patch =
      action === 'accept'
        ? {
            assigned_delivery_user_id: signedInUserId,
            status: 'out_for_delivery',
            picked_up_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        : {
            assigned_delivery_user_id: signedInUserId,
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

    const { error: updateError } = await supabase.from('orders').update(patch).eq('id', order.id);
    setMutatingId(null);

    if (updateError) {
      Alert.alert('Could not update route', updateError.message);
      return;
    }

    loadData();
  };

  const visibleOrders = activeTab === 'routes' ? orders : orders.slice(0, 3);

  return (
    <Screen>
      {activeTab === 'dashboard' ? (
        <Dashboard
          isActive={isActive}
          isDeliveryUser={true}
          loading={loading}
          onRefresh={loadData}
          orders={visibleOrders}
          profile={profile}
          setIsActive={setIsActive}
          stats={stats}
          error={error}
          mutatingId={mutatingId}
          updateOrder={updateOrder}
        />
      ) : null}

      {activeTab === 'routes' ? (
        <RoutesList
          loading={loading}
          mutatingId={mutatingId}
          onRefresh={loadData}
          orders={visibleOrders}
          updateOrder={updateOrder}
          error={error}
        />
      ) : null}

      {activeTab === 'profile' ? <ProfileScreen profile={profile} session={session} /> : null}

      <BottomTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </Screen>
  );
}

function Dashboard(props: {
  error: string | null;
  isActive: boolean;
  isDeliveryUser: boolean;
  loading: boolean;
  mutatingId: string | null;
  onRefresh: () => void;
  orders: DeliveryOrder[];
  profile: DeliveryProfile | null;
  setIsActive: (value: boolean) => void;
  stats: Record<string, number>;
  updateOrder: (order: DeliveryOrder, action: 'accept' | 'deliver') => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.pageContent}
      refreshControl={<RefreshControl refreshing={props.loading} onRefresh={props.onRefresh} tintColor={theme.colors.primary} />}
    >
      <Text style={styles.hey}>
        Hey <Text style={styles.heyAccent}>Welcome!</Text>
      </Text>

      <View style={styles.statusCard}>
        <View>
          <Text style={styles.cardLabel}>STATUS</Text>
          <Text style={[styles.statusText, props.isActive && styles.statusTextActive]}>
            {props.isActive ? 'Currently Active' : 'Currently Inactive'}
          </Text>
        </View>
        <Switch
          onValueChange={props.setIsActive}
          thumbColor="#ffffff"
          trackColor={{ false: '#e7e7e7', true: '#f9b7a2' }}
          value={props.isActive}
        />
      </View>

      {!props.isDeliveryUser ? (
        <Notice text="This signed-in account is not marked as a delivery user yet." />
      ) : null}
      {props.error ? <Notice text={props.error} /> : null}

      <SectionHeading icon="map-marker-outline" title={`${props.stats.routes} ROUTES TODAY`} />
      <MetricCard
        metrics={[
          ['navigation-variant-outline', 'ROUTES', props.stats.routes],
          ['calendar-blank-outline', 'SCHEDULED', props.stats.scheduled],
          ['eye-outline', 'LIVE', props.stats.live],
          ['check-circle-outline', 'COMPLETE', props.stats.complete],
          ['clock-outline', 'RESCHEDULED', 0],
          ['progress-clock', 'DELAYED', 0],
          ['keyboard-return', 'RETURN', 0],
          ['lock-outline', 'CLOSED', 0]
        ]}
      />

      <SectionHeading icon="cube-outline" title={`${props.stats.routes} SHIPMENT TODAY`} />
      <MetricCard
        columns={3}
        metrics={[
          ['cog-outline', 'NEW', props.stats.shipmentNew],
          ['archive-outline', 'PICKED UP', props.stats.pickedUp],
          ['truck-outline', 'OUT FOR DELIVERY', props.stats.outForDelivery]
        ]}
      />

      <Text style={styles.subhead}>LATEST ROUTES</Text>
      {props.orders.map((order) => (
        <OrderCard key={order.id} mutating={props.mutatingId === order.id} order={order} updateOrder={props.updateOrder} />
      ))}
      {!props.loading && !props.orders.length ? <Text style={styles.emptyText}>No confirmed orders in the delivery queue.</Text> : null}
    </ScrollView>
  );
}

function RoutesList(props: {
  error: string | null;
  loading: boolean;
  mutatingId: string | null;
  onRefresh: () => void;
  orders: DeliveryOrder[];
  updateOrder: (order: DeliveryOrder, action: 'accept' | 'deliver') => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Routes</Text>
        <Text style={styles.pageSubtitle}>Confirmed customer orders from Supabase.</Text>
      </View>
      {props.error ? <Notice text={props.error} /> : null}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={props.orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={props.loading} onRefresh={props.onRefresh} tintColor={theme.colors.primary} />}
        renderItem={({ item }) => (
          <OrderCard mutating={props.mutatingId === item.id} order={item} updateOrder={props.updateOrder} />
        )}
        ListEmptyComponent={
          !props.loading ? <Text style={styles.emptyText}>No routes available. Pull down to refresh.</Text> : null
        }
      />
    </View>
  );
}

function ProfileScreen({ profile, session }: { profile: DeliveryProfile | null; session: AppSession }) {
  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.profileTop}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account-hard-hat-outline" size={42} color={theme.colors.primary} />
        </View>
        <Text style={styles.profileName}>{profile?.full_name || 'Delivery Partner'}</Text>
        <Text style={styles.profileEmail}>{profile?.user_email || session.user.email}</Text>
      </View>

      <View style={styles.profileCard}>
        <InfoRow label="Role" value={profile?.user_type === 'delivery' ? 'Delivery partner' : 'Preview partner'} />
        <InfoRow label="Phone" value={profile?.phone || 'Not added'} />
        <InfoRow label="Session" value="Preview mode" />
      </View>

      <Pressable style={styles.signOutButton}>
        <MaterialCommunityIcons name="account-eye-outline" size={22} color="#ffffff" />
        <Text style={styles.signOutText}>SIGN IN DISABLED</Text>
      </Pressable>
    </ScrollView>
  );
}

function OrderCard({
  mutating,
  order,
  updateOrder
}: {
  mutating: boolean;
  order: DeliveryOrder;
  updateOrder: (order: DeliveryOrder, action: 'accept' | 'deliver') => void;
}) {
  const items = order.order_items || [];
  const firstItem = items[0]?.products?.name || 'Customer order';
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const statusLabel = order.status === 'confirmed' ? 'NEW' : order.status === 'out_for_delivery' ? 'LIVE' : 'COMPLETE';
  const action = order.status === 'confirmed' ? 'accept' : 'deliver';
  const disabled = order.status === 'delivered' || mutating;

  return (
    <View style={styles.routeCard}>
      <View style={styles.routeTop}>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{statusLabel}</Text>
        </View>
        <Text style={styles.price}>Rs {Number(order.total || 0).toLocaleString('en-IN')}</Text>
      </View>

      <Text style={styles.routeTitle}>{firstItem}</Text>
      <Text style={styles.routeMeta}>
        #{order.id.slice(0, 8).toUpperCase()} - {totalItems || items.length} items - {formatTime(order.delivery_date)}
      </Text>

      <View style={styles.addressRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={22} color={theme.colors.primaryDark} />
        <Text style={styles.addressText}>{order.delivery_address}</Text>
      </View>

      {items.slice(0, 3).map((item) => (
        <Text key={item.id} style={styles.itemLine}>
          {item.quantity} x {item.products?.name || 'Product'}
        </Text>
      ))}

      <Pressable
        disabled={disabled}
        onPress={() => updateOrder(order, action)}
        style={[styles.routeAction, disabled && styles.disabled]}
      >
        <Text style={styles.routeActionText}>
          {mutating ? 'UPDATING...' : order.status === 'confirmed' ? 'START DELIVERY' : order.status === 'out_for_delivery' ? 'MARK DELIVERED' : 'DELIVERED'}
        </Text>
        <MaterialCommunityIcons name="arrow-right" size={22} color="#ffffff" />
      </Pressable>
    </View>
  );
}

function BottomTabs({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (tab: Tab) => void }) {
  const tabs: Array<[Tab, string, keyof typeof MaterialCommunityIcons.glyphMap]> = [
    ['dashboard', 'DASHBOARD', 'view-dashboard-outline'],
    ['routes', 'ROUTES', 'map-outline'],
    ['profile', 'PROFILE', 'account-outline']
  ];

  return (
    <View style={styles.bottomTabs}>
      {tabs.map(([key, label, icon]) => {
        const active = activeTab === key;
        return (
          <Pressable key={key} onPress={() => setActiveTab(key)} style={styles.tabButton}>
            <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
              <MaterialCommunityIcons name={icon} size={30} color={active ? '#ffffff' : theme.colors.muted} />
            </View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MetricCard({
  columns = 4,
  metrics
}: {
  columns?: 3 | 4;
  metrics: Array<[keyof typeof MaterialCommunityIcons.glyphMap, string, number]>;
}) {
  return (
    <View style={styles.metricCard}>
      {metrics.map(([icon, label, value]) => (
        <View key={label} style={[styles.metricCell, { width: `${100 / columns}%` }]}>
          <Text style={[styles.metricValue, value > 0 && styles.metricValueHot]}>{value}</Text>
          <MaterialCommunityIcons name={icon} size={24} color={value > 0 ? theme.colors.primaryDark : theme.colors.muted} />
          <Text style={[styles.metricLabel, value > 0 && styles.metricLabelHot]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionHeading({ icon, title }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <MaterialCommunityIcons name={icon} size={34} color={theme.colors.primaryDark} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.primaryDark} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      {children}
    </SafeAreaView>
  );
}

function formatTime(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background
  },
  flex: {
    flex: 1
  },
  welcomeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32
  },
  phonePreview: {
    width: 190,
    height: 190,
    borderWidth: 2,
    borderColor: '#e6c0b7',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 42,
    backgroundColor: '#ffffff'
  },
  previewTop: {
    position: 'absolute',
    top: 30,
    width: 70,
    height: 8,
    backgroundColor: '#1a1c1c'
  },
  previewBolt: {
    width: 74,
    height: 74,
    backgroundColor: '#ffd42a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  previewTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 10,
    color: theme.colors.text
  },
  previewText: {
    width: 92,
    marginTop: 6,
    textAlign: 'center',
    fontFamily: theme.fonts.body,
    fontSize: 6,
    color: theme.colors.muted
  },
  previewButton: {
    width: 106,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#ffd42a',
    marginTop: 20
  },
  welcomeTitle: {
    fontFamily: theme.fonts.title,
    fontSize: 28,
    color: theme.colors.text,
    marginBottom: 20
  },
  welcomeCopy: {
    fontFamily: theme.fonts.body,
    fontSize: 23,
    lineHeight: 34,
    textAlign: 'center',
    color: theme.colors.muted
  },
  bottomAction: {
    paddingHorizontal: 24,
    paddingBottom: 30
  },
  primaryAction: {
    height: 78,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }
  },
  primaryActionText: {
    fontFamily: theme.fonts.body,
    color: '#ffffff',
    fontSize: 25,
    letterSpacing: 1
  },
  helpLink: {
    marginTop: 26,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: theme.fonts.body,
    color: theme.colors.muted,
    fontSize: 22
  },
  loginWrap: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 44
  },
  backLink: {
    width: 42,
    height: 42,
    justifyContent: 'center'
  },
  loginTitle: {
    marginTop: 92,
    fontFamily: theme.fonts.headline,
    fontSize: 48,
    fontStyle: 'italic',
    color: theme.colors.text
  },
  loginLead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 42
  },
  redRule: {
    width: 6,
    height: 44,
    backgroundColor: theme.colors.primary,
    marginRight: 22
  },
  loginLeadText: {
    fontFamily: theme.fonts.body,
    fontSize: 24,
    color: theme.colors.muted
  },
  fieldLabel: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.muted,
    letterSpacing: 2,
    fontSize: 16,
    marginBottom: 10
  },
  input: {
    height: 76,
    borderWidth: 1,
    borderColor: '#51606f',
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    fontFamily: theme.fonts.body,
    fontSize: 24,
    color: theme.colors.text,
    marginBottom: 24
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1,
    paddingRight: 64
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  forgot: {
    alignSelf: 'flex-end',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    color: theme.colors.primary,
    letterSpacing: 1
  },
  errorText: {
    marginTop: 24,
    fontFamily: theme.fonts.body,
    color: theme.colors.danger,
    lineHeight: 22
  },
  loginButton: {
    height: 86,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 5,
    borderBottomColor: '#6f1b00',
    paddingLeft: 62,
    paddingRight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  loginButtonText: {
    fontFamily: theme.fonts.body,
    fontStyle: 'italic',
    color: '#ffffff',
    fontSize: 25
  },
  loginArrow: {
    width: 60,
    height: 60,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pageContent: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 140
  },
  hey: {
    fontFamily: theme.fonts.headline,
    fontSize: 44,
    color: theme.colors.text,
    marginBottom: 36
  },
  heyAccent: {
    color: theme.colors.primaryDark
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    padding: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 34,
    shadowColor: theme.colors.dark,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }
  },
  cardLabel: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.muted,
    letterSpacing: 2,
    fontSize: 14,
    marginBottom: 14
  },
  statusText: {
    fontFamily: theme.fonts.headline,
    color: '#bc0f17',
    fontSize: 28
  },
  statusTextActive: {
    color: theme.colors.success
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 22
  },
  sectionTitle: {
    marginLeft: 14,
    fontFamily: theme.fonts.headline,
    fontSize: 28,
    color: theme.colors.text
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    paddingVertical: 26,
    paddingHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 28
  },
  metricCell: {
    height: 116,
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricValue: {
    fontFamily: theme.fonts.headline,
    fontSize: 30,
    color: theme.colors.text,
    marginBottom: 10
  },
  metricValueHot: {
    color: theme.colors.primaryDark
  },
  metricLabel: {
    marginTop: 8,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.muted,
    fontSize: 12
  },
  metricLabelHot: {
    color: theme.colors.primaryDark
  },
  subhead: {
    marginTop: 6,
    marginBottom: 12,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.muted,
    letterSpacing: 2
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#fff1ed',
    borderWidth: 1,
    borderColor: '#ffd2c6',
    marginBottom: 16
  },
  noticeText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    color: theme.colors.muted,
    lineHeight: 20
  },
  routeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    marginBottom: 16
  },
  routeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statusPill: {
    backgroundColor: '#fdece6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  statusPillText: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.primaryDark,
    fontSize: 12,
    letterSpacing: 1
  },
  price: {
    fontFamily: theme.fonts.headline,
    color: theme.colors.text,
    fontSize: 22
  },
  routeTitle: {
    fontFamily: theme.fonts.title,
    color: theme.colors.text,
    fontSize: 22,
    marginBottom: 6
  },
  routeMeta: {
    fontFamily: theme.fonts.body,
    color: theme.colors.faint,
    marginBottom: 16
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12
  },
  addressText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    color: theme.colors.muted,
    lineHeight: 22
  },
  itemLine: {
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
    marginBottom: 4
  },
  routeAction: {
    marginTop: 18,
    height: 52,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  routeActionText: {
    fontFamily: theme.fonts.bodyBold,
    color: '#ffffff',
    letterSpacing: 1
  },
  disabled: {
    opacity: 0.58
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: theme.fonts.body,
    color: theme.colors.muted,
    marginTop: 18
  },
  pageHeader: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 18
  },
  pageTitle: {
    fontFamily: theme.fonts.headline,
    color: theme.colors.text,
    fontSize: 42
  },
  pageSubtitle: {
    fontFamily: theme.fonts.body,
    color: theme.colors.muted,
    marginTop: 6
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 140
  },
  bottomTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 118,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e7e7e7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 14
  },
  tabButton: {
    width: '33.33%',
    alignItems: 'center'
  },
  tabIconWrap: {
    width: 64,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  tabIconWrapActive: {
    backgroundColor: theme.colors.primaryDark
  },
  tabLabel: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.colors.muted,
    letterSpacing: 2
  },
  tabLabelActive: {
    color: theme.colors.primaryDark
  },
  profileTop: {
    alignItems: 'center',
    marginBottom: 28
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#fff1ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18
  },
  profileName: {
    fontFamily: theme.fonts.headline,
    fontSize: 30,
    color: theme.colors.text
  },
  profileEmail: {
    fontFamily: theme.fonts.body,
    color: theme.colors.muted,
    marginTop: 4
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    padding: 18
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1e4e0'
  },
  infoLabel: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.muted
  },
  infoValue: {
    fontFamily: theme.fonts.body,
    color: theme.colors.text
  },
  signOutButton: {
    marginTop: 24,
    height: 56,
    borderRadius: 8,
    backgroundColor: theme.colors.dark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  signOutText: {
    fontFamily: theme.fonts.bodyBold,
    color: '#ffffff',
    letterSpacing: 1
  }
});
