import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView, Modal, FlatList } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, db, auth } from '../firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

// Icons
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';

const AddProductScreen = () => {
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
  const { storeId } = route.params;

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('#fff');
    }, [])
  );

  useEffect(() => {
    const getPermissionAsync = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
      }
    };
    getPermissionAsync();
  }, []);

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

  const handleCreateProduct = async () => {
    if (!productName || !productPrice || !productDescription || productImages.length === 0 || !totalStocks || !selectedCategory) {
      setError('Please fill out all fields');
      return;
    }

    setIsLoading(true);

    try {
      // Upload product images to Firebase Storage
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

      // Get the current user
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        setIsLoading(false); // Hide loading animation
        return;
      }

      // Create a unique document ID for each new product
      const productRef = doc(db, 'products', Date.now().toString());

      // Set the product details in Firestore
      await setDoc(productRef, {
        productName,
        productPrice: parseFloat(productPrice),
        productDescription,
        productImageURLs: imageURLs,
        totalStocks: parseInt(totalStocks),
        createdAt: new Date(),
        storeId,
        category: selectedCategory, // Add selected category to the product document
      });

      console.log('Product Created');

      // Update the corresponding store document
      const storeRef = doc(db, 'stores', storeId);
      const storeDoc = await getDoc(storeRef);

      if (storeDoc.exists()) {
        const storeData = storeDoc.data();
        const existingProducts = storeData.products || [];

        // Append the new product to the existing products array
        const updatedProducts = [
          ...existingProducts,
          {
            productId: productRef.id,
            productPrice: parseFloat(productPrice),
          },
        ];

        await setDoc(storeRef, {
          products: updatedProducts,
        }, { merge: true });
      }

      // Reset form fields
      setProductName('');
      setProductPrice('');
      setProductDescription('');
      setProductImages([]);
      setTotalStocks('');
      setCharCount(0);
      setError('');

      navigation.goBack();
    } catch (error) {
      console.error('Failed to get download URL or save product:', error);
      setError('Failed to create product');
    } finally {
      setIsLoading(false); // Hide loading animation
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

        {/* Total Stocks Input */}
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

        {error ? <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text> : null}

        {/* Create Product Button */}
        <TouchableOpacity style={styles.createButton} onPress={handleCreateProduct} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Product</Text>
          )}
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
  createButton: {
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
  createButtonText: {
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
});

export default AddProductScreen;
