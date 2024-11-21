import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, auth } from '../firebaseConfig'; // Firebase Firestore and Authentication import
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

const PaymentMethodScreen = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true); // State for loading
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoading(true);
      try {
        const paymentQuery = query(collection(db, 'payments'), where('userId', '==', userId));
        const paymentSnapshot = await getDocs(paymentQuery);
        const paymentData = paymentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCartItems(paymentData);
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPaymentMethods();
    }
  }, [userId]);

  const handleDelete = async (id) => {
    Alert.alert('Delete Payment', 'Are you sure you want to delete this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            // Get a reference to the document and delete it
            const paymentDocRef = doc(collection(db, 'payments'), id);
            await deleteDoc(paymentDocRef); // Use deleteDoc to delete the document
            setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
            console.log('Deleted payment method with id:', id);
          } catch (error) {
            console.error('Error deleting payment method:', error);
          }
        },
      },
    ]);
  };

  const handleAddCart = () => {
    navigation.navigate('AddCardScreen');
  };

  const renderItem = ({ item }) => (
    <View style={styles.cartItemContainer}>
      <Text style={styles.cardNumber}>
        Card: {item.cardNumber ? `${item.cardNumber.slice(0, 4)} **** **** ${item.cardNumber.slice(-4)}` : '**** **** **** ****'}
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#bf0141" />
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartList}
            ListEmptyComponent={<Text>No payment methods available.</Text>}
          />
          <TouchableOpacity style={styles.addCartButton} onPress={handleAddCart}>
            <Text style={styles.addCartButtonText}>Add Card</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  cartList: {
    flexGrow: 1,
  },
  cartItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    borderRadius: 8,
  },
  cardNumber: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8d7da',
  },
  deleteButtonText: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteIcon: {
    marginRight: 5,
  },
  addCartButton: {
    backgroundColor: '#bf0141',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  addCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentMethodScreen;
