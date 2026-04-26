import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Product, RootStackParamList } from '@src/Types/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { groceryTheme } from '@src/Utils/groceryTheme';
import { getOptimizedImageUrl } from '@src/Utils/imageOptimization';
import { MaterialIcons } from '@expo/vector-icons';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePress = () => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product.id);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.imageWrap}>
        {(() => {
          const uri = getOptimizedImageUrl(product.image_url, 'card') || 'https://via.placeholder.com/150';
          try {
            // Log once per product to avoid spamming Metro
            // eslint-disable-next-line no-undef
            if (typeof global !== 'undefined') {
              // eslint-disable-next-line no-prototype-builtins
              if (!global.__loggedProductImages) global.__loggedProductImages = {};
              if (!global.__loggedProductImages[product.id]) {
                // eslint-disable-next-line no-console
                console.log('[ProductCard] product image uri', { id: product.id, name: product.name, uri });
                global.__loggedProductImages[product.id] = true;
              }
            }
          } catch (e) {}

          return (
            <ExpoImage
              source={{ uri }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
              onLoad={() => {
                // eslint-disable-next-line no-console
                console.log('[ProductCard] image loaded', { id: product.id, uri });
              }}
              onError={(e) => {
                // eslint-disable-next-line no-console
                console.error('[ProductCard] image failed', { id: product.id, uri, error: e });
              }}
            />
          );
        })()}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.unit}>{product.unit || '1 Unit'}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>₹{product.price.toFixed(0)}</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
            <MaterialIcons name="add-shopping-cart" size={16} color={groceryTheme.colors.surfaceContainerLowest} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: groceryTheme.colors.surfaceContainerLowest,
    // Removed border and default drop shadows, rely on tonal contrast and ambient shadow
    // the parent wraps this with padding/margin.
    marginBottom: 16,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1, // Make it square for hardware items
    backgroundColor: groceryTheme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingVertical: 12,
    paddingHorizontal: 4, // tight alignment
    minHeight: 108,
  },
  name: {
    ...groceryTheme.typography.bodyStrong,
    color: groceryTheme.colors.textPrimary,
    marginBottom: 4,
    minHeight: 40,
  },
  unit: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.textSecondary,
    marginBottom: 8,
    minHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  price: {
    ...groceryTheme.typography.title,
    color: groceryTheme.colors.textPrimary,
  },
  addButton: {
    backgroundColor: groceryTheme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: groceryTheme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProductCard;
