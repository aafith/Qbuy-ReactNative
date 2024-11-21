import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Icons
import Entypo from '@expo/vector-icons/Entypo';
import AntDesign from '@expo/vector-icons/AntDesign';

export default function Register() {
    const [name, setName] = useState('');
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [hidePassword, setHidePassword] = useState(true);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [hideConfirmPassword, setHideConfirmPassword] = useState(true);
    const [focusedInput, setFocusedInput] = useState(null);
    const [loading, setLoading] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            StatusBar.setBackgroundColor('#fff');
        }, [])
    );

    const handleSignUp = async () => {
        setError('');
        setLoading(true); // Show loading indicator

        // Check if any field is empty
        if (!name || !email || !password || !confirmPassword) {
            setError('All fields are required.');
            setLoading(false); // Hide loading indicator
            return;
        }

        // Validate email format
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address.');
            setLoading(false); // Hide loading indicator
            return;
        }

        // Validate password length and content
        if (password.length < 8 || !/[a-zA-Z]/.test(password)) {
            setError('Password must be at least 8 characters long and include at least one letter.');
            setLoading(false); // Hide loading indicator
            return;
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false); // Hide loading indicator
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Add user data to Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                name: name,
                email: email,
            });

            await AsyncStorage.clear();

            // Navigate to Login page with success message
            navigation.navigate('Login', { successMessage: 'Account created successfully. Please sign in.' });
        } catch (error) {
            console.error('Error signing up:', error);
            if (error.code === 'auth/email-already-in-use') {
                setError('Email is already in use.');
            } else if (error.code === 'auth/invalid-email') {
                setError('Invalid email address.');
            } else if (error.code === 'auth/weak-password') {
                setError('Weak password.');
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setLoading(false); // Hide loading indicator after the operation is complete
        }
    };

    const togglePasswordVisibility = () => {
        setHidePassword(!hidePassword);
        setPasswordVisible(!passwordVisible);
    };

    const toggleConfirmPasswordVisibility = () => {
        setHideConfirmPassword(!hideConfirmPassword);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start Shopping with create your account</Text>
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Name</Text>
                <View style={[styles.inputContainer, focusedInput === 'name' && styles.focusedInput]}>
                    <AntDesign name="user" size={20}
                        color={focusedInput === 'name' ? '#bf0141' : '#8c8c8c'}
                        style={styles.icon}
                    />
                    <TextInput
                        style={[styles.input, focusedInput === 'name' && styles.focusedInput]}
                        placeholder="Enter your Name"
                        placeholderTextColor="#8c8c8c"
                        autoCapitalize="words"
                        value={name}
                        onChangeText={setName}
                        onFocus={() => setFocusedInput('name')}
                        onBlur={() => setFocusedInput(null)}
                    />
                </View>
            </View>
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputContainer, focusedInput === 'email' && styles.focusedInput]}>
                    <Entypo name="mail" size={20}
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
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, focusedInput === 'password' && styles.focusedInput]}>
                    <Entypo name="key" size={20}
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
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.inputContainer, focusedInput === 'confirmPassword' && styles.focusedInput]}>
                    <Entypo name="key" size={20}
                        color={focusedInput === 'confirmPassword' ? '#bf0141' : '#8c8c8c'}
                        style={styles.icon}
                    />
                    <TextInput
                        style={[styles.input, focusedInput === 'confirmPassword' && styles.focusedInput]}
                        placeholder="Confirm Password"
                        placeholderTextColor="#8c8c8c"
                        secureTextEntry={hideConfirmPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        onFocus={() => setFocusedInput('confirmPassword')}
                        onBlur={() => setFocusedInput(null)}
                    />
                </View>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
                style={[styles.button, styles.signUpButton]}
                onPress={handleSignUp}
                activeOpacity={0.7}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Create Account</Text>
                )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
                <Text>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.login}>Login in</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
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
    eyeIcon: {
        position: 'absolute',
        right: 10,
    },
    signUpButton: {
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
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    login: {
        color: '#bf0141',
        marginLeft: 5,
        fontWeight: '600',
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        fontSize: 14,
    },
    loadingIndicator: {
        marginTop: 20,
    },
});
