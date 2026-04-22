import ProductCard from '@components/ProductCard/ProductCard';
import DataStateNotice from '@components/Feedback/DataStateNotice';
import BottomNavBar from '@components/Layouts/BottomNavBar';
import ScreenContainer from '@components/Layouts/ScreenContainer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '@config/supabase';
import { useCart } from '@context/CartContext';
import { Category, HomeScreenProps, Product } from '@src/Types/types';
import { groceryTheme } from '@src/Utils/groceryTheme';
import { getOptimizedImageUrl } from '@src/Utils/imageOptimization';
import { mockCategories, mockProducts } from '@src/Utils/mockData';
import * as Location from 'expo-location';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
const DELIVERY_LOCATION_KEY = 'tooldrop_delivery_location_v1';

type StoredLocation = {
    pincode: string;
    locality: string;
};

const HOME_PAGE_HIDDEN_PRODUCT_TERMS = ['hammer claw type', 'river sand', 'red bricks'];

const pickDiverseProducts = (items: Product[], count: number) => {
    const chosen: Product[] = [];
    const usedCategories = new Set<string>();

    for (const product of items) {
        if (chosen.length >= count) {
            break;
        }

        if (!usedCategories.has(product.category_id)) {
            chosen.push(product);
            usedCategories.add(product.category_id);
        }
    }

    for (const product of items) {
        if (chosen.length >= count) {
            break;
        }

        if (!chosen.some((entry) => entry.id === product.id)) {
            chosen.push(product);
        }
    }

    return chosen;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isUsingFallback, setIsUsingFallback] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const { addToCart, cartItems } = useCart();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [pincode, setPincode] = useState('560035');
    const [manualPincode, setManualPincode] = useState('560035');
    const [locality, setLocality] = useState('Set your location');
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [activeHeroIndex, setActiveHeroIndex] = useState(0);
    const { width: windowWidth } = useWindowDimensions();

    const loadData = async () => {
        setLoadingData(true);
        setLoadError(null);
        try {
            const [categoryRes, productRes] = await Promise.all([
                supabase.from('categories').select('*').order('created_at', { ascending: true }),
                supabase.from('products').select('*').order('created_at', { ascending: false }),
            ]);

            if (categoryRes.error || productRes.error) {
                throw categoryRes.error || productRes.error;
            }

            const categoryRows = categoryRes.data?.length ? categoryRes.data : mockCategories;
            const productRows = productRes.data?.length ? productRes.data : mockProducts;

            setCategories(categoryRows);
            setProducts(productRows);
            setIsUsingFallback(!categoryRes.data?.length || !productRes.data?.length);
        } catch (error) {
            setCategories(mockCategories);
            setProducts(mockProducts);
            setIsUsingFallback(true);
            setLoadError('Live catalog is unavailable. Showing backup materials.');
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const loadSavedLocation = async () => {
            try {
                const raw = await AsyncStorage.getItem(DELIVERY_LOCATION_KEY);
                if (!raw) {
                    return;
                }

                const saved = JSON.parse(raw) as StoredLocation;
                if (saved?.pincode) {
                    setPincode(saved.pincode);
                    setManualPincode(saved.pincode);
                }
                if (saved?.locality) {
                    setLocality(saved.locality);
                }
            } catch (error) {
                // Keep default header location when storage cannot be read.
            }
        };

        loadSavedLocation();
    }, []);

    const persistLocation = async (nextPincode: string, nextLocality: string) => {
        const payload: StoredLocation = { pincode: nextPincode, locality: nextLocality };
        await AsyncStorage.setItem(DELIVERY_LOCATION_KEY, JSON.stringify(payload));
    };

    const detectAndSetCurrentLocation = async () => {
        try {
            setLocating(true);
            setLocationError(null);
            const permission = await Location.requestForegroundPermissionsAsync();

            if (!permission.granted) {
                setLocationError('Location access denied. Enter your pincode to continue.');
                return;
            }

            const currentPosition = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const reverseRows = await Location.reverseGeocodeAsync({
                latitude: currentPosition.coords.latitude,
                longitude: currentPosition.coords.longitude,
            });

            const geoRow = reverseRows[0];
            const nextPincode = geoRow?.postalCode?.replace(/\D/g, '') || pincode;
            const nextLocality = geoRow?.city || geoRow?.subregion || geoRow?.region || 'Current location';

            if (nextPincode) {
                setPincode(nextPincode);
                setManualPincode(nextPincode);
            }

            setLocality(nextLocality);
            await persistLocation(nextPincode || pincode, nextLocality);
            setSheetVisible(false);
        } catch (error) {
            setLocationError('Unable to detect location right now. Try pincode entry.');
        } finally {
            setLocating(false);
        }
    };

    const applyManualPincode = async () => {
        const normalizedPincode = manualPincode.replace(/\D/g, '').slice(0, 6);

        if (normalizedPincode.length < 5) {
            setLocationError('Please enter a valid pincode.');
            return;
        }

        try {
            setLocating(true);
            setLocationError(null);
            let nextLocality = 'Serviceable area';

            const geocoded = await Location.geocodeAsync(`${normalizedPincode}, India`);
            if (geocoded.length > 0) {
                const reverseRows = await Location.reverseGeocodeAsync({
                    latitude: geocoded[0].latitude,
                    longitude: geocoded[0].longitude,
                });

                nextLocality = reverseRows[0]?.city || reverseRows[0]?.subregion || nextLocality;
            }

            setPincode(normalizedPincode);
            setLocality(nextLocality);
            await persistLocation(normalizedPincode, nextLocality);
            setSheetVisible(false);
        } catch (error) {
            setLocationError('Could not verify pincode. Please try again.');
        } finally {
            setLocating(false);
        }
    };

    const homeProducts = useMemo(
        () =>
            products.filter((product) => {
                const productName = product.name.toLowerCase();
                return !HOME_PAGE_HIDDEN_PRODUCT_TERMS.some((term) => productName.includes(term));
            }),
        [products]
    );

    const featuredProducts = useMemo(() => pickDiverseProducts(homeProducts, 4), [homeProducts]);
    const heroProducts = useMemo(() => featuredProducts.slice(0, 3), [featuredProducts]);
    const remainingProducts = useMemo(
        () => homeProducts.filter((product) => !featuredProducts.some((featured) => featured.id === product.id)),
        [homeProducts, featuredProducts]
    );
    const priceDropProducts = useMemo(() => pickDiverseProducts(remainingProducts, 6), [remainingProducts]);

    const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!heroProducts.length) {
            return;
        }

        const nextIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
        setActiveHeroIndex(Math.min(Math.max(nextIndex, 0), heroProducts.length - 1));
    };

    const handleAddToCart = async (productId: string) => {
        try {
            await addToCart(productId, 1);
            Alert.alert('Added', 'Item added to cart.');
        } catch (error) {
            Alert.alert('Error', 'Could not add item to cart.');
        }
    };

    return (
        <ScreenContainer>
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoRow}>
                        <MaterialIcons name="build" size={20} color={groceryTheme.colors.brand} style={{ marginRight: 8 }} />
                        <Text style={styles.logoText}>AYUDHA</Text>
                    </View>
                    <TouchableOpacity style={styles.locationTrigger} onPress={() => setSheetVisible(true)}>
                        <Ionicons name="location-outline" size={14} color={groceryTheme.colors.textSecondary} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {locality} {pincode ? `- ${pincode}` : ''}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color={groceryTheme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={() => navigation.navigate('ProductCatalog', { openMode: 'category' })}>
                        <Ionicons name="search" size={24} color={groceryTheme.colors.textPrimary} style={styles.iconMargin} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
                        <View>
                            <Ionicons name="cart-outline" size={24} color={groceryTheme.colors.textPrimary} />
                            {cartItems.length > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{cartItems.length}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {loadError ? (
                    <DataStateNotice message={loadError} type="warning" actionLabel="Retry" onAction={loadData} />
                ) : null}
                {!loadError && isUsingFallback ? (
                    <DataStateNotice message="Using preview inventory while sync completes." type="info" />
                ) : null}

                <View style={styles.heroBanner}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleHeroScroll}
                    >
                        {(heroProducts.length ? heroProducts : mockProducts.slice(0, 3)).map((product) => (
                            <View key={product.id} style={[styles.heroSlide, { width: windowWidth }]}>
                                <ExpoImage
                                    source={{
                                        uri: product.image_url
                                            ? getOptimizedImageUrl(product.image_url, 'hero')
                                            : 'https://picsum.photos/800/400?hardware'
                                    }}
                                    style={styles.heroImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                                <View style={styles.heroOverlay}>
                                    <View style={styles.heroBadge}>
                                        <Text style={styles.heroBadgeText}>NEW ARRIVALS</Text>
                                    </View>
                                    <Text style={styles.heroTitle} numberOfLines={2}>
                                        {product.name.toUpperCase()}
                                    </Text>
                                    <Text style={styles.heroSubTitle} numberOfLines={2}>
                                        {product.description}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.heroCta}
                                        onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                                    >
                                        <Text style={styles.heroCtaText}>SHOP NOW</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={styles.heroAccentLines}>
                        {(heroProducts.length ? heroProducts : mockProducts.slice(0, 3)).map((product, index) => (
                            <View
                                key={product.id}
                                style={[
                                    styles.heroLine,
                                    index === activeHeroIndex ? styles.heroLineActive : undefined
                                ]}
                            />
                        ))}
                    </View>
                </View>
                
                <View style={styles.perksContainer}>
                    <View style={styles.perk}>
                        <MaterialIcons name="bolt" size={16} color={groceryTheme.colors.brand} />
                        <Text style={styles.perkText}>FAST DELIVERY</Text>
                    </View>
                    <View style={styles.perk}>
                        <MaterialIcons name="local-shipping" size={16} color={groceryTheme.colors.brand} />
                        <Text style={styles.perkText}>NO MINIMUM ORDER</Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionCaption}>CURATED</Text>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>RECOMMENDED FOR YOU</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('ProductCatalog', { openMode: 'category' })}>
                            <Text style={styles.seeAllText}>VIEW ALL</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.curatedList}>
                    {featuredProducts.map((product) => (
                        <View key={product.id} style={styles.horizontalCardWrap}>
                            <ProductCard product={product} onAddToCart={handleAddToCart} />
                        </View>
                    ))}
                </ScrollView>

                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialIcons name="trending-down" size={24} color={groceryTheme.colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>PRICE DROPS THIS WEEK</Text>
                    </View>
                </View>

                <View style={styles.priceDropGrid}>
                    {priceDropProducts.length > 0 && (
                        <View style={styles.featuredPriceDropCard}>
                            <ExpoImage
                                source={{ uri: getOptimizedImageUrl(priceDropProducts[0]?.image_url, 'card') || 'https://via.placeholder.com/400' }}
                                style={styles.featuredPriceDropImage}
                                contentFit="cover"
                            />
                            <View style={styles.featuredPriceDropOverlay}>
                                <View style={styles.saleBadge}>
                                    <Text style={styles.saleBadgeText}>SAVE 40%</Text>
                                </View>
                                <Text style={styles.featuredPriceDropTitle} numberOfLines={3}>{priceDropProducts[0].name.toUpperCase()}</Text>
                                <View style={styles.featuredPriceRow}>
                                    <Text style={styles.featuredPriceDropPrice}>₹{(priceDropProducts[0].price * 0.6).toFixed(0)}</Text>
                                    <Text style={styles.featuredOriginalPrice}>₹{priceDropProducts[0].price.toFixed(0)}</Text>
                                </View>
                                <TouchableOpacity style={styles.buyNowBtn} onPress={() => handleAddToCart(priceDropProducts[0].id)}>
                                    <Text style={styles.buyNowText}>BUY NOW</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.productGrid}>
                        {priceDropProducts.slice(1).map((product) => (
                            <View key={product.id} style={styles.productCardWrap}>
                                <ProductCard product={product} onAddToCart={handleAddToCart} />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.bulkBanner}>
                    <Text style={styles.bulkBannerTitle}>BULK{'\n'}ORDERS?{'\n'}GET CUSTOM{'\n'}QUOTES.</Text>
                    <Text style={styles.bulkBannerSub}>Partner with AYUDHA for your construction projects and save big on wholesale rates.</Text>
                    <TouchableOpacity style={styles.bulkContactBtn}>
                        <Text style={styles.bulkContactBtnText}>CONTACT SALES</Text>
                    </TouchableOpacity>
                    <MaterialIcons name="business" size={120} color="#ffffff" style={styles.bulkBannerIcon} />
                </View>

            </ScrollView>

            <Modal
                visible={sheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSheetVisible(false)}
            >
                <View style={styles.modalRoot}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setSheetVisible(false)} />
                    <View style={styles.sheet}>
                        <View style={styles.sheetTopRow}>
                            <Text style={styles.sheetTitle}>Delivery Location</Text>
                            <TouchableOpacity onPress={() => setSheetVisible(false)}>
                                <Ionicons name="close" size={28} color={groceryTheme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sheetSubtitle}>
                            Enter your pincode to fetch your location and check delivery availability.
                        </Text>

                        <View style={styles.entryRow}>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    value={manualPincode}
                                    onChangeText={(value) => setManualPincode(value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="Eg. 500087"
                                    keyboardType="number-pad"
                                    style={styles.pincodeInput}
                                    placeholderTextColor={groceryTheme.colors.textMuted}
                                />
                                <TouchableOpacity style={styles.applyBtn} onPress={applyManualPincode} disabled={locating}>
                                    <Text style={styles.applyText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.locateBtn} onPress={detectAndSetCurrentLocation} disabled={locating}>
                            {locating ? (
                                <ActivityIndicator size="small" color={groceryTheme.colors.surfaceContainerLowest} />
                            ) : (
                                <>
                                    <Ionicons name="locate-outline" size={18} color={groceryTheme.colors.surfaceContainerLowest} />
                                    <Text style={styles.locateText}>Use current location</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
                    </View>
                </View>
            </Modal>

            <BottomNavBar
                activeKey="home"
                items={[
                    {
                        key: 'home',
                        label: 'HOME',
                        icon: 'home-outline',
                        activeIcon: 'home',
                        onPress: () => navigation.navigate('HomeScreen'),
                    },
                    {
                        key: 'category',
                        label: 'CATEGORIES',
                        icon: 'grid-outline',
                        activeIcon: 'grid',
                        onPress: () => navigation.navigate('ProductCatalog', { openMode: 'category' }),
                    },
                    {
                        key: 'orders',
                        label: 'ORDERS',
                        icon: 'cube-outline',
                        activeIcon: 'cube',
                        onPress: () => navigation.navigate('Orders'),
                    },
                    {
                        key: 'profile',
                        label: 'ACCOUNT',
                        icon: 'person-outline',
                        activeIcon: 'person',
                        onPress: () => navigation.navigate('Profile'),
                    },
                ]}
            />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: groceryTheme.spacing.lg,
        paddingVertical: groceryTheme.spacing.md,
        backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    },
    logoContainer: {
        flex: 1,
        paddingRight: groceryTheme.spacing.md,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoText: {
        ...groceryTheme.typography.title,
        color: groceryTheme.colors.brand,
    },
    locationTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    locationText: {
        ...groceryTheme.typography.caption,
        color: groceryTheme.colors.textSecondary,
        flexShrink: 1,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 4,
    },
    iconMargin: {
        marginRight: groceryTheme.spacing.lg,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: groceryTheme.colors.brand,
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        ...groceryTheme.typography.caption,
        fontSize: 10,
        color: groceryTheme.colors.surfaceContainerLowest,
        fontWeight: 'bold',
    },
    content: {
        paddingBottom: 88,
    },
    heroBanner: {
        position: 'relative',
        height: 260,
    },
    heroSlide: {
        height: 260,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: groceryTheme.spacing.xl,
        justifyContent: 'center',
    },
    heroBadge: {
        backgroundColor: groceryTheme.colors.brand,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    heroBadgeText: {
        ...groceryTheme.typography.labelMd,
        color: groceryTheme.colors.surfaceContainerLowest,
        fontSize: 10,
    },
    heroTitle: {
        ...groceryTheme.typography.displayLg,
        color: groceryTheme.colors.surfaceContainerLowest,
        marginBottom: 8,
    },
    heroSubTitle: {
        ...groceryTheme.typography.body,
        color: groceryTheme.colors.surfaceContainerLowest,
        marginBottom: 16,
    },
    heroCta: {
        alignSelf: 'flex-start',
        backgroundColor: groceryTheme.colors.surfaceContainerLowest,
        paddingHorizontal: groceryTheme.spacing.lg,
        paddingVertical: groceryTheme.spacing.sm,
        borderRadius: groceryTheme.radius.full,
    },
    heroCtaText: {
        ...groceryTheme.typography.labelMd,
        color: groceryTheme.colors.primary,
    },
    heroAccentLines: {
        position: 'absolute',
        bottom: groceryTheme.spacing.lg,
        left: groceryTheme.spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    heroLine: {
        height: 2,
        width: 12,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    heroLineActive: {
        width: 24,
        backgroundColor: groceryTheme.colors.brand,
    },
    perksContainer: {
        flexDirection: 'row',
        paddingHorizontal: groceryTheme.spacing.lg,
        paddingTop: groceryTheme.spacing.xl,
        paddingBottom: groceryTheme.spacing.lg,
        gap: groceryTheme.spacing.lg,
    },
    perk: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    perkText: {
        ...groceryTheme.typography.caption,
        color: groceryTheme.colors.textSecondary,
        fontWeight: 'bold',
    },
    sectionHeader: {
        paddingHorizontal: groceryTheme.spacing.lg,
        marginBottom: groceryTheme.spacing.md,
    },
    sectionCaption: {
        ...groceryTheme.typography.caption,
        color: groceryTheme.colors.brand,
        letterSpacing: 1,
        marginBottom: 4,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 0,
    },
    sectionTitle: {
        ...groceryTheme.typography.headlineSm,
        color: groceryTheme.colors.textPrimary,
    },
    seeAllText: {
        ...groceryTheme.typography.labelMd,
        color: groceryTheme.colors.brand,
        textDecorationLine: 'underline',
    },
    curatedList: {
        paddingHorizontal: groceryTheme.spacing.lg,
        paddingBottom: groceryTheme.spacing.xl,
        gap: groceryTheme.spacing.lg,
    },
    horizontalCardWrap: {
        width: 180, // Specific width for horizontal scroll
    },
    priceDropGrid: {
        paddingHorizontal: groceryTheme.spacing.lg,
    },
    featuredPriceDropCard: {
        width: '100%',
        backgroundColor: groceryTheme.colors.surfaceContainerLowest,
        marginBottom: groceryTheme.spacing.lg,
        position: 'relative',
        height: 280,
    },
    featuredPriceDropImage: {
        width: '100%',
        height: '100%',
    },
    featuredPriceDropOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.4)', // dark overlay for text contrast
        padding: groceryTheme.spacing.lg,
        justifyContent: 'flex-end',
    },
    saleBadge: {
        backgroundColor: groceryTheme.colors.brand,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        position: 'absolute',
        top: groceryTheme.spacing.lg,
        left: groceryTheme.spacing.lg,
    },
    saleBadgeText: {
        ...groceryTheme.typography.caption,
        color: groceryTheme.colors.surfaceContainerLowest,
        fontWeight: 'bold',
    },
    featuredPriceDropTitle: {
        ...groceryTheme.typography.headlineSm,
        color: groceryTheme.colors.surfaceContainerLowest,
        marginBottom: 8,
    },
    featuredPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    featuredPriceDropPrice: {
        ...groceryTheme.typography.hero,
        color: groceryTheme.colors.brand,
    },
    featuredOriginalPrice: {
        ...groceryTheme.typography.title,
        color: '#aaaaaa',
        textDecorationLine: 'line-through',
    },
    buyNowBtn: {
        backgroundColor: '#111111',
        paddingVertical: groceryTheme.spacing.md,
        alignItems: 'center',
        borderRadius: groceryTheme.radius.full,
    },
    buyNowText: {
        ...groceryTheme.typography.labelMd,
        color: groceryTheme.colors.surfaceContainerLowest,
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    productCardWrap: {
        width: '48.2%',
    },
    bulkBanner: {
        margin: groceryTheme.spacing.lg,
        backgroundColor: groceryTheme.colors.primaryContainer,
        padding: groceryTheme.spacing.xl,
        position: 'relative',
        overflow: 'hidden',
    },
    bulkBannerTitle: {
        ...groceryTheme.typography.displayLg,
        color: groceryTheme.colors.surfaceContainerLowest,
        marginBottom: 12,
        position: 'relative',
        zIndex: 2,
    },
    bulkBannerSub: {
        ...groceryTheme.typography.body,
        color: groceryTheme.colors.surfaceContainerLowest,
        marginBottom: 24,
        position: 'relative',
        zIndex: 2,
        maxWidth: '80%',
    },
    bulkContactBtn: {
        backgroundColor: groceryTheme.colors.surfaceContainerLowest,
        paddingVertical: groceryTheme.spacing.md,
        paddingHorizontal: groceryTheme.spacing.xl,
        borderRadius: groceryTheme.radius.full,
        alignSelf: 'flex-start',
        position: 'relative',
        zIndex: 2,
    },
    bulkContactBtnText: {
        ...groceryTheme.typography.labelMd,
        color: groceryTheme.colors.primary,
    },
    bulkBannerIcon: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        opacity: 0.1,
        zIndex: 1,
    },
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.36)',
    },
    sheet: {
        backgroundColor: groceryTheme.colors.surfaceContainerLowest,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: groceryTheme.spacing.lg,
        paddingTop: groceryTheme.spacing.lg,
        paddingBottom: groceryTheme.spacing.xl,
    },
    sheetTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sheetTitle: {
        ...groceryTheme.typography.headlineSm,
        color: groceryTheme.colors.textPrimary,
    },
    sheetSubtitle: {
        ...groceryTheme.typography.body,
        color: groceryTheme.colors.textSecondary,
        marginTop: 8,
    },
    entryRow: {
        marginTop: groceryTheme.spacing.lg,
    },
    inputWrap: {
        borderWidth: 1,
        borderColor: groceryTheme.colors.border,
        borderRadius: groceryTheme.radius.md,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    pincodeInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: groceryTheme.spacing.md,
        color: groceryTheme.colors.textPrimary,
        fontSize: 15,
    },
    applyBtn: {
        height: '100%',
        paddingHorizontal: groceryTheme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderLeftColor: groceryTheme.colors.border,
    },
    applyText: {
        ...groceryTheme.typography.labelMd,
        color: groceryTheme.colors.brand,
    },
    locateBtn: {
        marginTop: groceryTheme.spacing.md,
        height: 52,
        borderRadius: groceryTheme.radius.full,
        backgroundColor: groceryTheme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    locateText: {
        ...groceryTheme.typography.labelMd,
        color: groceryTheme.colors.surfaceContainerLowest,
    },
    errorText: {
        ...groceryTheme.typography.caption,
        color: groceryTheme.colors.danger,
        marginTop: groceryTheme.spacing.sm,
    },
});

export default HomeScreen;
