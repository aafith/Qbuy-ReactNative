import { Text, View, StatusBar, TouchableOpacity, StyleSheet, Alert } from "react-native";
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useState, useEffect } from "react";
import { auth } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native-safe-area-context";

export default function Settings({navigation}) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsLoggedIn(true);
            }
        });
    }, []);
    
    // Login
    const handleLogin = () => { navigation.navigate('Login');};

    const handleLogout = async () => {
        try {
            await AsyncStorage.clear();
            await signOut(auth);
            setIsLoggedIn(false);
            Alert.alert('Success', 'Logged out successfully.', [
                { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Settings' }] }) }
            ]);
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Error', 'Failed to log out.');
        }
    };

    // Navigation
    const navigateToEditProfile = () => navigation.navigate('EditProfile');
    const navigateToOrder = () => navigation.navigate('Order');
    const navigateToFavorite = () => navigation.navigate('Favorite');
    const navigateToMessage = () => navigation.navigate('Chat');
    const navigateToMembership = () => navigation.navigate('Membership');
    const navigateToPaymentMethod = () => navigation.navigate('PaymentMethod');
    const navigateToHelpSupport = () => navigation.navigate('HelpSupport');


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <Text style={styles.title}>Settings</Text>
            <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={navigateToEditProfile}>
                    <AntDesign name="user" size={24} style={styles.menuIcon} />
                    <Text style={styles.menuText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={navigateToOrder}>
                    <Feather name="box" size={24} style={styles.menuIcon} />
                    <Text style={styles.menuText}>Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={navigateToFavorite}>
                    <AntDesign name="hearto" size={24} style={styles.menuIcon} />
                    <Text style={styles.menuText}>My Favorite</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={navigateToMessage}>
                    <Ionicons name="chatbox-ellipses-outline" size={24} style={styles.menuIcon} />
                    <Text style={styles.menuText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={navigateToMembership}>
                    <AntDesign name="idcard" size={24} style={styles.menuIcon} />
                    <Text style={styles.menuText}>Membership</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={navigateToPaymentMethod}>
                    <AntDesign name="creditcard" size={24} style={styles.menuIcon} />
                    <Text style={styles.menuText}>Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={navigateToHelpSupport}>
                    <Feather name="help-circle" size={24} style={styles.menuIcon} />
                    <Text style={styles.menuText}>Help and Support</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footerContainer}>
                {isLoggedIn ? (
                    <TouchableOpacity style={styles.loginItem} onPress={handleLogout}>
                        <AntDesign name="logout" size={24} style={styles.loginIcon} />
                        <Text style={styles.loginText}>Log Out</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.loginItem} onPress={handleLogin}>
                        <AntDesign name="login" size={24} style={styles.loginIcon} />
                        <Text style={styles.loginText}>Log In</Text>
                    </TouchableOpacity>
                )}
                
                <Text style={styles.footer}>Build By: AFNAN ( Sri Lanka 🇱🇰 )</Text>
                <Text style={styles.footer}>App Version: 1.0.0</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    menuContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    menuItem: {
        backgroundColor: '#f9f9f9',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
    },
    menuIcon: {
        marginRight: 16,
        color: '#bf0141',
    },
    menuText: {
        fontSize: 16,
        color: '#000',
    },
    footerContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    footer: {
        fontSize: 14,
        color: '#888',
    },
    loginItem: {
        backgroundColor: '#bf0141',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 20,
        justifyContent: 'center',
        width: '60%',
    },
    loginIcon: {
        marginRight: 16,
        color: '#fff',
    },
    loginText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});