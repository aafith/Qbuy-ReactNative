import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, Dimensions, TouchableOpacity, TextInput } from 'react-native';
import { useRoute } from "@react-navigation/native";
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import * as Location from 'expo-location';
import { SafeAreaView } from "react-native-safe-area-context";

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { onAuthStateChanged } from 'firebase/auth';

const { width: screenWidth } = Dimensions.get('window');

export default function ProductBids({ navigation }) {
    const route = useRoute();
    const { productId, productName, storeId: storeIdFromRoute } = route.params;
    const [product, setProduct] = useState(null);
    const [stores, setStores] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState();
    const [selectedProductPrice, setSelectedProductPrice] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [user, setUser] = useState(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Permission to access location was denied');
                console.log('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            console.log('User location:', location.coords);
            setUserLocation(location.coords);
        })();
        fetchProductDetails();
    }, []);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);


    useEffect(() => {
        if (product && userLocation) {
            fetchStores(productName);
        }
    }, [product, userLocation]);

    const fetchProductDetails = async () => {
        try {
            const productDoc = await getDoc(doc(db, "products", productId));
            if (productDoc.exists()) {
                setProduct(productDoc.data());
                console.log('Product details:', productDoc.data());
            } else {
                console.log("No such document!");
            }
        } catch (error) {
            console.error("Error fetching product details:", error);
        }
    };

    const fetchStores = async (productName) => {
        try {
            const q = query(collection(db, "products"), where("productName", "==", productName));
            const querySnapshot = await getDocs(q);
            const storeList = [];
            let defaultStoreSelected = false;

            for (const productDoc of querySnapshot.docs) {
                const productData = productDoc.data();
                const storeId = productData.storeId;

                const storeDoc = await getDoc(doc(db, "stores", storeId));
                if (storeDoc.exists()) {
                    const store = storeDoc.data();
                    if (store.latitude && store.longitude) {
                        const distance = calculateDistance(userLocation.latitude, userLocation.longitude, store.latitude, store.longitude);
                        if (distance <= 5) {
                            storeList.push({ id: storeId, ...store });

                            // Check if the storeId from route params matches
                            if (storeId === storeIdFromRoute) {
                                setSelectedStoreId(storeId);
                                setSelectedProductPrice(store.products.find(p => p.productId === productId)?.productPrice || 0);
                                setSelectedItems([{ id: storeId, productPrice: store.products.find(p => p.productId === productId)?.productPrice || 0, quantity: 1 }]);
                                defaultStoreSelected = true;
                            }
                        }
                    }
                }
            }

            if (!defaultStoreSelected && storeList.length === 1) {
                // Automatically select the single store available
                const singleStore = storeList[0];
                setSelectedStoreId(singleStore.id);
                setSelectedProductPrice(singleStore.products.find(p => p.productId === productId)?.productPrice || 0);
                setSelectedItems([{ id: singleStore.id, productPrice: singleStore.products.find(p => p.productId === productId)?.productPrice || 0, quantity: 1 }]);
            }

            setStores(storeList);
            console.log('Stores:', storeList);
        } catch (error) {
            console.error("Error fetching stores:", error);
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
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

    const handleSelectStore = (storeId, productPrice) => {
        setSelectedStoreId(storeId);
        setSelectedProductPrice(productPrice);
    
        // Find the selected product from the store
        const selectedProduct = stores.find(store => store.id === selectedStoreId)?.products.find(p => p.productId);
    
        if (selectedProduct) {
            setSelectedItems([{ id: storeId, productPrice: selectedProduct.productPrice, quantity: 1 }]);
        }
    };

    const DELIVERY_COST = 600.00; // Example delivery cost

    const getTotalAmount = () => {
        const productPrice = selectedProductPrice || product?.productPrice || 0;
        const totalProductPrice = productPrice * quantity;
        const totalAmount = selectedStoreId ? totalProductPrice + DELIVERY_COST : totalProductPrice;
        return totalAmount - discount;
    };

    const totalAmount = getTotalAmount();
    const discountAmount = totalAmount * discount;

    const incrementQuantity = () => {
        setQuantity(prevQuantity => prevQuantity + 1);
    };

    const decrementQuantity = () => {
        setQuantity(prevQuantity => (prevQuantity > 1 ? prevQuantity - 1 : 1));
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {product && (
                    <View style={styles.productContainer}>
                        <Image source={{ uri: product.productImageURLs[0] }} style={styles.image} />
                        <View style={styles.productDetails}>
                            <Text style={styles.name}>{product.productName}</Text>
                            <Text style={styles.price}>{formattedPrice(selectedProductPrice || product.productPrice)} x {quantity}</Text>
                        </View>
                    </View>
                )}
                <Text style={styles.heading}>Available Offers at Nearby Stores</Text>
                {stores.length === 0 && <Text style={styles.noStoresText}>No stores found</Text>}
                {stores.map((store, index) => {
                    const storeProduct = store.products.find(p => p.productId);
                    const productPrice = storeProduct ? storeProduct.productPrice : 'Price not available';

                    return (
                        <View key={index} style={styles.storeContainer}>
                            <View style={styles.storeImageContainer}>
                                <Image
                                    source={{ uri: store.profileImageURL || { uri: 'https://placehold.co/400' } }}
                                    style={styles.storeImage}
                                />
                            </View>
                            <View style={styles.storeInfoContainer}>
                                <View style={styles.storeHeader}>
                                    <Text style={styles.storeName}>{store.storeName}</Text>
                                    {store.isVerified && (
                                        <MaterialIcons name="verified" size={20} color="#2563eb" style={styles.verifiedIcon} />
                                    )}
                                </View>
                                <Text style={styles.productPrice}>
                                    {formattedPrice(productPrice)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.selectButton, selectedStoreId === store.id && styles.selectedButton]}
                                onPress={() => handleSelectStore(store.id, productPrice)}
                            >
                                <Text style={styles.selectButtonText}>
                                    {selectedStoreId === store.id ? "Selected" : "Select"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.quantityContainer}>
                <Text style={styles.quantityLabel}>QTY:</Text>
                <TouchableOpacity
                    style={[styles.quantityButton, quantity === 1 && styles.disabledButton]}
                    onPress={decrementQuantity}
                    disabled={quantity === 1}
                >
                    <AntDesign name="minus" size={16} color={quantity === 1 ? '#ccc' : '#fff'} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={incrementQuantity}
                >
                   <AntDesign name="plus" size={16} color='#fff' />
                </TouchableOpacity>
            </View>

            <View style={styles.promoCodeContainer}>
                <TextInput
                    style={styles.promoCodeInput}
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChangeText={setPromoCode}
                />
                <TouchableOpacity
                    style={styles.applyButton}
                    onPress={applyPromoCode}
                >
                    <Text style={styles.applyButtonText}>Apply Promo</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <View>
                    <Text style={styles.summaryText}>Delivery: <Text style={styles.boldText}>{selectedStoreId ? formattedPrice(DELIVERY_COST) : 'N/A'}</Text></Text>
                    <Text style={styles.summaryText}>Discount: <Text style={styles.boldText}>{formattedPrice(discountAmount)}</Text></Text>
                    <Text style={styles.summaryText}>Total Amount: <Text style={styles.boldText}>{formattedPrice(totalAmount)}</Text></Text>
                </View>
                <TouchableOpacity
                    style={styles.checkoutButton}
                    onPress={() => {
                        // Find the selected product details from the selected store
                        const selectedProduct = stores.find(store => store.id === selectedStoreId)?.products.find(p => p.productId);

                        if (!user) {
                            Alert.alert('Login', 'Please login to continue');
                            navigation.navigate('Login');
                            return;
                        }

                        navigation.navigate('Checkout', {
                            userId: user.uid,
                            selectedStoreId,
                            productId: selectedProduct?.productId, // Ensure the product ID is included
                            selectedProductPrice: selectedProduct?.productPrice || selectedProductPrice,
                            quantity,
                        });
                    }}
                >
                    <Text style={styles.checkoutButtonText}>Checkout</Text>
                    <AntDesign name="arrowright" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    productContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    image: {
        width: 100,
        height: 100,
        resizeMode: 'cover',
        borderRadius: 10,
    },
    productDetails: {
        marginLeft: 16,
    },
    name: {
        fontSize: 15,
        width: screenWidth - 150,
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: "left",
    },
    price: {
        fontSize: 18,
        color: '#000',
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    noStoresText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
    },
    storeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        backgroundColor: '#f9f9f9',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginBottom: 5,
    },
    storeInfoContainer: {
        flex: 1,
    },
    storeImageContainer: {
        marginRight: 10,
    },
    storeImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verifiedIcon: {
        marginLeft: 5,
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    productPrice: {
        fontSize: 16,
        color: '#333',
        marginTop: 5,
        marginBottom: 5,
    },
    selectButton: {
        flexDirection: 'row',
        backgroundColor: '#000',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    selectedButton: {
        backgroundColor: '#444',
    },
    selectButtonText: {
        color: '#fff',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        borderStyle: 'dashed',
    },
    summaryText: {
        fontSize: 15,
    },
    boldText: {
        fontWeight: 'bold',
    },
    checkoutButton: {
        flexDirection: 'row',
        gap: 10,
        padding: 16,
        backgroundColor: '#000',
        borderRadius: 15,
        alignItems: 'center',
        paddingHorizontal: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkoutButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginVertical: 20,
    },
    quantityLabel: {
        fontSize: 16,
        marginRight: 8,
    },
    quantityButton: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#bf0141',
    },
    quantityButtonText: {
        fontSize: 18,
    },
    quantityText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginHorizontal: 12,
    },
    disabledButton: {
        backgroundColor: '#e0e0e0',
    },
    promoCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    promoCodeInput: {
        flex: 1,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginRight: 10,
    },
    applyButton: {
        backgroundColor: '#bf0141',
        padding: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    applyButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
