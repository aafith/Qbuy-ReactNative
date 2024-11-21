import { useCallback, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { StyleSheet, View, Text, TouchableOpacity, Image, StatusBar, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SceneMap, TabBar, TabView } from 'react-native-tab-view';
import { useFocusEffect } from '@react-navigation/native';

const statusBorderColors = {
  Completed: '#4CAF50',
  Cancelled: '#dc576c',
  'On Progress': '#2badbd',
  'Order Placed': '#2563eb',
};

const statusTextColors = {
  Completed: '#4CAF50',
  Cancelled: '#dc576c',
  'On Progress': '#2badbd',
  'Order Placed': '#2563eb',
};

const fetchOrders = (setOrders, navigation) => {
  // Check if the user is logged in
  if (!auth.currentUser) {
    Alert.alert('Login', 'You need to be logged in to view Orders');
    navigation.navigate('Login');
    return () => {}; // Return a no-op function
  }

  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('userId', '==', auth.currentUser.uid));

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch product details for each order
    const productsPromises = ordersData.map(async (order) => {
      const productRef = doc(db, 'products', order.productId);
      const productSnapshot = await getDoc(productRef);
      return { ...order, product: productSnapshot.data() };
    });

    const ordersWithProducts = await Promise.all(productsPromises);

    // Reverse orders to show the latest first
    setOrders(ordersWithProducts.reverse());
  });

  return unsubscribe;
};


export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'order', title: 'ORDERS' },
    { key: 'history', title: 'HISTORY' },
  ]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = fetchOrders(setOrders, navigation);
  
    // Ensure unsubscribe is always a function
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const HistoryOrders = () => {
    const historyOrders = orders.filter(order => order.status === 'Completed');

    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {historyOrders.map(order => renderProduct({ item: order }))}
      </ScrollView>
    );
  };

  const Orders = () => {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {orders.map(order => renderProduct({ item: order }))}
      </ScrollView>
    );
  };

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={styles.indicator}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
    />
  );

  // Update StatusBar when screen is focused
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('#fff');
    }, [])
  );

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

  const renderProduct = ({ item }) => {
    const borderColor = statusBorderColors[item.status] || '#ccc';
    const textColor = statusTextColors[item.status] || '#000';

    return (
      <View key={item.id} style={styles.productContainer}>
        <View style={styles.imageTextContainer}>
          <Image source={{ uri: item.product.productImageURLs[0] || '' }} style={styles.productImage} />
          <View style={styles.textContainer}>
            <View>
              <Text style={styles.productName}>{item.product.productName}</Text>
              <Text style={styles.productQty}>Qty: {item.quantity}</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={[styles.statusLabel, { color: textColor, borderColor: borderColor, borderWidth: 1 }]}>{item.status}</Text>
            <Text style={styles.productPrice}>{formattedPrice(item.totalAmount)}</Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.detailButton} onPress={() => navigation.navigate('ProductDetailsScreen', { productId: item.productId })}>
            <Text style={styles.buttonText}>Detail</Text>
          </TouchableOpacity>
          {item.status !== 'Cancelled' && (
            <TouchableOpacity style={styles.trackingButton} onPress={() => navigation.navigate('OrderDetailsScreen', { orderId: item.id, productName: item.product.productName })}>
              <Text style={[styles.buttonText, { color: '#fff' }]}>Tracking</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={SceneMap({
          order: Orders,
          history: HistoryOrders,
        })}
        onIndexChange={setIndex}
        initialLayout={{ width: 360 }}
        tabBarPosition="top"
        style={styles.tabView}
        swipeEnabled={false}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: '#bf0141' }}
            style={{ backgroundColor: 'transparent' }}
            activeColor="#bf0141"
            inactiveColor="black"
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: '#000',
    marginTop: 5,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    marginVertical: 20,
    paddingBottom: 20,
  },
  productContainer: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  imageTextContainer: {
    flexDirection: 'row',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginLeft: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  productQty: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    position: 'absolute',
    marginTop: 30,
    right: 0,
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statusLabel: {
    marginTop: 5,
    marginBottom: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  detailButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginRight: 5,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  trackingButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#bf0141',
    borderRadius: 10,
    marginLeft: 5,
    backgroundColor: '#bf0141',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  tabView: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#fff',
  },
  indicator: {
    backgroundColor: '#bf0141',
  },
});
