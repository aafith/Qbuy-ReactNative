import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, Alert, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, getDocs, query, where, addDoc, deleteDoc } from "firebase/firestore";
import Swiper from 'react-native-swiper';
import { getAuth } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

// Icons
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';

export default function ProductDetailsScreen() {
    const [product, setProduct] = useState(null);
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [storeProducts, setStoreProducts] = useState([]);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImageVisible, setModalImageVisible] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [visibleCount, setVisibleCount] = useState(10)
    const [outOfStock, setOutOfStock] = useState(0);
    const route = useRoute();

    const navigation = useNavigation();
    const { productId } = route.params;
    const auth = getAuth();
    const user = auth.currentUser;

    const handleImagePress = (image) => {
        setSelectedImage(image);
        setModalImageVisible(true);
    };

    useEffect(() => {
        const checkIfSaved = async () => {
            if (user) {
                try {
                    const savedProductsRef = collection(db, 'savedProducts');
                    const queryRef = query(
                        savedProductsRef,
                        where('userId', '==', user.uid),
                        where('productId', '==', productId)
                    );
                    const querySnapshot = await getDocs(queryRef);
                    setIsSaved(!querySnapshot.empty);
                } catch (error) {
                    console.error('Error checking saved products:', error);
                }
            }
        };

        checkIfSaved();
    }, [productId, user]);

    useEffect(() => {
        const fetchProductData = async () => {
            try {
                // Fetch the product document by productId
                const docRef = doc(db, 'products', productId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const productData = docSnap.data();
                    
                    // Check if the product's totalStocks is 0
                    if (productData.totalStocks === 0) {
                        Alert.alert('Out of Stock', 'This product is out of stock. Try again later.');
                        navigation.goBack();
                        return; // Exit the function early if out of stock
                    }
    
                    // If the product is in stock, set the product data
                    setProduct(productData);
    
                    // Fetch store data
                    await fetchStoreData(productData.storeId);
                } else {
                    setError('Product not found');
                }
            } catch (error) {
                setError('Failed to fetch product details');
                console.error('Failed to fetch product details:', error);
            } finally {
                setLoading(false);
            }
        };
    
        fetchProductData();
    }, [productId]);
    

    const handleShowMore = () => {
        setVisibleCount((prevCount) => prevCount + 10); // Increase by 10 on each click
    };

    const fetchReviews = async () => {
        if (!productId) {
            console.warn('No productId provided. Skipping fetchReviews.');
            return; // Exit if productId is not defined
        }

        try {
            const reviewsRef = collection(db, 'reviews');
            const queryRef = query(reviewsRef, where('productId', '==', productId));
            const querySnapshot = await getDocs(queryRef);

            const reviewsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            setReviews(reviewsData.reverse());
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A'; // Return 'N/A' if timestamp is null or undefined

        // Check if the timestamp is a Firestore Timestamp object
        if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
            const date = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
            return date.toLocaleString(); // Format to local string
        }

        return 'Invalid Date'; // If it's not a valid timestamp
    };


    useEffect(() => {
        console.log('Product ID:', productId); // Log the productId to check its value
        if (productId) {
            fetchReviews();
        }
    }, [productId]);

    const fetchStoreData = async (storeId) => {
        try {
            const storeRef = doc(db, 'stores', storeId);
            const storeSnap = await getDoc(storeRef);
            if (storeSnap.exists()) {
                setStore(storeSnap.data());
            } else {
                setError('Store not found');
            }

            const productsRef = collection(db, 'products');
            const productsQuery = query(productsRef, where('storeId', '==', storeId));
            const productsSnapshot = await getDocs(productsQuery);
            const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStoreProducts(products);

        } catch (err) {
            setError('Failed to load store data');
            console.error('Error fetching store data:', err);
        }
    };

    const saveProduct = async () => {
        if (!user) {
            Alert.alert('Login', 'You need to be logged in to save products.');
            navigation.navigate('Login');
            return;
        }

        try {
            const savedProductsRef = collection(db, 'savedProducts');
            const queryRef = query(
                savedProductsRef,
                where('userId', '==', user.uid),
                where('productId', '==', productId)
            );
            const querySnapshot = await getDocs(queryRef);

            if (!querySnapshot.empty) {
                // Product is already saved, remove it
                querySnapshot.forEach(async (doc) => {
                    await deleteDoc(doc.ref);
                });
                setIsSaved(false); // Update the state to indicate the product is not saved
            } else {
                // Product is not saved, add it
                await addDoc(savedProductsRef, {
                    userId: user.uid,
                    productId: productId,
                    productName: product.productName,
                    productPrice: product.productPrice,
                    productImageURL: product.productImageURLs[0],
                    savedAt: new Date(),
                });
                setIsSaved(true); // Update the state to indicate the product is saved
            }
        } catch (error) {
            console.error('Error toggling save product:', error);
            Alert.alert('Error', 'Failed to toggle save product.');
        }
    };

    const addToCart = async () => {
        if (!user) {
            Alert.alert('Login', 'You need to be logged in to add items to your cart.');
            navigation.navigate('Login');
            return;
        }

        try {
            await addDoc(collection(db, 'carts'), {
                userId: user.uid,
                productId: productId,
                productName: product.productName,
                productPrice: product.productPrice,
                storeId: product.storeId,
                productImageURL: product.productImageURLs[0],
                quantity: 1 
            });
            setSuccessModalVisible(true);
        } catch (error) {
            console.error('Error adding product to cart:', error);
            setErrorModalVisible(true);
        }
    };

    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            StatusBar.setBackgroundColor('#fff');
        }, [])
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#bf0141" />
            </View>
        );
    }

    if (error) {
        return <Text>{error}</Text>;
    }

    if (!product || !store) {
        return null;
    }

    const showModal = () => {
        setIsModalVisible(true);
    };

    const hideModal = () => {
        setIsModalVisible(false);
    };

    const hideSuccessModal = () => {
        setSuccessModalVisible(false);
    };

    const hideErrorModal = () => {
        setErrorModalVisible(false);
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

    const toggleDescription = () => {
        setIsDescriptionExpanded(prevState => !prevState);
    };

    const increaseQuantity = () => {
        setQuantity(prevQuantity => prevQuantity + 1);
    };

    const decreaseQuantity = () => {
        if (quantity > 1) {
            setQuantity(prevQuantity => prevQuantity - 1);
        }
    };

    const descriptionText = isDescriptionExpanded ? product.productDescription : `${product.productDescription.substring(0, 100)}...`;
    const showReadMore = product.productDescription.length > 100;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <AntDesign name="arrowleft" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detail Product</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
                    <Feather name="shopping-cart" size={24} color="black" />
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.imageContainer}>
                    <Swiper
                        loop={false}
                        autoplay={false}
                        showsPagination={true}
                        paginationStyle={styles.pagination}
                        dotStyle={styles.dotStyle}
                        activeDotStyle={styles.activeDotStyle}>
                        {product.productImageURLs.map((url, index) => (
                            <Image key={index} source={{ uri: url }} style={styles.image} />
                        ))}
                    </Swiper>
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.productName}</Text>
                    </View>
                    <View style={styles.priceAndSave}>
                        <View style={styles.priceContainer}>
                            <Text style={styles.price}>{formattedPrice(product.productPrice)}</Text>
                            <View style={styles.getBidsContainer}>
                                <Text style={styles.getBidsText}>Get Bids</Text>
                                <Pressable onPress={() => setModalVisible(true)} style={styles.infoIcon}>
                                    <AntDesign name="infocirlceo" size={14} color="black" />
                                </Pressable>
                            </View>
                            <Modal
                                transparent={true}
                                visible={modalVisible}
                                onRequestClose={() => setModalVisible(false)}
                            >
                                <View style={styles.modalBackground}>
                                    <View style={styles.modalContent}>
                                        <Text style={styles.modalMessage}>Bid now to secure this product at the best price!</Text>
                                        <TouchableOpacity
                                            style={styles.Button}
                                            onPress={() => setModalVisible(false)}
                                        >
                                            <Text style={styles.ButtonText}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>
                        </View>
                        <TouchableOpacity onPress={saveProduct} style={styles.saveButton}>
                            {isSaved ? (
                                <AntDesign name="heart" size={24} color="red" />
                            ) : (
                                <AntDesign name="hearto" size={24} color="#bf0141" />
                            )}
                        </TouchableOpacity>
                    </View>
                    <View style={styles.productDescription}>
                        <TouchableOpacity onPress={toggleDescription}>
                            <Text style={styles.titleText}>
                                {isDescriptionExpanded ? 'Hide Description' : 'Show Description'}
                            </Text>
                        </TouchableOpacity>
                        {isDescriptionExpanded && ( // Show the description only if expanded
                            <Text style={styles.descriptionText}>{descriptionText}</Text>
                        )}
                    </View>
                    <View style={styles.headerContainer}>
                <Text style={styles.reviewTitleText}>Reviews</Text>
                <Text style={styles.totalCountText}> Total Reviews: ({reviews.length})</Text>
            </View>
                    {reviews.length > 0 ? (
                        reviews.slice(0, visibleCount).map((review) => (
                            <View key={review.id} style={styles.reviewItem}>
                                {/* Username and rating row */}
                                <View style={styles.userRatingRow}>
                                    {/* Username with first 3 letters followed by **** */}
                                    <Text style={styles.usernameText}>
                                        {review.userId.substring(0, 10)}****
                                    </Text>
                                    {/* Rating stars */}
                                    <View style={styles.ratingContainer}>
                                        {[...Array(5)].map((_, index) => (
                                            <FontAwesome
                                                key={index}
                                                name={index < review.rating ? 'star' : 'star-o'}
                                                size={20}
                                                color="#FFD700"
                                                style={styles.starIcon}
                                            />
                                        ))}
                                    </View>
                                </View>

                                {/* Comment and timestamp */}
                                <Text style={styles.reviewText}>{formatDate(review.createdAt)}</Text>
                                <Text style={styles.reviewText}>{review.reviewText}</Text>

                                {/* Display images if available */}
                                <View style={styles.imagesContainer}>
                                    {review.images && review.images.length > 0 ? (
                                        review.images.map((image, index) => (
                                            <TouchableOpacity key={index} onPress={() => handleImagePress(image)}>
                                                <Image
                                                    source={{ uri: image }}
                                                    style={styles.reviewImage}
                                                />
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={styles.noImageText}>No image available</Text>
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noReviewsText}>No reviews yet.</Text>
                    )}

                    {visibleCount < reviews.length && ( // Show "Show More" button if there are more reviews
                        <TouchableOpacity onPress={handleShowMore} style={styles.showMoreButton}>
                            <Text style={styles.showMoreText}>Show More</Text>
                        </TouchableOpacity>
                    )}

                    {/* Modal to display selected image */}
                    <Modal
                        visible={modalImageVisible}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => {
                            setModalImageVisible(false);
                            setSelectedImage(null);
                        }}
                    >
                        <View style={styles.imageModalContainer}>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setModalImageVisible(false)}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                            {selectedImage && (
                                <Image
                                    source={{ uri: selectedImage }}
                                    style={styles.fullImage}
                                />
                            )}
                        </View>
                    </Modal>

                </View>
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity onPress={addToCart} style={styles.addToCartButton}>
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ProductBids', { productId, productName: product.productName, storeId: product.storeId })} style={styles.buyNowButton}>
                    <Text style={styles.buyNowText}>Select Product</Text>
                </TouchableOpacity>
            </View>

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
                        <Text style={styles.modalTitle}>Added to Cart</Text>
                        <Text style={styles.modalMessage}>The item has been added to your cart.</Text>
                        <TouchableOpacity onPress={hideSuccessModal} style={styles.successButton}>
                            <Text style={styles.successButtonText}>Continue Shopping</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={errorModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        <View style={styles.erroriconContainer}>
                            <View style={styles.errorouterCircle}>
                                <View style={styles.errorinnerCircle}>
                                    <AntDesign name="close" size={30} color="#fff" />
                                </View>
                            </View>
                        </View>
                        <Text style={styles.modalTitle}>Error</Text>
                        <Text style={styles.modalMessage}>Failed to add item to cart. Please try again.</Text>
                        <TouchableOpacity onPress={hideErrorModal} style={styles.errorButton}>
                            <Text style={styles.errorButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    container: {
        flex: 1,
    },
    imageContainer: {
        height: 400,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        bottom: 10,
    },
    dotStyle: {
        backgroundColor: '#bf0141',
        opacity: 0.4,
    },
    activeDotStyle: {
        backgroundColor: '#bf0141',
    },
    contentContainer: {
        padding: 16,
    },
    productInfo: {
        marginBottom: 5,
    },
    productName: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    priceAndSave: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    price: {
        fontSize: 18,
        color: '#000',
        textDecorationLine: 'line-through',
    },
    text: {
        fontSize: 18,
        color: '#000',
    },
    getBidsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    getBidsText: {
        fontSize: 18,
        color: '#000',
        textDecorationLine: 'none',
    },
    infoIcon: {
        marginLeft: 5,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButton: {
        padding: 8,
    },
    productDescription: {
        padding: 13,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    descriptionText: {
        fontSize: 14,
        color: '#333',
        marginTop: 5,
    },
    titleText: {
        fontWeight: 'bold',
        fontSize: 15,
        textTransform: 'uppercase',
    },
    reviewTitleText: {
        fontWeight: 'bold',
        fontSize: 15,
        marginVertical: 10,
        textTransform: 'uppercase',
    },
    descriptionText: {
        fontSize: 16,
        marginBottom: 8,
        textAlign: 'justify',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderColor: '#eee',
    },
    addToCartButton: {
        flex: 1,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginRight: 8,
    },
    addToCartText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buyNowButton: {
        flex: 1,
        backgroundColor: '#bf0141',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buyNowText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
        borderRadius: 15,
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
        borderRadius: 15,
        borderColor: 'red',
        borderWidth: 1,
    },
    errorButtonText: {
        color: 'red',
        fontSize: 16,
        fontWeight: 'bold',
    },
    reviewItem: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
    },
    reviewText: {
        fontSize: 16,
        marginBottom: 5,
    },
    noReviewsText: {
        fontSize: 16,
        color: '#888',
    },
    userRatingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',  // Align username left and rating right
        alignItems: 'center',
        marginBottom: 5,
    },
    usernameText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    starIcon: {
        marginLeft: 5,
    },
    imagesContainer: {
        flexDirection: 'row',
        marginTop: 10,
    },
    reviewImage: {
        width: 60,
        height: 60,
        marginRight: 5,
        borderRadius: 5,
    },
    noImageText: {
        fontSize: 14,
        color: '#888',
    },
    totalCountText: {
        marginTop: 10,
        fontStyle: 'italic',
    },
    imageModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Dark background
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 5,
    },
    closeButtonText: {
        color: 'black',
        fontSize: 16,
    },
    fullImage: {
        width: 512,
        height: 512,
        resizeMode: 'contain', 
    },
    headerContainer: {
        flexDirection: 'row', 
        justifyContent: 'space-between',
        alignItems: 'center', // Aligns items vertically in the center
    },
    totalCountText: {
        fontStyle: 'italic', // Keeps this italic
        marginLeft: 10, // Optional: Adds some spacing between title and count
    },
    showMoreButton: {
        backgroundColor: '#bf0141',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    showMoreText: {
        color: 'white',
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});
