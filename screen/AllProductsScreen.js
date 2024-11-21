import React, { useEffect, useState } from "react";
import { Button, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Alert } from "react-native";
import { db } from '../firebaseConfig'; // Ensure this path is correct
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

// Function to fetch products from Firestore
const getProductsByStoreId = async (storeId) => {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('storeId', '==', storeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const deleteProduct = async (productId) => {
    try {
        await deleteDoc(doc(db, 'products', productId));
        console.log("Product deleted successfully!");
    } catch (err) {
        console.error("Error deleting product:", err);
    }
};

const confirmDelete = (productId) => {
    Alert.alert(
        'Confirm Deletion',
        'Are you sure you want to delete this product?',
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', onPress: () => deleteProduct(productId) }
        ]
    );
};


export default function AllProductsScreen({ navigation, route }) {
    const { storeId } = route.params; // Get storeId passed from the previous screen
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true); // State to handle loading
    const [error, setError] = useState(null); // State to handle errors

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const fetchedProducts = await getProductsByStoreId(storeId);
                setProducts(fetchedProducts);
            } catch (err) {
                setError("Error fetching products.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [storeId]);

    const handleEditProduct = (productId) => {
        navigation.navigate('ProductDetails', { productId });
    };

    const handleDeleteProduct = async (productId) => {
        // Call delete function when deleting a product
        await deleteProduct(productId);
        // Refresh the product list
        const updatedProducts = products.filter(product => product.id !== productId);
        setProducts(updatedProducts);
    };

    const renderProductItem = ({ item }) => {
        const isOutOfStock = item.stockQuantity === 0; // Assuming `stockQuantity` is a field in the product data
        return (
            <View style={[styles.productContainer, isOutOfStock && styles.outOfStockContainer]}>
                <TouchableOpacity
                    style={[styles.productDetails, isOutOfStock && { opacity: 0.4 }]}
                    onPress={() => !isOutOfStock && navigation.navigate('ProductDetailsScreen', { productId: item.id })}
                    disabled={isOutOfStock}
                >
                    <Image source={{ uri: item.productImageURLs[0] }} style={styles.productImage} />
                    <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.productName}</Text>
                        <Text style={styles.productPrice}>{formattedPrice(item.productPrice)}</Text>
                        {isOutOfStock && <Text style={styles.outOfStockText}>Out of Stock</Text>}
                    </View>
                </TouchableOpacity>

                <View style={styles.productActions}>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('EditProductScreen', { productId: item.id })}
                    >
                        <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => confirmDelete(item.id)}
                    >
                        <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                </View>
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
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Loading products...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={products}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
            />
        </View>
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
    loadingText: {
        marginTop: 16,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButton: {
        backgroundColor: '#cce5ff',
        borderRadius: 8,
        justifyContent: 'center',
        padding: 10,
        marginRight: 8,
    },
    editText: {
        color: '#007bff',
        fontWeight: 'bold',
    },
});
