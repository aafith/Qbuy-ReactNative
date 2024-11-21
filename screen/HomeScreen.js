import { ActivityIndicator, Dimensions, ScrollView, StatusBar, Text, View } from "react-native";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { storage, db } from '../firebaseConfig'; // Import the storage and db from firebaseConfig.js
import { collection, getDocs } from "firebase/firestore"; // Import Firestore functions
import React, { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, TouchableOpacity } from "react-native";
import Feather from '@expo/vector-icons/Feather';
import Swiper from 'react-native-swiper';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get('window');

export default function Home({ navigation }) {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'home', title: 'HOME' },
        { key: 'category', title: 'CATEGORY' },
    ]);
    const [storeProducts, setStoreProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState('');


    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            StatusBar.setBackgroundColor('#ffffff');
            fetchData();
        }, [])
    );

    // Fetch data from Firestore
    const fetchData = async () => {
        try {
            // Fetch categories
            const categoriesRef = collection(db, 'categories');
            const categoriesSnapshot = await getDocs(categoriesRef);
            const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch products
            const productsRef = collection(db, 'products');
            const productsSnapshot = await getDocs(productsRef);
            let productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort products by creation date (assuming 'createdAt' is a Timestamp field)
            productsData = productsData.sort((a, b) => {
                const aCreatedAt = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const bCreatedAt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return bCreatedAt - aCreatedAt;
            });

            // Count products per category
            const categoryCounts = categoriesData.map(category => {
                const count = productsData.filter(product => product.category === category.name).length;
                return { ...category, count };
            });

            setCategories(categoryCounts);
            setStoreProducts(productsData);
        } catch (error) {
            setError('Failed to fetch data');
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };


    // Fetch images from Firebase Storage
    const fetchImages = async () => {
        try {
            const listRef = ref(storage, 'images');
            const imageRefs = await listAll(listRef);
            const urls = await Promise.all(
                imageRefs.items.map(item => getDownloadURL(ref(storage, item.fullPath)))
            );
            const imageData = urls.map((url, index) => ({ id: index.toString(), uri: url }));
            setImages(imageData);
        } catch (error) {
            console.error('Error fetching images from Firebase Storage: ', error);
        } finally {
            setLoading(false);
        }
    };

    // Render category card
    const renderCategoryCard = ({ item }) => (
        <View key={item.id} style={styles.categoryCard}>
            <Image source={{ uri: item.image }} style={styles.categoryImage} />
            <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={styles.categoryCount}>{item.count} Product</Text>
            </View>
        </View>
    );

    // Render categories
    const renderCategories = () => {
        return (
            <View style={styles.categoryCount}>
                {categories.map(category => renderCategoryCard({ item: category }))}
            </View>
        );
    };

    // Fetch images on component mount
    useEffect(() => {
        fetchImages();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#bf0141" />
            </View>
        );
    }

    // TabView routes (Home)
    const HomeRoute = () => (

        // Swiper component
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                <Swiper
                    style={styles.wrapper}
                    autoplay={true}
                    autoplayTimeout={4}
                    showsPagination={true}
                    dotStyle={styles.dot}
                    activeDotStyle={styles.activeDot}
                >
                    {images.map((image) => {
                        const { id, uri } = image;
                        return (
                            <View key={id} style={styles.slide}>
                                <Image source={{ uri }} style={styles.image} />
                            </View>
                        );
                    })}
                </Swiper>

                {/* New Products */}
                <View style={[styles.sectionHeader, { paddingHorizontal: 16, paddingTop: 20 }]}>
                    <Text style={styles.sectionTitle}>New Arrival & Trending 🔥</Text>
                </View>

                {/* Products */}
                <View style={{ flex: 1, padding: 16 }}>
                    {renderProducts()}
                </View>
            </ScrollView>
        </View>
    );

    // TabView routes (Category)
    const CategoryRoute = () => (
        <View style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 32 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                {renderCategories()}
            </ScrollView>
        </View>
    );

    const renderScene = SceneMap({
        home: HomeRoute,
        category: CategoryRoute,
    });

    // Render products
    const renderProducts = () => {
        const rows = [];
        for (let i = 0; i < storeProducts.length; i += 2) {
            const rowProducts = storeProducts.slice(i, i + 2);
            rows.push(
                <View key={`row-${i}`} style={styles.row}>
                    {rowProducts.map(item => (
                        <View key={item.id} style={styles.productItem}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('ProductDetailsScreen', { productId: item.id })}
                                disabled={item.totalStocks === 0 } // Disable the button if out of stock
                            >
                                <View style={styles.productImageWrapper}>
                                    <Image
                                        source={{ uri: item.productImageURLs[0] }}
                                        style={[styles.productImage, item.totalStocks === 0 && styles.outOfStockImage]}
                                    />
                                    {item.totalStocks === 0 && (
                                        <View style={styles.outOfStockOverlay}>
                                            <Text style={styles.outOfStockText}>Out of Stock</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.productName}>{item.productName}</Text>
                            <Text style={styles.productPrice}>{formattedPrice(item.productPrice)}</Text>
                        </View>
                    ))}
                </View>
            );
        }
        return rows;
    };
    

    // formatted price
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



    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Image source={require('../assets/icon.png')} style={styles.logo} />
                    <Text style={styles.title}>Qbuy</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
                    <Feather name="shopping-cart" size={24} color="black" />
                </TouchableOpacity>
            </View>

            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: Dimensions.get('window').width }}
                style={{ backgroundColor: '#fff' }}
                tabBarPosition="top"
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        indicatorStyle={{ backgroundColor: '#bf0141' }}
                        style={{ backgroundColor: 'transparent'}}
                        activeColor="#bf0141"
                        inactiveColor="black"
                    />
                )}
            />
        {error && <Text>{error}</Text>}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingVertical: 16,
    },
    header: {
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 10,
        marginRight: 8,
    },
    title: {
        fontSize: 23,
        fontWeight: 'bold',
    },

    // Swiper styles
    wrapper: {
        paddingTop: 20,
        height: 200,
    },
    slide: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    image: {
        width: width - 32,
        height: 170,
        resizeMode: 'cover',
        borderRadius: 10,
    },
    dot: {
        backgroundColor: '#000',
        width: 8,
        height: 8,
        borderRadius: 4,
        margin: 3,
        marginBottom: -60,
    },
    activeDot: {
        backgroundColor: '#bf0141',
        width: 8,
        height: 8,
        borderRadius: 4,
        margin: 3,
        marginBottom: -60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },

    // tabView styles
    scene: {
        flex: 1,
    },

    // Category styles
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        padding: 16,
        borderRadius: 10,
    },
    categoryImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
    },
    categoryInfo: {
        marginLeft: 16,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    categoryCount: {
        fontSize: 14,
        color: 'gray',
    },

    // Section styles
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },

    // Product styles
    productList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    productItem: {
        width: '48%',
        marginBottom: 16,
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        opacity: 1,
    },
    outOfStockImage: {
        opacity: 0.5, // Decrease opacity when out of stock
    },
    outOfStockOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(225, 225, 225, 0.5)',
        borderRadius: 10,
    },
    productImageContainer: {
        position: 'relative',
    },
    outOfStockText: {
        color: 'red',
        fontSize: 18,
        borderWidth: 2,
        borderColor: 'red',
        padding: 4,
        borderRadius: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 8,
    },
    productPrice: {
        fontSize: 14,
        color: 'gray',
    },

});