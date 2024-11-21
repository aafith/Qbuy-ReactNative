import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import * as Location from 'expo-location';
import { SafeAreaView } from "react-native-safe-area-context";

import Entypo from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

export default function Store() {
    const [stores, setStores] = useState([]);
    const [nearbyStores, setNearbyStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasStore, setHasStore] = useState(false);
    const [storeProducts, setStoreProducts] = useState([]);
    const [location, setLocation] = useState(null);
    const navigation = useNavigation();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const auth = getAuth();
    const user = auth.currentUser;
    // fetch data
    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            StatusBar.setBackgroundColor('#ffffff');
            fetchStores();
            fetchNearbyStores();
        }, [])
    );

    useEffect(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsLoggedIn(true);
            }
        });
    }, []);

    // fetch store data
    const fetchStores = async () => {
        if (!user) {
            setError('User not authenticated');
            setLoading(false);
            return;
        }

        try {
            const storesRef = collection(db, 'stores');
            const storesQuery = query(storesRef, where('userId', '==', user.uid));
            const storesSnapshot = await getDocs(storesQuery);
            const storesData = storesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setStores(storesData);
            setHasStore(storesData.length > 0);

            if (storesData.length > 0) {
                const storeId = storesData[0].id; // Assuming you want products for the first store
                const productsRef = collection(db, 'products');
                const productsQuery = query(productsRef, where('storeId', '==', storeId));
                const productsSnapshot = await getDocs(productsQuery);
                const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStoreProducts(products);
            }

        } catch (err) {
            setError('Failed to load stores');
            console.error('Error fetching stores:', err);
        } finally {
            setLoading(false);
        }
    };

    // fetch nearby store data  
    const fetchNearbyStores = async () => {
        try {
            // Request location permission and get current location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Permission to access location was denied');
                return;
            }

            const userLocation = await Location.getCurrentPositionAsync({});
            setLocation(userLocation.coords);

            // Get all stores from Firestore
            const storesRef = collection(db, 'stores');
            const storesSnapshot = await getDocs(storesRef);

            // Filter stores to find nearby ones
            const nearby = await Promise.all(storesSnapshot.docs.map(async (doc) => {
                const storeData = doc.data();
                const { latitude, longitude, userId } = storeData;

                // Skip stores with missing location data
                if (latitude == null || longitude == null) {
                    console.warn(`Store with ID ${doc.id} has missing location data`);
                    return null;
                }


                // Calculate distance and filter by proximity
                const distance = calculateDistance(
                    userLocation.coords.latitude,
                    userLocation.coords.longitude,
                    latitude,
                    longitude
                );

                if (distance <= 5) {
                    // Fetch products for each nearby store
                    const productsRef = collection(db, 'products');
                    const productsQuery = query(productsRef, where('storeId', '==', doc.id));
                    const productsSnapshot = await getDocs(productsQuery);
                    const products = productsSnapshot.docs.map(productDoc => ({ id: productDoc.id, ...productDoc.data() }));

                    return { id: doc.id, ...storeData, productCount: products.length };
                }

                return null;
            }));

            setNearbyStores(nearby.filter(store => store !== null));
        } catch (err) {
            setError('Failed to load nearby stores');
            console.error('Error fetching nearby stores:', err);
        }
    };

    // calculate distance
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const toRad = (value) => (value * Math.PI) / 180;
        const R = 6371; // Earth's radius in kilometers
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in kilometers
        return distance;
    };

    // add store
    const handleAddStore = () => {
        if (!hasStore) {
            navigation.navigate('CreateStore', {
            });
        } else {
            alert('You can only create one store.');
        }
    };

    //loading
    if (loading) {
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#bf0141" />
        </View>
    }

    // render store
    const renderStoreItem = ({ item }) => (
        <TouchableOpacity
            style={styles.storeContainer}
            onPress={() => navigation.navigate('StoreViewScreen', { storeId: item.id })}
        >
            <View style={styles.storeImageContainer}>
                <Image
                    source={
                        item.profileImageURL
                            ? { uri: item.profileImageURL } // Use the profile image URL if available
                            : { uri: 'https://placehold.co/400' } // Fallback to placeholder image
                    }
                    style={styles.storeImage}
                />

                {item.isVerified && (
                    <View style={styles.verifiedIconContainer}>
                        <MaterialIcons name="verified" size={20} color="#2563eb" />
                    </View>
                )}
            </View>
            <View style={styles.storeInfoContainer}>
                <View style={styles.storeHeader}>
                    <Text style={styles.storeName}>{item.storeName}</Text>
                </View>
                <View style={styles.storeStats}>
                    <Text style={styles.storeStat}>{`${storeProducts.length} Products`}</Text>
                </View>
            </View>
            <AntDesign name="arrowright" size={24} color="black" />
        </TouchableOpacity>
    );

    // render nearby store
    const renderNearbyStoreItem = ({ item }) => (
        <TouchableOpacity
            style={styles.storeContainer}
            onPress={() => navigation.navigate('StoreViewScreen', { storeId: item.id })}
        >
            <View style={styles.storeImageContainer}>
                <Image
                    source={item.profileImageURL
                        ? { uri: item.profileImageURL }
                        : { uri: 'https://placehold.co/400' }
                    }
                    style={styles.storeImage}
                />
                {item.isVerified && (
                    <View style={styles.verifiedIconContainer}>
                        <MaterialIcons name="verified" size={20} color="#2563eb" />
                    </View>
                )}
            </View>
            <View style={styles.storeInfoContainer}>
                <View style={styles.storeHeader}>
                    <Text style={styles.storeName}>{item.storeName}</Text>
                </View>
                <View style={styles.storeStats}>
                    <Text style={styles.storeStat}>{`${item.productCount || 0} Products`}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <>
            {isLoggedIn ? (
                <SafeAreaView style={styles.container}>
                    <View style={styles.myStoresSection}>
                        <View style={styles.header}>
                            <View style={styles.headerContent}>
                                <Entypo name="shop" size={24} color="#bf0141" />
                                <Text style={styles.headerTitle}>My Store</Text>
                            </View>
                            {!hasStore && (
                                <TouchableOpacity style={styles.addButton} onPress={handleAddStore}>
                                    <Feather name="plus" size={18} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {hasStore ? (
                            <FlatList
                                data={stores}
                                renderItem={renderStoreItem}
                                keyExtractor={(item) => item.id}
                            />
                        ) : (
                            <Text style={styles.noStoreText}>You haven't created a store yet.</Text>
                        )}
                    </View>

                    <View style={styles.nearbyStoresSection}>
                        <View style={styles.headerContent}>
                            <MaterialCommunityIcons name="store-marker" size={24} color="#bf0141" />
                            <Text style={styles.headerTitle}>Nearby Stores</Text>
                        </View>
                        <FlatList
                            data={nearbyStores}
                            renderItem={renderNearbyStoreItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}
                </SafeAreaView>
            ) : (
                <View style={styles.logincontainer}>
                    <Text style={styles.errorText}>You need to be logged in to create a store</Text>
                    <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginButtonText}>Log In</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    noStoreText: {
        paddingTop: 30,
        textAlign: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
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
    nearbyStoresSection: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 30,
    },
    storeInfoContainer: {
        flex: 1,
    },
    storeImageContainer: {
        marginRight: 10,
        position: 'relative',
    },
    storeImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    verifiedIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 1,
    },
    shimmerStoreItem: {
        width: '100%',
        height: 80,
        borderRadius: 20,
        marginBottom: 10,
        marginTop: 30,
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    createStoreMessage: {
        fontSize: 16,
        marginTop: 20,
        color: 'gray',
        textAlign: 'center',
    },
    storeList: {
        marginTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
    },
    addButton: {
        backgroundColor: '#bf0141',
        borderRadius: 12,
        padding: 10,
    },
    storeStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    storeStat: {
        fontSize: 14,
        color: '#666',
    },
    loginButton: {
        width: '70%',
        padding: 14,
        justifyContent: 'center',
        backgroundColor: '#bf0141',
        alignItems: 'center',
        flexDirection: 'row',
        alignSelf: 'center',
        paddingVertical: 15,
        paddingHorizontal: 80,
        borderRadius: 12,
        marginBottom: 20,
        marginTop: 30,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logincontainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});