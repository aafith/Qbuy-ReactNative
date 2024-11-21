import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Image, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from "react-native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StoreOrderDetailsScreen({ route, navigation }) {
    const { orderId } = route.params;
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            // Fetch the order document by its ID
            const orderDoc = await getDoc(doc(db, "orders", orderId));
            if (orderDoc.exists()) {
                const orderData = orderDoc.data();
                const productDetails = await fetchProductDetails(orderData.productId);
                setOrderDetails({ ...orderData, productDetails });
            } else {
                console.error("No such order found!");
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching order details:", error);
            setLoading(false);
        }
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

    const fetchProductDetails = async (productId) => {
        try {
            // Fetch product details from Firestore
            const productDoc = await getDoc(doc(db, "products", productId));
            if (productDoc.exists()) {
                return productDoc.data();
            } else {
                console.error("No product found with the given productId:", productId);
                return {};
            }
        } catch (error) {
            console.error("Error fetching product details:", error);
            return {};
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#bf0141" />
            </View>
        );
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
            const date = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
            return date.toLocaleString();
        }
        return 'Invalid Date';
    };

    const handleAction = async (orderId, action) => {
        if (!orderId || !action) {
            console.error("Invalid orderId or action:", orderId, action);
            return; // Prevent further execution if parameters are invalid
        }
    
        Alert.alert(
            `${action} Order`,
            `Are you sure you want to ${action.toLowerCase()} this order?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes",
                    onPress: async () => {
                        try {
                            // Check if the orderId exists in Firestore
                            const orderRef = doc(db, "orders", orderId);
                            const orderSnap = await getDoc(orderRef);
    
                            if (!orderSnap.exists()) {
                                console.error("Order not found in Firestore:", orderId);
                                return;
                            }
    
                            // Update the order status
                            await updateDoc(orderRef, { 
                                status: action,
                                shippingDate: new Date()  // Update shipping date as well
                            });
    
                            // Update the local state with the new status and shipping date
                            setOrderDetails((prevState) => ({
                                ...prevState,
                                status: action,
                                shippingDate: new Date(),  // Update the shipping date here
                            }));
                        } catch (error) {
                            console.error("Error updating order status:", error);
                        }
                    },
                },
            ]
        );
    };
    

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

    const borderColor = statusBorderColors[orderDetails.status] || '#ccc';
    const textColor = statusTextColors[orderDetails.status] || '#000';

    return (
        <SafeAreaView style={styles.container}>
            {orderDetails && (
                <View>

                    {/* Product Information */}
                    <View style={styles.productContainer}>
                        <Image
                            source={{ uri: orderDetails.productDetails.productImageURLs[0] || 'https://via.placeholder.com/100' }}
                            style={styles.productImage}
                        />
                        <View style={styles.productInfo}>
                            <Text style={styles.productName}>{orderDetails.productDetails.productName}</Text>
                        </View>
                    </View>

                    {/* Order Status */}
                    <Text style={styles.statusTitle}>Order Status</Text>
                    <Text style={[styles.statusLabel, { color: textColor, borderColor: borderColor, borderWidth: 1 }]}>{orderDetails.status}</Text>

                    {/* Customer Deatils */}
                    <Text style={styles.sectionTitle}>Customer Info</Text>
                    <Text>Name: {orderDetails.customerName}</Text>
                    <Text>Email: {orderDetails?.email || "N/A"}</Text>
                    <Text>Phone: {orderDetails.phoneNumber}</Text>

                    {/* Order Information */}
                    <Text style={styles.sectionTitle}>Order Info</Text>
                    <Text>Quantity: {orderDetails.quantity}</Text>
                    <Text>Price: {formattedPrice(orderDetails.totalAmount)}</Text>
                    <Text>Payment Method: {orderDetails.paymentMethod?.charAt(0).toUpperCase() +
                        orderDetails.paymentMethod?.slice(1) || 'N/A'}</Text>
                    <Text>Order Placed Date: {formatDate(orderDetails.orderPlacedDate)}</Text>

                    {/* Delivery Information */}
                    <Text style={styles.sectionTitle}>Delivery Information</Text>
                    <Text>Address: {orderDetails.address}, {orderDetails.city}, {orderDetails.zipCode} LK</Text>
                    <Text>Delivery Method: {orderDetails.deliveryOption?.charAt(0).toUpperCase() +
                        orderDetails.deliveryOption?.slice(1) || 'N/A'}</Text>

                    {/* Navigation to previous screen */}
                    {orderDetails && orderDetails.status === "Order Placed" && (
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.acceptButton]}
                                onPress={() => handleAction(orderId, "On Progress")}
                            >
                                <Text style={styles.buttonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.rejectButton]}
                                onPress={() => handleAction(orderId, "Cancelled")}
                            >
                                <Text style={styles.buttonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
        paddingTop: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    productContainer: {
        flexDirection: "row",
        marginBottom: 16,
    },
    productImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
        marginRight: 16,
    },
    productInfo: {
        flex: 1,
        justifyContent: "center",
    },
    productName: {
        fontSize: 18,
        fontWeight: "bold",
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginVertical: 8,
    },
    statusLabel: {
        marginTop: 5,
        marginBottom: 5,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: '500',
        width: 120,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 8,
    },
    buttonContainer: {
        flexDirection: "row",
        marginTop: 50,
        justifyContent: "space-between",
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        marginHorizontal: 5,
        alignItems: "center",
    },
    acceptButton: {
        backgroundColor: "#4CAF50",
    },
    rejectButton: {
        backgroundColor: "#F44336",
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
});
