import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoriteScreen() {
    const [savedProducts, setSavedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const auth = getAuth();
    const user = auth.currentUser;
    const navigation = useNavigation();
    const [login, setLogin] = useState(false);

    useEffect(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setLogin(true);
            }
        });
    }, []);

    useEffect(() => {
        const fetchSavedProducts = async () => {
            if (!user) {
                setError();
                setLoading(false);
                return;
            }

            try {
                const savedProductsRef = collection(db, 'savedProducts');
                const queryRef = query(savedProductsRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(queryRef);

                const products = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
                    const savedProduct = { id: docSnapshot.id, ...docSnapshot.data() };

                    // Fetch the product details from the 'products' collection
                    const productDoc = await getDoc(doc(db, 'products', savedProduct.productId));

                    if (productDoc.exists()) {
                        const productData = productDoc.data();
                        savedProduct.totalStock = productData.totalStock;
                    } else {
                        savedProduct.totalStock = 0; // Default to 0 if product not found
                    }

                    return savedProduct;
                }));

                setSavedProducts(products);
            } catch (error) {
                setError('Failed to fetch saved products');
                console.error('Error fetching saved products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSavedProducts();
    }, [user]);

    const handleDelete = async (productId) => {
        try {
            await deleteDoc(doc(db, 'savedProducts', productId));
            setSavedProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
        } catch (error) {
            Alert.alert('Error', 'Failed to delete the product');
            console.error('Error deleting product:', error);
        }
    };

    const confirmDelete = (productId) => {
        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to delete this product from your favorites?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: () => handleDelete(productId) }
            ]
        );
    };

    const renderItem = ({ item }) => {
        const isOutOfStock = item.totalStock <= 0;

        return (
            <View style={[styles.productContainer, isOutOfStock && styles.outOfStockContainer]}>
                <TouchableOpacity
                    style={[styles.productDetails, isOutOfStock && { opacity: 0.4 }]}
                    onPress={() => !isOutOfStock && navigation.navigate('ProductDetailsScreen', { productId: item.productId })}
                    disabled={isOutOfStock}
                >
                    <Image source={{ uri: item.productImageURL }} style={styles.productImage} />
                    <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.productName}</Text>
                        <Text style={styles.productPrice}>{formattedPrice(item.productPrice)}</Text>
                        {isOutOfStock && <Text style={styles.outOfStockText}>Out of Stock</Text>}
                    </View>
                </TouchableOpacity>
                {!isOutOfStock && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => confirmDelete(item.id)}
                    >
                        <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const formattedPrice = (price) => {
        const formatted = Number(price).toLocaleString('en-US', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 0,
        });
        return formatted;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#bf0141" />
            </View>
        );
    }

    if (error) {
        return <Text>{error}</Text>;
    }

    return (
        <>
            {login ? (
                <SafeAreaView style={styles.container}>
                    <FlatList
                        data={savedProducts}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                    />
                </SafeAreaView>
            ) : (
                <View style={styles.logincontainer}>
                    <Text style={styles.errorText}>You need to be logged in to Save Product</Text>
                    <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginButtonText}>Log In</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
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
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    productDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 16,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    productPrice: {
        fontSize: 14,
        color: 'gray',
    },
    deleteButton: {
        backgroundColor: '#f8d7da',
        borderRadius: 8,
        justifyContent: 'center',
        padding: 10,
    },
    deleteText: {
        color: 'red',
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 20,
    },
    outOfStockText: {
        color: 'red',
        fontWeight: 'bold',
        marginTop: 4,
    },
    outOfStockContainer: {
        backgroundColor: '#f8d7da',
        borderColor: '#f5c6cb',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    errorText: {
        color: 'red',
        fontSize: 16,
    },
});
