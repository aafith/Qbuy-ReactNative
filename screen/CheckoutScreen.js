import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, StatusBar, Modal, FlatList } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, collection, query, where, getDocs, increment } from 'firebase/firestore';

// Icons;
import AntDesign from '@expo/vector-icons/AntDesign';


export default function CheckoutScreen({ navigation }) {
    const route = useRoute();
    const { selectedStoreId, selectedProductPrice, quantity, productId } = route.params;
    const [deliveryOption, setDeliveryOption] = useState('pick');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [error, setError] = useState('');
    const [focusedInput, setFocusedInput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [savedPayments, setSavedPayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');

    const userId = auth.currentUser.uid;

    const totalAmount = selectedProductPrice * quantity;

    useFocusEffect(
        React.useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            StatusBar.setBackgroundColor('#fff');
        }, [])
    );

    useEffect(() => {
        fetchSavedPayments();
    }, []);

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
 

    const fetchSavedPayments = async () => {
        try {
            const userId = auth.currentUser.uid;
            const paymentQuery = query(collection(db, 'payments'), where('userId', '==', userId));

            const querySnapshot = await getDocs(paymentQuery);

            const payments = [];
            querySnapshot.forEach((doc) => {
                payments.push(doc.data());
            });

            setSavedPayments(payments);
        } catch (error) {
            console.error('Error fetching payment details:', error);
        }
    };

    const validateInputs = () => {
        if (!customerName) {
            setError('Customer name is required');
            return false;
        }
        if (!address) {
            setError('Address is required');
            return false;
        }
        if (!city) {
            setError('City is required');
            return false;
        }
        if (!state) {
            setError('State is required');
            return false;
        }
        if (!zipCode) {
            setError('Zip Code is required');
            return false;
        }
        if (!phoneNumber) {
            setError('Phone Number is required');
            return false;
        }
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            setError('Invalid email address');
            return false;
        }
        return true;
    };

    const handleCheckout = async () => {
        if (!validateInputs()) {
            return;
        }
    
        setLoading(true);
        setError(''); // Clear previous errors
    
        try {
            const userId = auth.currentUser.uid;
            const orderData = {
                userId,
                customerName,
                address,
                city,
                state,
                zipCode,
                phoneNumber,
                email,
                storeId: selectedStoreId,
                deliveryOption,
                totalAmount,
                paymentMethod,
                quantity,
                productId,
                status: 'Order Placed',
                orderPlacedDate: new Date(),
                hasReviewed: false,
            };
    
            // If card is selected, but no payment method is saved
            if (paymentMethod === 'card' && !selectedPayment) {
                setError('Please select a saved payment method or add a new one.');
                setLoading(false);
                return;
            }
    
            // If card payment selected, proceed to payment screen if necessary
            if (paymentMethod === 'card') {
                if (selectedPayment) {
                    // Place order directly
                    const orderRef = doc(db, 'orders', `${userId}_${new Date().getTime()}`);
                    await setDoc(orderRef, orderData);
                    setSuccessModalVisible(true);
                } else {
                    // Navigate to payment screen
                    navigation.navigate('AddCardScreen', {
                        totalAmount,
                        productId,
                        selectedStoreId,
                        customerName,
                        address,
                        city,
                        state,
                        zipCode,
                        phoneNumber,
                        email,
                        deliveryOption,
                        quantity,
                        userId,
                    });
                }
            } else {
                // Place order for cash on delivery
                const orderRef = doc(db, 'orders', `${userId}_${new Date().getTime()}`);
                await setDoc(orderRef, orderData);
                setSuccessModalVisible(true);
            }
    
            // Update the totalStocks in the product collection
            const productRef = doc(db, 'products', productId);
            await setDoc(productRef, { totalStocks: increment(-quantity) }, { merge: true });
    
            setLoading(false);
        } catch (error) {
            setLoading(false);
            setError('An error occurred while placing the order.');
            console.error('Order placement error:', error);
            setErrorModalVisible(true);
        }
    };
    

    const hideSuccessModal = () => {
        navigation.navigate('Tabs', { screen: 'Home' });
        setSuccessModalVisible(false);
    };

    const hideErrorModal = () => {
        setErrorModalVisible(false);
    };

    const selectPaymentMethod = (payment) => {
        setSelectedPayment(payment);
        setIsModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Customer Name */}
                <View style={styles.InputSection}>
                    <Text style={styles.sectionTitle}>Name</Text>
                    <View style={[styles.inputContainer, focusedInput === 'customerName' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'customerName' && styles.focusedInput]}
                            placeholder="Enter your name"
                            placeholderTextColor="#8c8c8c"
                            value={customerName}
                            onChangeText={setCustomerName}
                            onFocus={() => setFocusedInput('customerName')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* Address */}
                <View style={styles.InputSection}>
                    <Text style={styles.sectionTitle}>Address</Text>
                    <View style={[styles.inputContainer, focusedInput === 'address' && styles.focusedInput]}>

                        <TextInput
                            style={[styles.input, focusedInput === 'address' && styles.focusedInput]}
                            placeholder="Enter your address"
                            placeholderTextColor="#8c8c8c"
                            value={address}
                            onChangeText={setAddress}
                            onFocus={() => setFocusedInput('address')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* City */}
                <View style={styles.InputSection}>
                    <Text style={styles.sectionTitle}>City</Text>
                    <View style={[styles.inputContainer, focusedInput === 'city' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'city' && styles.focusedInput]}
                            placeholder="Enter your city"
                            placeholderTextColor="#8c8c8c"
                            value={city}
                            onChangeText={setCity}
                            onFocus={() => setFocusedInput('city')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* State */}
                <View style={styles.InputSection}>
                    <Text style={styles.sectionTitle}>State</Text>
                    <View style={[styles.inputContainer, focusedInput === 'state' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'state' && styles.focusedInput]}
                            placeholder="Enter your state"
                            placeholderTextColor="#8c8c8c"
                            value={state}
                            onChangeText={setState}
                            onFocus={() => setFocusedInput('state')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* Zip Code */}
                <View style={styles.InputSection}>
                    <Text style={styles.sectionTitle}>Zip Code</Text>
                    <View style={[styles.inputContainer, focusedInput === 'zipCode' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'zipCode' && styles.focusedInput]}
                            placeholder="Enter your zip code"
                            placeholderTextColor="#8c8c8c"
                            keyboardType="numeric"
                            value={zipCode}
                            onChangeText={setZipCode}
                            onFocus={() => setFocusedInput('zipCode')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* Phone Number */}
                <View style={styles.InputSection}>
                    <Text style={styles.sectionTitle}>Phone Number</Text>
                    <View style={[styles.inputContainer, focusedInput === 'phoneNumber' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'phoneNumber' && styles.focusedInput]}
                            placeholder="Enter your phone number"
                            placeholderTextColor="#8c8c8c"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            onFocus={() => setFocusedInput('phoneNumber')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* Email (Optional) */}
                <View style={styles.InputSection}>
                    <Text style={styles.sectionTitle}>Email (Optional)</Text>
                    <View style={[styles.inputContainer, focusedInput === 'email' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'email' && styles.focusedInput]}
                            placeholder="Enter your email (optional)"
                            placeholderTextColor="#8c8c8c"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            onFocus={() => setFocusedInput('email')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                <Text style={styles.label}>Delivery Option</Text>
                <View style={styles.optionContainer}>
                    <TouchableOpacity
                        style={[styles.optionButton, deliveryOption === 'pick' && styles.selectedOption]}
                        onPress={() => setDeliveryOption('pick')}
                    >
                        <Text style={[styles.optionText, deliveryOption === 'pick' && styles.selectedOptionText]}>
                            Store Pickup
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.optionButton, deliveryOption === 'home' && styles.selectedOption]}
                        onPress={() => setDeliveryOption('home')}
                    >
                        <Text style={[styles.optionText, deliveryOption === 'home' && styles.selectedOptionText]}>
                            Home delivery
                        </Text>
                    </TouchableOpacity>
                </View>

                {deliveryOption === 'home' && (
                    <>
                        <Text style={styles.label}>Payment Method</Text>
                        <View style={styles.optionContainer}>
                            <TouchableOpacity
                                style={[styles.optionButton, paymentMethod === 'cash' && styles.selectedOption]}
                                onPress={() => setPaymentMethod('cash')}
                            >
                                <Text style={[styles.optionText, paymentMethod === 'cash' && styles.selectedOptionText]}>
                                    Cash on Delivery
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionButton, paymentMethod === 'card' && styles.selectedOption]}
                                onPress={() => {
                                    setPaymentMethod('card');
                                    if (savedPayments.length > 0) {
                                        setIsModalVisible(true); // Show modal if saved payments exist
                                    }
                                }}
                            >
                                <Text style={[styles.optionText, paymentMethod === 'card' && styles.selectedOptionText]}>
                                    {paymentMethod === 'card' && selectedPayment
                                        ? `Visa****${selectedPayment.cardNumber.slice(-4)}`
                                        : 'Visa/MasterCard'}
                                </Text>


                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* Display Saved Payment Methods Modal */}
                <Modal visible={isModalVisible} transparent={true} animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Saved Payment Methods</Text>
                            <FlatList
                                data={savedPayments}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.paymentItem}
                                        onPress={() => selectPaymentMethod(item)}
                                    >
                                        <Text style={styles.paymentText}>Visa {item.cardNumber.slice(0, 4)} **** **** {item.cardNumber.slice(-4)}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => {
                                        navigation.navigate('AddCardScreen', {
                                            totalAmount,
                                            productId,
                                            selectedStoreId,
                                            address,
                                            deliveryOption,
                                            quantity,
                                            userId,
                                        });
                                    }}
                                >
                                    <Text style={styles.addButtonText}>New Add Card</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setIsModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </View>
                </Modal>

                <View style={styles.checkoutContainer}>
                    <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout} disabled={loading}>
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.checkoutText}>PAY NOW ({formattedPrice(totalAmount)})</Text>}
                    </TouchableOpacity>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Modal visible={successModalVisible} transparent={true} animationType="fade">
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContent}>
                            <View style={styles.iconContainer}>
                                <View style={styles.outerCircle}>
                                    <View style={styles.innerCircle}>
                                        <AntDesign name="check" size={30} color="#FFFFFF" />
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.modalTitle}>Success</Text>
                            <Text style={styles.modalMessage}>Order placed successfully!</Text>
                            <TouchableOpacity onPress={hideSuccessModal} style={styles.successButton}>
                                <Text style={styles.successButtonText}>Continue Shopping</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Error Modal */}
                <Modal visible={errorModalVisible} transparent={true} animationType="fade">
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContent}>
                            <View style={styles.iconContainer}>
                                <View style={styles.outerCircle}>
                                    <View style={styles.innerCircle}>
                                        <AntDesign name="close" size={30} color="#FFFFFF" />
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.modalTitle}>Error</Text>
                            <Text style={styles.modalMessage}>Something went wrong, please try again.</Text>
                            <TouchableOpacity onPress={hideErrorModal} style={styles.errorButton}>
                                <Text style={styles.errorButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#ffffff',
    },
    InputSection: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 6,
    },
    focusedInput: {
        borderColor: '#bf0141',
        paddingVertical: 6,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 9,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    optionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    optionButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    selectedOption: {
        borderColor: '#bf0141',
        backgroundColor: '#ffeff2',
    },
    optionText: {
        fontSize: 16,
    },
    selectedOptionText: {
        color: '#bf0141',
    },
    summary: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 16,
    },
    checkoutButton: {
        backgroundColor: '#bf0141',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    checkoutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    error: {
        color: 'red',
        fontSize: 14,
        marginVertical: 8,
        textAlign: 'center',
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    outerCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e0f7ea',
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#00c853',
        justifyContent: 'center',
        alignItems: 'center',
    },
    erroriconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    errorouterCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#ffdddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorinnerCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
    },
    Button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderColor: '#00c853',
        borderWidth: 1,
    },
    ButtonText: {
        color: '#00c853',
        fontSize: 16,
        fontWeight: 'bold',
    },
    successButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderColor: '#00c853',
        borderWidth: 1,
    },
    successButtonText: {
        color: '#00c853',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderColor: 'red',
        borderWidth: 1,
    },
    errorButtonText: {
        color: 'red',
        fontSize: 16,
        fontWeight: 'bold',
    },
    paymentItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    paymentText: {
        fontSize: 16,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderColor: 'red',
        borderWidth: 1,
        marginTop: 20,
    },
    cancelButtonText: {
        color: 'red',
        fontSize: 16,
        fontWeight: 'bold',
    },
    addButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderColor: '#00c853',
        borderWidth: 1,
        marginTop: 20,
    },
    addButtonText: {
        color: '#00c853',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    checkoutContainer: {
        marginHorizontal: 20,
        marginVertical: 40,
    },
});
