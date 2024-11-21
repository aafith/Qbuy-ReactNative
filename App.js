import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Tabs from "./navigation/tabs";


// outher screens
import Login from "./screen/LoginScreen";
import HelpSupportScreen from "./screen/HelpSupportScreen";
import PaymentMethodScreen from "./screen/PaymentMethodScreen";
import MembershipScreen from "./screen/MembershipScreen";
import FavoriteScreen from "./screen/FavoriteScreen";
import EditProfileScreen from "./screen/EditProfileScreen";
import OrdersScreen from "./screen/OrdersScreen";
import CartScreen from "./screen/CartScreen";
import ProductDetailsScreen from "./screen/ProductDetailsScreen";
import ProductBids from "./screen/ProductBids";
import CheckoutScreen from "./screen/CheckoutScreen";
import OrderDetailsScreen from "./screen/OrderDetailsScreen";
import StoreViewScreen from "./screen/StoreViewScreen";
import { MenuProvider } from "react-native-popup-menu";
import ReviewScreen from "./screen/ReviewScreen";
import EditStoreScreen from "./screen/EditStoreScreen";
import AddCardScreen from "./screen/AddCardsScreen";
import AddProductScreen from "./screen/AddProductScreen";
import ForgotpasswordScreen from "./screen/ForgotPasswordScreen";
import Register from "./screen/RegisterScreen";
import CreateStoreScreen from "./screen/CreateStoreScreen";
import MessageScreen from "./screen/MessageScreen";
import ChatScreen from "./screen/ChatScreen";
import OrderStoreScreen from "./screen/OrderStoreScreen";
import StoreOrderDetailsScreen from "./screen/StoreOrderDetailsScreen";
import AllProductsScreen from "./screen/AllProductsScreen";
import EditProductScreen from "./screen/EditProductScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <MenuProvider>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Tabs"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={{ title: "Help & Support", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="PaymentMethod"
          component={PaymentMethodScreen}
          options={{ title: "My cards", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="Membership"
          component={MembershipScreen}
          options={{ title: "Membership", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="Favorite"
          component={FavoriteScreen}
          options={{ title: "My Favorite", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ title: "Edit Profile", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="Order"
          component={OrdersScreen}
          options={{ title: "Orders", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProductDetailsScreen"
          component={ProductDetailsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProductBids"
          component={ProductBids}
          options={{ title: "Product Offers", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{ title: "Order confirmation", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="OrderDetailsScreen"
          component={OrderDetailsScreen}
          options={{ title: "Order Details", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="StoreViewScreen"
          component={StoreViewScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReviewScreen"
          component={ReviewScreen}
          options={{ title: "Order Details", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="EditStoreScreen"
          component={EditStoreScreen}
          options={{ title: "Edit Store", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="AddCardScreen"
          component={AddCardScreen}
          options={{ title: "Add New Card", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="AddProductScreen"
          component={AddProductScreen}
          options={{ title: "Add New Product", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotpasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={Register}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateStore"
          component={CreateStoreScreen}
          options={{ title: "Create Store", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="MessageScreen"
          component={MessageScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: "Message", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="OrderStore"
          component={OrderStoreScreen}
          options={{ title: "Store Orders", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="StoreOrderDetails"
          component={StoreOrderDetailsScreen}
          options={{ title: "Store Order Details", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="AllProducts"
          component={AllProductsScreen}
          options={{ title: "All Products", headerTitleAlign: "center" }}
        />
        <Stack.Screen
          name="EditProductScreen"
          component={EditProductScreen}
          options={{ title: "Edit Product", headerTitleAlign: "center" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </MenuProvider>
  );
}
