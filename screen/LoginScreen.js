import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// Icons
import Entypo from '@expo/vector-icons/Entypo';
import AntDesign from '@expo/vector-icons/AntDesign';

export default function Login({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hidePassword, setHidePassword] = useState(true);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);

    useFocusEffect(
        React.useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            StatusBar.setBackgroundColor('#ffff');
        }, [])
    );

    // Login
    const handleLogin = () => {
        setError('');
        setLoading(true);
        if (!validateEmail(email)) {
            setError('Please enter a valid email address.');
            setLoading(false);
            return;
        }
        signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                await AsyncStorage.setItem('userId', user.uid); // Store user ID
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Tabs' }], // After successful login, navigate to Settings
                });
            })
            .catch((error) => {
                handleError(error.code);
                setLoading(false);
            });
    };

    // Validate email
    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setLoading(false);
        return re.test(email);
    };

    // Handle error
    const handleError = (errorCode) => {
        switch (errorCode) {
            case 'auth/invalid-email':
                setError('Invalid email address format.');
                break;
            case 'auth/user-disabled':
                setError('User account has been disabled.');
                break;
            case 'auth/wrong-password':
                setError('Incorrect password.');
                break;
            case 'auth/user-not-found':
                setError('User not found. Please register.');
                break;
            default:
                setError('Login failed. Please try again.');
                break;
        }
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setHidePassword(!hidePassword);
        setPasswordVisible(!passwordVisible);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Login Account</Text>
            <Text style={styles.subtitle}>Please login with your registered account</Text>
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
                        selectionColor="#ff99ad"
                    />
                </View>
            </View>
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, focusedInput === 'password' && styles.focusedInput]}>
                    <Entypo name="key"
                        size={20}
                        color={focusedInput === 'password' ? '#bf0141' : '#8c8c8c'}
                        style={styles.icon}
                    />
                    <TextInput
                        style={[styles.input, focusedInput === 'password' && styles.focusedInput]}
                        placeholder="Enter your Password"
                        placeholderTextColor="#8c8c8c"
                        secureTextEntry={hidePassword}
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                        selectionColor="#ff99ad"
                    />
                    <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                        {passwordVisible ? (
                            <AntDesign name="eye" size={24} color="#bf0141" />
                        ) : (
                            <AntDesign name="eyeo" size={24} color="#8c8c8c" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.forgotPassword}>Forgot your password?</Text>
                </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
                style={[styles.button, styles.loginButton]}
                onPress={handleLogin}
                activeOpacity={0.7}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Login in</Text>
                )}
            </TouchableOpacity>
            <View style={styles.registerContainer}>
                <Text>Don't have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={{ color: '#bf0141', fontWeight: 'bold' }}>Register Now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffff',
        paddingHorizontal: 16,
        paddingVertical: 60,
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
    eyeIcon: {
        position: 'absolute',
        right: 10,
    },
    forgotPasswordContainer: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    forgotPassword: {
        color: '#000',
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
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    errorText: {
        color: 'red',
        textAlign: 'center',
        fontSize: 14,
    },
    registerContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
    },
});