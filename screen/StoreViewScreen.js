import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, StatusBar, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { storage, db, auth } from '../firebaseConfig';
import { ref, deleteObject } from 'firebase/storage';
import { doc, deleteDoc, getDoc, collection, query, getDocs, where } from 'firebase/firestore';
import FontAwesome from 'react-native-vector-icons/FontAwesome';


// Icons
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Entypo from '@expo/vector-icons/Entypo';


const StoreViewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { storeId } = route.params;
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'allProducts', title: 'ALL PRODUCTS' },
    { key: 'reviews', title: 'REVIEWS' },
  ]);

  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [aboutUs, setAboutUs] = useState('');
  const [profileImageURL, setProfileImageURL] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleImagePress = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };


  const fetchStoreData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const storeRef = doc(db, 'stores', storeId);
        const docSnap = await getDoc(storeRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStoreName(data.storeName);
          setStoreLocation(data.storeLocation);
          setAboutUs(data.aboutUs);
          setProfileImageURL(data.profileImageURL);
          setIsVerified(data.isVerified);
          setIsOwner(data.userId === user.uid);
          setUserId(data.userId); // Set the owner userId
        } else {
          console.log('No such document!');
        }

        // Fetch products for this store
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('storeId', '==', storeId));
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStoreProducts(products);

      }
    } catch (error) {
      setError('Failed to fetch store data');
      console.error('Failed to fetch store data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('#fff');
      fetchStoreData();
    }, [])
  );

  useEffect(() => {
    fetchStoreData();
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('storeId', '==', storeId));
      const querySnapshot = await getDocs(q);
      const reviewsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(reviewsData.reverse());
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#bf0141" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const deleteStoreById = async (id, profileImageURL) => {
    try {
      // First, delete all products associated with the store
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('storeId', '==', id));
      const querySnapshot = await getDocs(q);

      for (const doc of querySnapshot.docs) {
        // Delete each product document
        await deleteDoc(doc.ref);

        // Optionally, delete associated product images if any
        const productData = doc.data();
        if (productData.productImageURLs) {
          for (const imageUrl of productData.productImageURLs) {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          }
        }
      }

      // Then, delete the store document
      const storeRef = doc(db, 'stores', id);
      await deleteDoc(storeRef);

      // Optionally, delete any associated store profile image
      if (profileImageURL) {
        const imageRef = ref(storage, profileImageURL);
        await deleteObject(imageRef);
      }

      console.log('Store and associated products deleted successfully');
    } catch (error) {
      console.error('Error deleting store and associated products:', error);
      throw new Error(`Failed to delete store and associated products: ${error.message}`);
    }
  };

  const handleEditStore = () => {
    navigation.navigate('EditStoreScreen', { storeId });
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen', { storeId });
  };

  const handleMessages = () => {
    navigation.navigate('MessageScreen', { otherUserId: userId });
  };  
  
  const handleOrderStore = () => {
    navigation.navigate('OrderStore', { storeId });
  };

  const handleAllProducts = () => {
    navigation.navigate('AllProducts', { storeId });
  };

  const handleDeleteStore = async () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this store and all associated products?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await deleteStoreById(storeId, profileImageURL);
              Alert.alert('Success', 'Store and associated products deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete store and products. Please try again.');
            }
          },
        },
      ],
      { cancelable: false }
    );
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

  const groupProductsIntoRows = (products) => {
    const rows = [];
    for (let i = 0; i < products.length; i += 2) {
      rows.push(products.slice(i, i + 2));
    }
    return rows;
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

  const renderProductList = () => {
    const rows = groupProductsIntoRows(storeProducts);
    return (
      <ScrollView contentContainerStyle={styles.productList} showsVerticalScrollIndicator={false}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => (
              <View key={item.id} style={styles.productItem}>
                <TouchableOpacity onPress={() => navigation.navigate('ProductDetailsScreen', { productId: item.id })}>
                  <Image
                    source={{ uri: item.productImageURLs[0] }}
                    style={styles.productImage}
                  />
                </TouchableOpacity>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.productPrice}>{formattedPrice(item.productPrice)}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'allProducts':
        return (
          <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
              {renderProductList()}
            </ScrollView>
          </SafeAreaView>
        );
      case 'reviews':
        return (
          <View style={styles.review}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {reviews.length > 0 ? (
                reviews.map((review) => (
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

              {/* Modal to display selected image */}
              <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                  setModalVisible(false);
                  setSelectedImage(null);
                }}
              >
                <View style={styles.modalContainer}>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
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


            </ScrollView>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwner ? 'My Store' : 'Store'}</Text>
        {isOwner && (
          <Menu>
            <MenuTrigger>
              <Feather name="more-vertical" size={24} color="black" />
            </MenuTrigger>
            <MenuOptions customStyles={{
              optionsContainer: {
                borderRadius: 10,
                overflow: 'hidden',
              },
            }}>
              
              <MenuOption onSelect={handleEditStore}>
                <Text style={styles.menuOptionText}>Edit Store</Text>
              </MenuOption>
              <MenuOption onSelect={handleDeleteStore}>
                <Text style={styles.menuOptionText}>Delete Store</Text>
              </MenuOption>
              <MenuOption onSelect={handleOrderStore}>
                <Text style={styles.menuOptionText}>Orders</Text>
              </MenuOption>
              <MenuOption onSelect={handleAllProducts}>
                <Text style={styles.menuOptionText}>All Products</Text>
              </MenuOption>
  
            </MenuOptions>
          </Menu>
        )}
      </View>

      <View style={styles.storeInfoContainer}>
        {profileImageURL ? (
          <Image source={{ uri: profileImageURL }} style={styles.storeImage} />
        ) : (
          <Image source={{ uri: 'https://placehold.co/400' }} style={styles.storeImage} />
        )}
        <View style={styles.storeDetails}>
          <View style={styles.storeHeader}>
            <Text style={styles.storeName}>{storeName}</Text>
            {isVerified && (
              <MaterialIcons name="verified" size={18} color="#2563eb" style={styles.verifiedIcon} />
            )}
          </View>
          <View style={styles.storeLocation}>
            <Entypo name="location-pin" size={18} color="red" />
            <Text style={styles.storeStat}>{storeLocation}</Text>
          </View>
          <View style={styles.storeStats}>
            <Text style={styles.storeStat}>{`${storeProducts.length} Products`}</Text>
          </View>
        </View>
        {isOwner ? (
          <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
            <AntDesign name="plus" size={24} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={handleMessages}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color="#ffff" style={{ marginRight: 5 }} />
            <Text style={styles.addButtonText}>Messages</Text>
          </TouchableOpacity>
        )}
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        style={{ backgroundColor: '#fff' }}
        initialLayout={{ width: '100%' }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: '#bf0141' }}
            style={{ backgroundColor: 'transparent' }}
            activeColor="#bf0141"
            inactiveColor="black"
          />
        )}
        swipeEnabled={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  storeInfoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
    textAlign: 'center',
    gap: 10,
  },
  storeImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  storeDetails: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 2,
    marginTop: 2,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  storeStats: {
    flexDirection: 'row',
  },
  storeStat: {
    marginRight: 16,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#bf0141',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
  },
  menuOptionText: {
    padding: 10,
    fontSize: 16,
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0d0c22",
  },
  productList: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  productItem: {
    width: '48%',
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  review: {
    flex: 1,
    padding: 16,
  },
  reviewItem: {
    marginBottom: 20,
    padding: 16,
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
    justifyContent: 'space-between',
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
  modalContainer: {
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
  scrollView: {
    flex: 1,
    paddingTop: 10,
  },
  storeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    textAlign: 'center',
  },

});

export default StoreViewScreen;
