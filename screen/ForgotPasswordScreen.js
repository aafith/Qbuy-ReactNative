import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';


// Icons
import Entypo from '@expo/vector-icons/Entypo';

export default function ForgotpasswordScreen() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Added loading state
    const [focusedInput, setFocusedInput] = useState(null);
    const navigation = useNavigation();

    useFocusEffect(
        React.useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            StatusBar.setBackgroundColor('#fff');
        }, [])
    );

    const handlePasswordReset = () => {
        setMessage('');
        setError('');
        setLoading(true); // Set loading to true

        // Validate email format
        if (!email || !/^[\w-.]+@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
            setError('Please enter a valid email address.');
            setLoading(false); // Set loading to false
            return;
        }

        sendPasswordResetEmail(auth, email)
            .then(() => {
                setMessage('Password reset email sent successfully.');
                setLoading(false); // Set loading to false
            })
            .catch((error) => {
                handleError(error.code);
                setLoading(false); // Set loading to false
            });
    };

    const handleError = (errorCode) => {
        switch (errorCode) {
            case 'auth/invalid-email':
                setError('Invalid email address.');
                break;
            case 'auth/user-not-found':
                setError('No user found with this email.');
                break;
            default:
                setError('Failed to send password reset email. Please try again.');
                console.error('Password reset error:', errorCode); // Log error to console
                break;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
                Enter your email to receive a password reset link.
            </Text>
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputContainer, focusedInput === 'email' && styles.focusedInput]}>
                    <Entypo name="mail"
                        size={20}
                        color={focusedInput === 'email' ? '#bf0141' : '#8c8c8c'}
                        style={styles.icon}
                    />
                    <TextInput
                        style={[styles.input, focusedInput === 'email' && styles.focusedInput]}
                        placeholder="Enter your Email"
                        placeholderTextColor="#8c8c8c"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                    />
                </View>
            </View>
            {message ? <Text style={styles.successText}>{message}</Text> : null}
            {error ? (
                <View style={styles.errorWrapper}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
            
                <>
                    <TouchableOpacity
                        style={[styles.button, styles.resetButton]}
                        onPress={handlePasswordReset}
                        activeOpacity={0.7}
                    >
                    {loading ? (
                     <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Send Reset Link</Text>
                    )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, styles.backButton]}
                        onPress={() => navigation.navigate('Login')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.BackbuttonText}>Back to Login</Text>
                    </TouchableOpacity>
                </>
            
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 60,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 25,
        fontWeight: '500',
        textAlign: 'left',
        width: '100%',
        color: '#000',
    },
    subtitle: {
        fontSize: 15,
        color: '#8c8c8c',
        textAlign: 'left',
        width: '100%',
        marginBottom: 30,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#000',
        marginBottom: 8,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#f4f5f9',
        borderRadius: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#f4f5f9',
    },
    focusedInput: {
        borderColor: '#bf0141',
    },
    input: {
        flex: 1,
        height: 55,
    },
    icon: {
        marginRight: 10,
    },
    resetButton: {
        width: '70%',
        padding: 14,
        marginTop: 30,
        marginBottom: 20,
        borderRadius: 12,
        justifyContent: 'center',
        backgroundColor: '#bf0141',
        alignItems: 'center',
        flexDirection: 'row',
        alignSelf: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    BackbuttonText: {
        fontSize: 14,
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        fontSize: 14,
    },
    successText: {
        color: 'green',
        marginBottom: 20,
        textAlign: 'center',
    },
    errorWrapper: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    loaderWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
    },
});
