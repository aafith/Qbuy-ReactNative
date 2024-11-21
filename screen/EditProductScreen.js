import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, Modal, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, db, } from '../firebaseConfig';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

// Icons
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';

const EditProductScreen = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [productName, setProductName] = useState('');
    const [productPrice, setProductPrice] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [productImages, setProductImages] = useState([]);
    const [totalStocks, setTotalStocks] = useState('');
    const [error, setError] = useState('');
    const [charCount, setCharCount] = useState(0);
    const [focusedInput, setFocusedInput] = useState(null);
    const navigation = useNavigation();
    const route = useRoute();
    const { productId } = route.params; // Assuming productId is passed as parameter

    useEffect(() => {
        const fetchProductDetails = async () => {
            const productRef = doc(db, 'products', productId);
            const productDoc = await getDoc(productRef);

            if (productDoc.exists()) {
                const productData = productDoc.data();
                setProductName(productData.productName);
                setProductPrice(productData.productPrice.toString());
                setProductDescription(productData.productDescription);
                setProductImages(productData.productImageURLs);
                setTotalStocks(productData.totalStocks.toString());
                setSelectedCategory(productData.category);
            } else {
                setError('Product not found');
            }
        };

        fetchProductDetails();
    }, [productId]);

    useEffect(() => {
        const fetchCategories = async () => {
            const categoriesCollection = collection(db, 'categories');
            const categorySnapshot = await getDocs(categoriesCollection);
            const categoryList = categorySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategories(categoryList);
        };

        fetchCategories();
    }, []);

    const handleUpdateProduct = async () => {
        if (!productName || !productPrice || !productDescription || productImages.length === 0 || !totalStocks || !selectedCategory) {
            setError('Please fill out all fields');
            return;
        }
    
        setIsLoading(true);
    
        try {
            // Upload new product images to Firebase Storage if any images were updated
            const imageURLs = await Promise.all(
                productImages.map(async (imageUri, index) => {
                    const imageRef = ref(storage, `productImages/${Date.now()}-${index}.jpg`);
                    const imageResponse = await fetch(imageUri);
                    const imageBlob = await imageResponse.blob();
                    const imageUploadTask = uploadBytesResumable(imageRef, imageBlob);
    
                    return new Promise((resolve, reject) => {
                        imageUploadTask.on(
                            'state_changed',
                            null,
                            reject,
                            async () => {
                                const imageURL = await getDownloadURL(imageUploadTask.snapshot.ref);
                                resolve(imageURL);
                            }
                        );
                    });
                })
            );
    
            // Update product details in Firestore
            const productRef = doc(db, 'products', productId);
            await updateDoc(productRef, {
                productName,
                productPrice: parseFloat(productPrice),
                productDescription,
                productImageURLs: imageURLs,
                totalStocks: parseInt(totalStocks),
                updatedAt: new Date(),
                category: selectedCategory,
            });
    
            console.log('Product Updated');
            navigation.goBack(); // Navigate back after successful update
        } catch (error) {
            console.error('Failed to update product:', error);
            setError('Failed to update product');
        } finally {
            setIsLoading(false);
        }
    };
    

    const handleSelectImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                aspect: [1, 1],
                quality: 1,
                allowsMultipleSelection: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const imageUris = result.assets.map((asset) => asset.uri);
                setProductImages((prevImages) => {
                    const newImages = [...prevImages, ...imageUris];
                    return newImages.slice(0, 4);
                });
            } else {
                console.log('Image selection canceled');
            }
        } catch (error) {
            console.error('Error selecting image:', error);
        }
    };

    const handleClearImage = (index) => {
        setProductImages((prevImages) => prevImages.filter((_, i) => i !== index));
    };

    const handleDescriptionChange = (text) => {
        if (text.length <= 500) {
            setProductDescription(text);
            setCharCount(text.length);
        }
    };

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => {
                setSelectedCategory(item.name);
                setModalVisible(false);
            }}
        >
            <Text style={styles.categoryItemText}>{item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Main Image Upload */}
                <View style={styles.imageContainer}>
                    <TouchableOpacity onPress={handleSelectImage} style={styles.mainImageWrapper}>
                        <Feather name="upload" size={24} color="black" />
                        <Text style={styles.uploadText}>Upload Image</Text>
                    </TouchableOpacity>
                </View>

                {/* Additional Images Upload and Display */}
                <View style={styles.imageSection}>
                    {productImages.map((uri, index) => (
                        <View key={index} style={styles.imageWrapper}>
                            <Image source={{ uri }} style={styles.productImage} />
                            <TouchableOpacity onPress={() => handleClearImage(index)} style={styles.clearIcon}>
                                <MaterialIcons name="delete" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                {/* Product Name Input */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Product Name</Text>
                    <View style={[styles.inputContainer, focusedInput === 'productName' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'productName' && styles.focusedInput]}
                            placeholder="Product Name"
                            placeholderTextColor="#8c8c8c"
                            autoCapitalize="words"
                            value={productName}
                            onChangeText={setProductName}
                            onFocus={() => setFocusedInput('productName')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* Product Price Input */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Product Price</Text>
                    <View style={[styles.inputContainer, focusedInput === 'productPrice' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'productPrice' && styles.focusedInput]}
                            placeholder="Product Price"
                            placeholderTextColor="#8c8c8c"
                            keyboardType="numeric"
                            value={productPrice}
                            onChangeText={setProductPrice}
                            onFocus={() => setFocusedInput('productPrice')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* Category Selector */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity
                        style={[styles.categoryinputContainer, focusedInput === 'category' && styles.focusedInput]}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.categoryText}>{selectedCategory || 'Select a Category'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Product Description Input */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Product Description</Text>
                    <View style={[styles.inputContainer, focusedInput === 'productDescription' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'productDescription' && styles.focusedInput, { textAlignVertical: 'top', height: 170 }]}
                            placeholder="Product Description"
                            placeholderTextColor="#8c8c8c"
                            multiline
                            numberOfLines={10}
                            maxLength={500}
                            value={productDescription}
                            onChangeText={handleDescriptionChange}
                            onFocus={() => setFocusedInput('productDescription')}
                            onBlur={() => setFocusedInput(null)}
                        />
                        <Text style={styles.charCount}>{charCount}/500</Text>
                    </View>
                </View>

                {/* Total Stocks */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Total Stocks</Text>
                    <View style={[styles.inputContainer, focusedInput === 'totalStocks' && styles.focusedInput]}>
                        <TextInput
                            style={[styles.input, focusedInput === 'totalStocks' && styles.focusedInput]}
                            placeholder="Total Stocks"
                            placeholderTextColor="#8c8c8c"
                            keyboardType="numeric"
                            value={totalStocks}
                            onChangeText={setTotalStocks}
                            onFocus={() => setFocusedInput('totalStocks')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>
                </View>

                {/* Submit Button */}
                {error && <Text style={styles.errorText}>{error}</Text>}
                <TouchableOpacity style={styles.submitButton} onPress={handleUpdateProduct} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Update Product</Text>}
                </TouchableOpacity>
            </ScrollView>

            {/* Category Selection Modal */}
            <Modal
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <FlatList
                            data={categories}
                            renderItem={renderCategoryItem}
                            keyExtractor={(item) => item.id}
                            ListHeaderComponent={<Text style={styles.modalTitle}>Select a Category</Text>}
                        />
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 20,
        marginVertical: 20,
    },
    mainImageWrapper: {
        flexDirection: 'row',
        textAlign: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 40,
        gap: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    uploadText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    imageSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    imageWrapper: {
        position: 'relative',
        width: 70,
        height: 70,
    },
    productImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    clearIcon: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#ff0000',
        borderRadius: 20,
        padding: 5,
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
    charCount: {
        fontSize: 13,
        color: '#8c8c8c',
        marginTop: 8,
        textAlign: 'right',
    },
    submitButton: {
        width: '90%',
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
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        elevation: 2,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    categoryItem: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    categoryItemText: {
        fontSize: 16,
        color: '#000',
    },
    categoryinputContainer: {
        backgroundColor: '#f4f5f9',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 18,
    },
    categoryText: {
        color: '#000',
        fontSize: 16,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
    },
});

export default EditProductScreen;
