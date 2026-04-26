import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  SplashScreen: undefined;
  SignInScreen: undefined;
  SignUpScreen: undefined;
  HomeScreen: undefined;
  VerificationScreen: {
    email?: string;
    password?: string;
    verificationCode?: number;
    userName?: string;
    phone?: string;
    flow?: string;
  };
  ButtonExamples: undefined;
  ChangePasswordScreen: undefined;
  ProductCatalog: {
    categoryId?: string;
    categoryName?: string;
    openMode?: "category" | "products";
  };
  CategoryItems: { categoryId: string; categoryIds?: string[]; categoryName?: string };
  ProductDetail: { productId: string };
  Cart: { selectedAddressId?: string } | undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  Profile: undefined;
  Wishlist: undefined;
  AddressManagement: { selectedAddressId?: string } | undefined;
};

export interface FormField {
  name: string;
  label: string;
  placeholder: string;
  rules: {
    required: string | boolean;
    pattern?: {
      value: RegExp;
      message: string;
    };
    validate?: (value: string, formValues?: Record<string, any>) => boolean | string;
    minLength?: {
      value: number;
      message: string;
    };
    maxLength?: {
      value: number;
      message: string;
    };
  };
  keyboardType?: 'email-address' | 'default' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'off' | 'email' | 'password' | 'name' | 'tel';
}
  
export interface ForgotPasswordForm {
  currentPassword: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
  secureTextEntry?: boolean;
}

  export interface CustomFormProps {
    fields: FormField[];
    onSubmit: (data: any) => void;
    onChange?: (data: any) => void;
    submitButtonText?: string;
  }
  
  export interface FormData {
    userName?: string;
    email: string;
    password: string;
    phone?: string;
}

export type SplashScreenProps = {
  navigation: {
    replace: (screen: string) => void;
  };
};


export type SignInScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignInScreen'>;
};
export type SignUpScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignUpScreen'>;
};

export type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'HomeScreen'>;
};

export type ProductCatalogProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProductCatalog'>;
  route: {
    params?: {
      categoryId?: string;
      categoryName?: string;
      openMode?: "category" | "products";
    };
  };
};

export type ProductDetailProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;
  route: {
    params: {
      productId: string;
    };
  };
};

export type CategoryItemsProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CategoryItems'>;
  route: {
    params: {
      categoryId: string;
      categoryIds?: string[];
      categoryName?: string;
    };
  };
};

export type CartProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Cart'>;
  route: {
    params?: {
      selectedAddressId?: string;
    };
  };
};

export type AddressManagementProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddressManagement'>;
  route: {
    params?: {
      selectedAddressId?: string;
    };
  };
};

export type OrdersProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Orders'>;
};

export type OrderDetailProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;
  route: {
    params: {
      orderId: string;
    };
  };
};

export type ProfileProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

export type WishlistProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Wishlist'>;
};

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  brand?: string | null;
  material?: string | null;
  category_id: string;
  image_url: string;
  stock: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_label: string;
  unit?: string | null;
  price?: number | null;
  stock: number;
  image_url?: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  total: number;
  delivery_address: string;
  delivery_date: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  product?: Product;
}

export interface Address {
  id: string;
  user_id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  is_default: boolean;
}

export interface UserProfile {
  id: string;
  user_uuid: string;
  user_email: string;
  full_name?: string | null;
  company_name?: string;
  phone?: string;
  avatar_url?: string | null;
  user_type?: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}
