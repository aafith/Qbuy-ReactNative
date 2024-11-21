import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { fetchCartItems, removeCartItem, updateCartItemQuantity, fetchProductStock } from '../helpers/firestoreFunctions';
import { getAuth } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Import icons
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Checkbox } from 'react-native-paper';

const DELIVERY_COST = 600.00; // Example delivery cost

export default function CartScreen() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const auth = getAuth();
  const user = auth.currentUser;
  const navigation = useNavigation();

  useEffect(() => {
    const loadCartItems = async () => {
      if (user) {
        const items = await fetchCartItems(user.uid);
        setCartItems(items);
      }
      setLoading(false);
    };

    loadCartItems();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('#fff');
    }, [])
  );

  useEffect(() => {
    if (selectAll) {
      setSelectedItems(cartItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  }, [selectAll, cartItems]);


  const handleUpdateQuantity = async (itemId, quantity) => {
    if (quantity > 0) {
      await updateCartItemQuantity(itemId, quantity);
      setCartItems(prevItems =>
        prevItems.map(item => item.id === itemId ? { ...item, quantity } : item)
      );
    } else {
      Alert.alert('Error', 'Quantity must be at least 1.');
    }
  };

  const handleSelectItem = async (itemId) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item) {
      const stock = await fetchProductStock(item.productId);
      if (stock === 0) {
        Alert.alert('Out of Stock', 'This item is currently out of stock.');
        return;
      }
    }

    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleSelectAll = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'No items in the cart to select.');
      return;
    }

    if (!selectAll) {
      const outOfStockItems = [];
      for (const item of cartItems) {
        const stock = await fetchProductStock(item.productId);
        if (stock === 0) {
          outOfStockItems.push(item.productName);
        }
      }
      if (outOfStockItems.length > 0) {
        Alert.alert('Out of Stock', `The following items are currently out of stock: ${outOfStockItems.join(', ')}.`);
        return;
      }
    }
    setSelectAll(!selectAll);
  };

  const getTotalAmount = () => {
    const total = selectedItems.reduce((sum, itemId) => {
      const item = cartItems.find(item => item.id === itemId);
      return sum + (item && item.productPrice ? item.productPrice * item.quantity : 0);
    }, 0);
    return total;
  };

  const formattedPrice = (productPrice) => {
    const price = Number(productPrice);
    if (isNaN(price)) {
      console.error('Invalid price:', productPrice);
      return 'Invalid price';
    }

    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    });
  };

  const handleCheckout = () => {
    // Find the selected product details from the selected storeId
    const selectedProducts = cartItems.filter(item => selectedItems.includes(item.id));
  
    // Check if any item is selected
    if (selectedProducts.length === 0) {
      return Alert.alert('Error', 'Please select at least one item to checkout.');
    }
  
    // Split the selected products by storeId
    const ordersByStore = selectedProducts.reduce((orders, item) => {
      if (!item.storeId) {
        console.error('Product is missing storeId:', item);
        return orders;
      }
      if (!orders[item.storeId]) {
        orders[item.storeId] = [];
      }
      orders[item.storeId].push(item);
      return orders;
    }, {});
  
    // Create an array of orders
    const orders = Object.keys(ordersByStore).map(storeId => {
      const storeProducts = ordersByStore[storeId];
  
      return {
        selectedStoreId: storeId,
        productId: storeProducts.map(product => product.productId),
        selectedProductPrice: storeProducts.map(product => product.productPrice),
        quantity: storeProducts.map(item => item.quantity), // Default quantity to 0
      };
    });
    // Navigate to the checkout screen
    navigation.navigate('Checkout', { orders });
  };
  
  

  const applyPromoCode = () => {
    // Example promo code logic
    if (promoCode === 'DISCOUNT10') {
      setDiscount(0.1); // 10% discount
    } else if (promoCode === 'DISCOUNT20') {
      setDiscount(0.2); // 20% discount
    } else {
      setDiscount(0);
      Alert.alert('Invalid Promo Code', 'The promo code you entered is not valid.');
    }
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Checkbox
        status={selectedItems.includes(item.id) ? 'checked' : 'unchecked'}
        onPress={() => handleSelectItem(item.id)}
        color={selectedItems ? '#bf0141' : '#000'}
      />
      <Image source={{ uri: item.productImageURL }} style={styles.productImage} />
      <View style={styles.productDetails}>
        <Text style={styles.productName}>{item.productName}</Text>
        <View style={styles.priceColorRow}>
          <Text style={styles.productPrice}>
            {formattedPrice(item.productPrice)}
          </Text>
        </View>
        <View style={styles.quantityContainer}>
          {item.quantity > 1 ? (
            <TouchableOpacity
              onPress={() => handleUpdateQuantity(item.id, Math.max(item.quantity - 1, 1))}
              style={styles.quantityButton}
            >
              <AntDesign name="minus" size={16} color='#fff' />
            </TouchableOpacity>
          ) : (
            <View style={[styles.quantityButton, { backgroundColor: '#ccc' }]}>
              <AntDesign name="minus" size={16} color='#fff' />
            </View>
          )}
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
            style={styles.quantityButton}
          >
            <AntDesign name="plus" size={16} color='#fff' />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#bf0141" />
        </View>
    );
}

  const handleDeleteSelectedItems = async () => {
    const deletePromises = selectedItems.map(id => removeCartItem(id));
    await Promise.all(deletePromises);
    setCartItems(cartItems.filter(item => !selectedItems.includes(item.id)));
    setSelectedItems([]); // Clear selected items after deletion
    Alert.alert('Success', 'Selected items have been removed from the cart.');
  };

  const totalAmount = getTotalAmount();
  const discountAmount = totalAmount * discount;
  const totalWithDelivery = totalAmount - discountAmount + DELIVERY_COST;
  const deleveryCost = DELIVERY_COST * selectedItems.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
        <AntDesign name="arrowleft" size={24} color="#000" style={styles.backButton} />
        </TouchableOpacity>
        <Text style={styles.title}>My Cart</Text>
        {cartItems.length > 0 && (
          <View style={styles.selectAllContainer}>
            <Text style={styles.selectAllText}>
              {selectAll ? 'All' : 'All'}
            </Text>
            <Checkbox
              status={selectAll ? 'checked' : 'unchecked'}
              onPress={handleSelectAll}
              color={selectAll ? '#bf0141' : '#fff'}
            />

            <TouchableOpacity onPress={handleDeleteSelectedItems} style={styles.deleteButton}>
            <MaterialIcons name="delete" size={24} color="red" />
            </TouchableOpacity>
          </View>
        )}

      </View>

      <View style={styles.content}>
        {cartItems.length === 0 ? (
          <View style={styles.emptyCartMessageContainer}>
            <Text style={styles.emptyCartMessage}>No products in the cart.</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={cartItems}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.promoCodeContainer}>
              <TextInput
                style={styles.promoCodeInput}
                placeholder="Enter promo code"
                value={promoCode}
                onChangeText={setPromoCode}
              />
              <TouchableOpacity style={styles.applyButton} onPress={applyPromoCode}>
                <Text style={styles.applyButtonText}>Apply Promo</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.footer}>
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>Delivery: <Text style={styles.boldText}>{formattedPrice(deleveryCost)}</Text></Text>
                <Text style={styles.summaryText}>Discount: <Text style={styles.boldText}>{formattedPrice(discountAmount)}</Text></Text>
                <Text style={styles.summaryText}>Total Amount: <Text style={styles.boldText}>{formattedPrice(totalWithDelivery)}</Text></Text>
              </View>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutButtonText}>Checkout</Text>
                <AntDesign name="arrowright" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  productDetails: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  productImage: {
    width: 90,
    height: 90,
    marginRight: 16,
    borderRadius: 8,
  },
  priceColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 16,
    color: '#000',
    marginLeft: 'auto',
  },
  productColor: {
    fontSize: 14,
    color: '#777',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
  },
  quantityButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#bf0141',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  removeButton: {
    marginLeft: 16,
  },
  removeButtonText: {
    color: '#ff0000',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderStyle: 'dashed',
    width: '100%',
  },
  summaryContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryText: {
    fontSize: 15,
  },
  boldText: {
    fontWeight: 'bold',
  },
  promoCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 10,
  },
  promoCodeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginVertical: 16,
    flex: 1,
    marginRight: 16,
  },
  applyButton: {
    padding: 10,
    backgroundColor: '#bf0141',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#000',
    borderRadius: 15,
    alignItems: 'center',
    width: '100%',
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyCartMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyCartMessage: {
    fontSize: 18,
    color: '#777',
    textAlign: 'center',
  },
});
