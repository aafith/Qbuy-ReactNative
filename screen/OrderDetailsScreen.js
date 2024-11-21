import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { db } from '../firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function OrderDetailsScreen({ route, navigation }) {
    const { orderId, productName } = route.params;
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCancelDisabled, setIsCancelDisabled] = useState(false);
    const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(true);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const orderRef = doc(db, 'orders', orderId);
                const orderSnapshot = await getDoc(orderRef);

                if (orderSnapshot.exists()) {
                    const orderData = { id: orderSnapshot.id, ...orderSnapshot.data() };
                    setOrderDetails(orderData);
                    setHasReviewed(orderData.hasReviewed || false);
                    checkCancelOrderEligibility(orderData.orderPlacedDate, orderData.status);
                } else {
                    Alert.alert('Error', 'Order not found.');
                }
            } catch (error) {
                console.error('Error fetching order details:', error);
                Alert.alert('Error', 'Failed to load order details.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId]);

    const checkCancelOrderEligibility = (orderPlacedDate, status) => {
        if (!orderPlacedDate) return;
        const orderDate = new Date(orderPlacedDate);
        const currentDate = new Date();
        const timeDifference = currentDate - orderDate;
        const dayDifference = timeDifference / (1000 * 60 * 60 * 24);

        if (dayDifference > 1 || status === 'Cancelled' || status === 'Completed') {
            setIsCancelDisabled(true);
            setIsConfirmDisabled(true);
        }
    };

    const formattedPrice = (amount) => {
        return amount?.toLocaleString('en-US', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 0,
        });
    };

    const handleConfirmOrder = async () => {
        if (isConfirmDisabled) return;

        try {
            const orderRef = doc(db, 'orders', orderDetails.id);
            await updateDoc(orderRef, { status: 'Completed', deliveryDate: new Date() });
            Alert.alert('Order Confirmed', 'Your order has been confirmed successfully.');
            setOrderDetails({ ...orderDetails, status: 'Completed', deliveryDate: new Date() });
            setIsConfirmDisabled(true);
            setIsCancelDisabled(true);

            navigation.navigate('ReviewScreen', {
                productId: orderDetails.productId,
                orderId: orderDetails.id,
                userId: orderDetails.userId,
                storeId: orderDetails.storeId,
            });
        } catch (error) {
            console.error('Error confirming order:', error);
            Alert.alert('Error', 'Failed to confirm the order.');
        }
    };

    const handleCancelOrder = async () => {
        if (isCancelDisabled) return;

        try {
            const orderRef = doc(db, 'orders', orderDetails.id);
            await updateDoc(orderRef, { status: 'Cancelled' });
            Alert.alert('Order Canceled', 'Your order has been canceled successfully.');
            setOrderDetails({ ...orderDetails, status: 'Cancelled' });
            setIsCancelDisabled(true);
            setIsConfirmDisabled(true);
            navigation.goBack();
        } catch (error) {
            console.error('Error canceling order:', error);
            Alert.alert('Error', 'Failed to cancel the order.');
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
            const date = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
            return date.toLocaleString();
        }
        return 'Invalid Date';
    };

    const TimelineItem = ({ label, value, isLast }) => (
        <View style={[styles.itemContainer, isLast && styles.lastItemContainer]}>
            <View style={styles.dotContainer}>
                <View style={[styles.dot, isLast ? styles.lastDot : styles.filledDot]} />
                {!isLast && <View style={styles.verticalLine} />}
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
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

    if (!orderDetails) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Order details not found.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.heading}>Order Information</Text>
                <View style={styles.detailContainer}>
                    <Text style={styles.label}>Order ID:</Text>
                    <Text style={styles.value}>{orderDetails.id?.slice(0, 20) || 'N/A'}</Text>
                </View>
                <View style={styles.detailContainer}>
                    <Text style={styles.label}>Payment Method:</Text>
                    <Text style={styles.value}>
                        {orderDetails.paymentMethod?.charAt(0).toUpperCase() +
                            orderDetails.paymentMethod?.slice(1) || 'N/A'}
                    </Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.heading}>Product Info</Text>
                <View style={styles.detailContainer}>
                    <Text style={styles.label}>Product Name:</Text>
                    <Text style={styles.value}>{productName}</Text>
                </View>
                <View style={styles.detailContainer}>
                    <Text style={styles.label}>Quantity:</Text>
                    <Text style={styles.value}>{orderDetails.quantity}</Text>
                </View>
                <View style={styles.detailContainer}>
                    <Text style={styles.label}>Total Amount:</Text>
                    <Text style={styles.value}>{formattedPrice(orderDetails.totalAmount)}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.heading}>Tracking Timeline</Text>
                <TimelineItem label="Order Placed" value={formatDate(orderDetails.orderPlacedDate)} />
                {orderDetails.status === 'On Progress' && (
                    <>
                        <TimelineItem label="Order Shipped" value={formatDate(orderDetails.shippingDate)} />
                        <TimelineItem label="Order Delivered" value={formatDate(orderDetails.deliveryDate)} isLast />
                    </>
                )}
                {orderDetails.status === 'Completed' && (
                    <TimelineItem label="Order Delivered" value={formatDate(orderDetails.deliveryDate)} isLast />
                )}
            </View>

            {orderDetails.status !== 'Completed' && (
                <View style={styles.card}>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.confirmButton, isConfirmDisabled && styles.disabledButton]}
                            onPress={handleConfirmOrder}
                            disabled={isConfirmDisabled}
                        >
                            <Text style={styles.buttonText}>Confirm Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.cancelButton, isCancelDisabled && styles.disabledButton]}
                            onPress={handleCancelOrder}
                            disabled={isCancelDisabled}
                        >
                            <Text style={styles.buttonText}>Cancel Order</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {orderDetails.status === 'Completed' && !hasReviewed && (
                <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() =>
                        navigation.navigate('ReviewScreen', {
                            productId: orderDetails.productId,
                            orderId: orderDetails.id,
                            userId: orderDetails.userId,
                            storeId: orderDetails.storeId,
                        })
                    }
                >
                    <Text style={styles.buttonText}>Leave a Review</Text>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f8f9fa', 
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 1, 
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333333', 
    },
    detailContainer: {
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555555', 
    },
    value: {
        fontSize: 16,
        color: '#000000', 
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    confirmButton: {
        backgroundColor: '#28a745',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flex: 1,
        marginRight: 10,
    },
    cancelButton: {
        backgroundColor: '#dc3545', 
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flex: 1,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    lastItemContainer: {
        backgroundColor: '#e9f5f3', 
        padding: 10,
        borderRadius: 8,
    },
    dotContainer: {
        alignItems: 'center',
        marginRight: 10,
        position: 'relative',
    },
    dot: {
        width: 15,
        height: 15,
        borderRadius: 10,
        borderWidth: 2,
    },
    filledDot: {
        borderColor: '#2563eb', 
        backgroundColor: '#2563eb',
    },
    lastDot: {
        borderColor: '#28a745', 
        backgroundColor: '#28a745',
    },
    verticalLine: {
        width: 2,
        height: 60,
        backgroundColor: '#2563eb', 
        position: 'absolute',
        top: 15,
        left: 6.5,
        zIndex: -1,
    },
    textContainer: {
        flex: 1,
        paddingLeft: 5,
    },
    reviewButton: {
        backgroundColor: '#2563eb', 
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#dc3545', 
        textAlign: 'center',
    },
});
