import { Text, View, StatusBar, TouchableOpacity, Image, StyleSheet, TextInput, FlatList } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Search({ navigation }) {
    const [storeProducts, setStoreProducts] = useState([]);
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedInput, setFocusedInput] = useState(null);

    // Load history
    useFocusEffect(
        React.useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            StatusBar.setBackgroundColor('#fff');
            loadHistory();
            fetchStoreData();
        }, [])
    );

    // Fetch store data
    const fetchStoreData = async () => {
        try {
            setLoading(true);
            const productsRef = collection(db, 'products');
            const querySnapshot = await getDocs(productsRef);
            const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStoreProducts(products);
        } catch (error) {
            setError('Failed to fetch products');
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    // format price
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

    // Render products
    const renderProducts = ({ item }) => (
        <View style={styles.productItem}>
            <TouchableOpacity onPress={() => navigateToProductDetails(item)}>
                <Image source={{ uri: item.productImageURLs[0] }} style={styles.productImage} />
            </TouchableOpacity>
            <Text style={styles.productName}>{item.productName}</Text>
            <Text style={styles.productPrice}>{formattedPrice(item.productPrice)}</Text>
        </View>
    );

    // Navigate to product details
    const navigateToProductDetails = (item) => {
        saveHistory(query);
        navigation.navigate('ProductDetailsScreen', { productId: item.id });
    };

    // Handle input change
    const handleInputChange = (text) => {
        setQuery(text);
        if (text.length > 0) {
            const filteredSuggestions = storeProducts
                .filter((product) => product.productName.toLowerCase().includes(text.toLowerCase()))
                .map((product) => product.productName);
            setSuggestions(filteredSuggestions);
        } else {
            setSuggestions([]);
        }
    };

    const handleSearch = (searchTerm) => {
        setQuery(searchTerm);
        saveHistory(searchTerm);
        setSuggestions([]);
    };

    // Save history
    const saveHistory = async (searchTerm) => {
        try {
            let newHistory = [...history];
            if (!newHistory.includes(searchTerm)) {
                newHistory = [searchTerm, ...newHistory];
                if (newHistory.length > 5) newHistory.pop();
                setHistory(newHistory);
                await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
            }
        } catch (error) {
            console.error('Failed to save history', error);
        }
    };

    // Load history
    const loadHistory = async () => {
        try {
            const historyData = await AsyncStorage.getItem('searchHistory');
            if (historyData !== null) {
                setHistory(JSON.parse(historyData));
            }
        } catch (error) {
            console.error('Failed to load history', error);
        }
    };

    // Clear history
    const handleClearHistory = async () => {
        try {
            await AsyncStorage.removeItem('searchHistory');
            setHistory([]);
        } catch (error) {
            console.error('Failed to clear history', error);
        }
    };

    // Delete history item
    const handleDeleteHistoryItem = async (item) => {
        try {
            const newHistory = history.filter(historyItem => historyItem !== item);
            setHistory(newHistory);
            await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
        } catch (error) {
            console.error('Failed to delete history item', error);
        }
    };

    // Filter products
    const filteredProducts = storeProducts.filter(product => product.productName.toLowerCase().includes(query.toLowerCase()));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 16 }}>

            {/* Search bar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
                    <AntDesign name="arrowleft" size={24} color="black" />
                </TouchableOpacity>
                <View style={[styles.searchBarContainer, focusedInput === 'search' && styles.focusedInput]}>
                    <View style={styles.iconArea}>
                        <AntDesign name="search1" size={20} color={"#fff"} style={styles.searchIcon} />
                    </View>
                    <TextInput
                        style={[styles.searchInput, focusedInput === 'search' && styles.focusedInput]}
                        value={query}
                        onChangeText={handleInputChange}
                        placeholder="Search products"
                        autoFocus
                        onFocus={() => setFocusedInput('search')}
                        onBlur={() => setFocusedInput(null)}
                        onSubmitEditing={() => handleSearch(query)}
                        selectionColor="#ff99ad"
                    />
                </View>
            </View>

            {/* Search suggestions */}
            {query === '' && history.length > 0 && (
                <View style={styles.historyContainer}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>Last Search</Text>
                        <TouchableOpacity onPress={handleClearHistory} style={styles.clearHistoryIcon}>
                            <Text>Clear All</Text>
                            <Entypo name="erase" size={18} color="black" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={history}
                        renderItem={({ item }) => (
                            <View style={styles.historyItemContainer}>
                                <TouchableOpacity onPress={() => handleSearch(item)} style={styles.historyItem}>
                                    <Text style={styles.historyText}>{item}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteHistoryItem(item)} style={styles.clearHistoryItemIcon}>
                                    <AntDesign name="close" size={15} color="black" />
                                </TouchableOpacity>
                            </View>
                        )}
                        keyExtractor={(item) => item}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                    />
                </View>
            )}

            {/* Product list */}
            {query !== '' && (
                <View style={styles.productListContainer}>
                    <Text style={styles.sectionTitle}>Search Products</Text>
                    {filteredProducts.length > 0
                        ? (
                            <FlatList
                                data={filteredProducts}
                                renderItem={renderProducts}
                                keyExtractor={item => item.id.toString()}
                                numColumns={2} // This ensures two columns for products
                                contentContainerStyle={styles.productsContainer} // Add this for styling
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <View style={styles.noProductsContainer}>
                                <AntDesign name="frowno" size={90} color="#bf0141" style={styles.emoji} />
                                <Text style={styles.noProductsText}>Oops! No products found</Text>
                                <Text style={styles.noProductsSubText}>
                                    Try refreshing or check back later. We’ll have something amazing for you soon!
                                </Text>
                            </View>

                        )
                    }
                </View>
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '90%',
        paddingLeft: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingRight: 12,
        borderRadius: 8,
    },
    focusedInput: {
        borderColor: '#bf0141',
    },
    iconArea: {
        backgroundColor: '#bf0141',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    searchInput: {
        flex: 1,
        height: 42,
        paddingVertical: 0,
        paddingHorizontal: 0,
        fontSize: 16,
        color: '#333',
        marginLeft: 5,
    },
    backIcon: {
        marginRight: 12,
    },
    historyContainer: {
        marginTop: 20,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    clearHistoryIcon: {
        padding: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    historyItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    historyItem: {
        backgroundColor: '#eee',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    historyText: {
        fontSize: 14,
        color: '#333',
    },
    clearHistoryItemIcon: {
        marginLeft: 10,
    },

    // Product list styles
    productItem: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginHorizontal: 4,
    },
    productImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
    },
    productName: {
        fontSize: 15,
        fontWeight: 'bold',
        marginVertical: 4,
    },
    productPrice: {
        fontSize: 16,
        color: '#bf0141',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    productListContainer: {
        marginTop: 20,
    },
    productsContainer: {
        paddingTop: 10,
    },

    // No products found styles
    noProductsContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 20,
        paddingVertical: 40,
        borderRadius: 12,
    },
    emoji: {
        marginBottom: 20,
    },
    noProductsText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    noProductsSubText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
});

