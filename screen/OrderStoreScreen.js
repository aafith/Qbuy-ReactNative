import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrderStoreScreen({ route, navigation }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const storeId = route?.params?.storeId || "exampleStoreId"; // Replace with actual `storeId`

    // Fetch orders and their corresponding product details when the component loads
    useEffect(() => {
        fetchOrders();
    }, [storeId]);

    // Function to fetch orders from Firestore
    const fetchOrders = async () => {
        try {
            const q = query(collection(db, "orders"), where("storeId", "==", storeId));
            const querySnapshot = await getDocs(q);

            const fetchedOrders = await Promise.all(querySnapshot.docs.map(async (doc) => {
                const orderData = doc.data();
                // Fetch product details based on productId from the order
                const productDetails = await fetchProductDetails(orderData.productId);
                
                // Ensure that if product details are not found, default values are used
                return {
                    id: doc.id,
                    productName: productDetails?.productName || "Unknown Product",
                    productImageURLs: productDetails?.productImageURLs || ['https://via.placeholder.com/100'], // Placeholder image
                    ...orderData,
                };
            }));

            setOrders(fetchedOrders);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setLoading(false);
        }
    };

    // Function to fetch product details from Firestore
    const fetchProductDetails = async (productId) => {
        try {
            // Fetch product details using the document ID
            const productDoc = await getDoc(doc(db, "products", productId));

            if (!productDoc.exists()) {
                console.error("No product found with the given productId:", productId);
                return {}; // Return empty if no product is found
            }

            const productDetails = productDoc.data();
            return productDetails;
        } catch (error) {
            console.error("Error fetching product details:", error);
            return {}; // Return empty if error occurs
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#bf0141" />
            </View>
        );
    }

    // Navigate to StoreOrderDetailsScreen
    const handleOrderDetails = (orderId) => {
        navigation.navigate("StoreOrderDetails", { orderId });
    };

    const renderOrder = ({ item }) => (
        <View style={styles.orderCard}>
            {/* Ensure the image URL is valid */}
            <Image source={{ uri: item.productImageURLs[0] }} style={{ width: 100, height: 100, borderRadius: 12 }} />
            <View style={styles.orderDetails}>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text>{item.status}</Text>
                <TouchableOpacity
                    style={[styles.button, styles.detailsButton]}
                    onPress={() => handleOrderDetails(item.id)}
                >
                    <Text style={styles.buttonText}>Order Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                renderItem={renderOrder}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 16,
        textAlign: "center",
    },
    list: {
        paddingBottom: 16,
    },
    orderCard: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    productName: {
        fontSize: 16,
        fontWeight: "bold",
    },
    button: {
        marginTop: 8,
        padding: 10,
        borderRadius: 4,
        alignItems: "center",
    },
    detailsButton: {
        backgroundColor: "#bf0141",
        borderRadius: 10,
        paddingVertical: 15,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    orderDetails: {
        flexDirection: "column",
        marginLeft: 16,
        flex: 1,
        justifyContent: "space-between",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});
