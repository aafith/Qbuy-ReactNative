import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Animated, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native'; 
import { db, auth } from '../firebaseConfig'; // Import Firebase
import { collection, addDoc } from 'firebase/firestore'; // Import Firestore methods

import MasterCardIcon from '../assets/Cart.png';


const AddCardScreen = () => {
    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [cvv, setCvv] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveCard, setSaveCard] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0)); // Initial opacity is 0
    const navigation = useNavigation(); // Access navigation

    const months = [
        { label: '01', value: '01' },
        { label: '02', value: '02' },
        { label: '03', value: '03' },
        { label: '04', value: '04' },
        { label: '05', value: '05' },
        { label: '06', value: '06' },
        { label: '07', value: '07' },
        { label: '08', value: '08' },
        { label: '09', value: '09' },
        { label: '10', value: '10' },
        { label: '11', value: '11' },
        { label: '12', value: '12' },
    ];

    const years = [
        { label: '2023', value: '2023' },
        { label: '2024', value: '2024' },
        { label: '2025', value: '2025' },
        { label: '2026', value: '2026' },
        { label: '2027', value: '2027' },
        { label: '2028', value: '2028' },
    ];

    useEffect(() => {
        // Animate the card view whenever the card details change
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [cardNumber, cardName, month, year]);

    const formatCardNumber = (number) => {
        // Remove non-numeric characters
        const cleaned = ('' + number).replace(/\D/g, '');
        // Format the number with spaces every 4 digits
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || '';
        return formatted;
    };

    const handleCardNumberChange = (text) => {
        setCardNumber(formatCardNumber(text));
    };

    const handlePay = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser; // Get the current logged-in user
            if (user) {
                const userId = user.uid; // Extract the user ID

                // Save payment details to Firebase only if "Save Card Information" is checked
                await addDoc(collection(db, 'payments'), {
                    cardNumber,
                    cardName,
                    month,
                    year,
                    cvv,
                    userId,  // Save the user ID
                });
                alert('Payment details Add successfully');

                // After the success of payment
                navigation.goBack(); // Navigate back to home screen after success
            } else {
                alert('User not logged in.');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Payment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderCheckbox = (isChecked, onToggle, label) => (
        <TouchableOpacity style={styles.checkboxContainer} onPress={onToggle}>
            <Icon name={isChecked ? 'check-square' : 'square-o'} size={20} color="#05f228" />
            <Text style={styles.checkboxLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.card}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.bankName}>XXXXXX Bank</Text>
                            <Image source={MasterCardIcon} style={{ width: 84, height: 51 }} />
                        </View>
                        <Text style={styles.cardNumber}>
                            {cardNumber ? `${cardNumber.slice(0, 4)} **** **** ${cardNumber.slice(-4)}` : '**** **** **** ****'}
                        </Text>
                        <View style={styles.cardFooter}>
                            <Text style={styles.cardHolder}>
                                {cardName || 'CARD HOLDER'}
                            </Text>
                            <Text style={styles.cardExpiry}>
                                {month && year ? `${month}/${year}` : 'MM/YY'}
                            </Text>
                        </View>
                    </Animated.View>
                </View>
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Card Number</Text>
                    <View style={[styles.inputContainer]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Card Number"
                            placeholderTextColor="#8c8c8c"
                            value={cardNumber}
                            onChangeText={handleCardNumberChange}
                            maxLength={19} // Accommodates spaces (16 digits + 3 spaces)
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Card Holder Name</Text>
                    <View style={[styles.inputContainer]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Card Holder Name"
                            placeholderTextColor="#8c8c8c"
                            value={cardName}
                            onChangeText={setCardName}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.smallInputWrapper}>
                        <Text style={styles.label}>Month</Text>
                        <View style={[styles.inputContainer, { marginRight: 10 }]}>
                            <Picker
                                selectedValue={month}
                                onValueChange={(itemValue) => setMonth(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Select Month" value="" />
                                {months.map((month) => {
                                    const { label, value } = month;
                                    return <Picker.Item key={value} label={label} value={value} />;
                                })}

                            </Picker>
                        </View>
                    </View>

                    <View style={styles.smallInputWrapper}>
                        <Text style={styles.label}>Year</Text>
                        <View style={[styles.inputContainer]}>
                            <Picker
                                selectedValue={year}
                                onValueChange={(itemValue) => setYear(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Select Year" value="" />
                                {years.map((year) => {
                                    const { label, value } = year;
                                    return <Picker.Item key={value} label={label} value={value} />;
                                })}
                            </Picker>
                        </View>
                    </View>
                </View>

                <View style={styles.checkboxRow}>
                    <View style={[styles.smallInputWrapper]}>
                        <Text style={styles.label}>CVV</Text>
                        <View style={[styles.inputContainer]}>
                            <TextInput
                                style={styles.input}
                                placeholder="CVV"
                                placeholderTextColor="#8c8c8c"
                                value={cvv}
                                onChangeText={setCvv}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.button, styles.payButton]}
                    onPress={handlePay}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Add Card</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    scrollContainer: {
        padding: 20,
        justifyContent: 'center',
    },
    inputWrapper: {
        marginBottom: 20,
    },
    smallInputWrapper: {
        flex: 1,
        marginBottom: 20,
    },
    checkboxRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkboxLabel: {
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
    },
    label: {
        fontSize: 16,
        color: '#000',
        marginBottom: 8,
        fontWeight: '500',
    },
    inputContainer: {
        backgroundColor: '#f4f5f9',
        borderRadius: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#f4f5f9',
        height: 55,
    },
    focusedInput: {
        borderColor: '#05f228',
    },
    input: {
        flex: 1,
        height: 55,
    },
    picker: {
        flex: 1,
        height: 55,
        color: '#000',
    },
    card: {
        backgroundColor: '#010104',
        padding: 20,
        borderRadius: 12,
        marginBottom: 30,
        minHeight: 200,
        justifyContent: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    bankName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardNumber: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    cardHolder: {
        color: 'white',
        fontSize: 16,
    },
    cardExpiry: {
        color: 'white',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    payButton: {
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
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AddCardScreen;
