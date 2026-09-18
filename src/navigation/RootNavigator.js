import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, Text } from "react-native";

import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import CartScreen from "../screens/CartScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import VenueEnquiryScreen from "../screens/VenueEnquiryScreen";
import MyEnquiriesScreen from "../screens/MyEnquiriesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChatScreen from "../screens/ChatScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import BookingScreen from "../screens/BookingScreen";
import ItemDetailScreen from "../screens/ItemDetailScreen";
import BrandsScreen from "../screens/BrandsScreen";
import BrandDetailScreen from "../screens/BrandDetailScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Menu tab: Home -> Cart -> Checkout, plus venue enquiry flow, as one stack
function MenuStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.charcoal }, headerTintColor: colors.paper }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: "Your cart" }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Checkout" }} />
      <Stack.Screen name="VenueEnquiry" component={VenueEnquiryScreen} options={{ title: "Venue enquiry" }} />
      <Stack.Screen name="MyEnquiries" component={MyEnquiriesScreen} options={{ title: "My enquiries" }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Order status" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="Booking" component={BookingScreen} options={{ title: "Book this package" }} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: "Item details" }} />
      <Stack.Screen name="Brands" component={BrandsScreen} options={{ title: "Brand Partners" }} />
      <Stack.Screen
        name="BrandDetail" component={BrandDetailScreen}
        options={({ route }) => ({ title: route.params?.brandName || "Brand" })}
      />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.charcoal }, headerTintColor: colors.paper }}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} options={{ title: "My orders" }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Order status" }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.saffron2,
        tabBarInactiveTintColor: colors.inkFaint,
      }}
    >
      <Tab.Screen
        name="MenuTab" component={MenuStack}
        options={{ title: "Menu", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🍽️</Text> }}
      />
      <Tab.Screen
        name="OrdersTab" component={OrdersStack}
        options={{ title: "Orders", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text> }}
      />
      <Tab.Screen
        name="ChatTab" component={ChatScreen}
        options={{
          title: "Chat", headerShown: true, headerStyle: { backgroundColor: colors.charcoal }, headerTintColor: colors.paper, headerTitle: "Chat with us",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab" component={ProfileScreen}
        options={{ title: "Profile", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.charcoal }}>
        <ActivityIndicator color={colors.saffron} size="large" />
      </View>
    );
  }

  return <NavigationContainer>{user ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}
