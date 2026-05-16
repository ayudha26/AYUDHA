import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import SignUpScreen from "@screens/SignUpScreen";
import SplashScreen from "@screens/SplashScreen";
import SignInScreen from "@screens/SignInScreen";
import HomeScreen from "@screens/HomeScreen";
import VerificationScreen from "@screens/VerificationScreen";
import ChangePasswordScreen from "@screens/ChangePasswordScreen";
import ButtonExamples from "@screens/ButtonExamples";
import { RootStackParamList } from "@src/Types/types";
import ProductCatalogScreen from "@screens/ProductCatalog/ProductCatalogScreen";
import CategoryItemsScreen from "@screens/ProductCatalog/CategoryItemsScreen";
import ProductDetailScreen from "@screens/ProductDetail/ProductDetailScreen";
import CartScreen from "@screens/Cart/CartScreen";
import OrdersScreen from "@screens/Orders/OrdersScreen";
import ProfileScreen from "@screens/Profile/ProfileScreen";
import AddressManagementScreen from "@screens/AddressManagement/AddressManagementScreen";
import WishlistScreen from "@screens/Wishlist/WishlistScreen";


const Stack = createStackNavigator<RootStackParamList>();

const MainNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id="MainStack"
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: "none",
        }}
        initialRouteName="SplashScreen"
      >
        <Stack.Screen name="SplashScreen" component={SplashScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="SignInScreen" component={SignInScreen} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
        <Stack.Screen name="VerificationScreen" component={VerificationScreen} />
        <Stack.Screen name="ButtonExamples" component={ButtonExamples} />
        <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
        <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} />
        <Stack.Screen name="CategoryItems" component={CategoryItemsScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="AddressManagement" component={AddressManagementScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;
