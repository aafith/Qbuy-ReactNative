import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, db, auth } from '../firebaseConfig';
import { doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import Icon from 'react-native-vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';

const ReviewScreen = ({ navigation, route }) => {
  const [reviewText, setReviewText] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [rating, setRating] = useState(0); // State for the rating
  const [hasReviewed, setHasReviewed] = useState(false); // State for hasReviewed

  useEffect(() => {
    const getPermissionAsync = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('We need camera roll permissions to make this work!');
      }
    };
    getPermissionAsync();
  }, []);

  const handleSelectImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 1,
        allowsMultipleSelection: true,
      });

      if (!result.canceled) {
        const selectedImages = result.assets.map(asset => asset.uri);
        if (reviewImages.length + selectedImages.length <= 5) {
          setReviewImages([...reviewImages, ...selectedImages]);
        } else {
          alert('You can only upload up to 5 images.');
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  const handleRemoveImage = (index) => {
    setReviewImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!reviewText || reviewImages.length === 0 || rating === 0) {
      setError('Please provide a review, at least one image, and a rating.');
      return;
    }
  
    setIsLoading(true);
    setError('');
  
    try {
      const uploadedImages = await Promise.all(
        reviewImages.map(async (image) => {
          const imageRef = ref(storage, `reviewImages/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`);
          const imageResponse = await fetch(image);
          const imageBlob = await imageResponse.blob();
          const uploadTask = uploadBytesResumable(imageRef, imageBlob);
  
          return await new Promise((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              null,
              reject,
              async () => {
                const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(imageUrl);
              }
            );
          });
        })
      );
  
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }
  
      // Submit review to Firestore
      const reviewRef = doc(db, 'reviews', Date.now().toString());
      await setDoc(reviewRef, {
        reviewText,
        images: uploadedImages,
        userId: user.uid,
        createdAt: Timestamp.now(),
        productId: route.params.productId,
        storeId: route.params.storeId,
        rating,
      });
  
      // Update the order in Firestore to mark it as reviewed
      const orderRef = doc(db, 'orders', route.params.orderId); // Assuming orderId is passed through route
      await updateDoc(orderRef, { hasReviewed: true });
  
      // Update local state (if you have a state like `hasReviewed`)
      setHasReviewed(true); 
  
      setIsLoading(false);
      Alert.alert('Thank you!', 'Your review has been submitted.');
      navigation.goBack(); // Go back to the previous screen
    } catch (error) {
      console.error('Error submitting review:', error);
      setError('Failed to submit review');
      setIsLoading(false);
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inputWrapper}>
        <Text style={styles.label}>Write a Review</Text>
        <View style={[styles.inputContainer, focusedInput === 'reviewText' && styles.focusedInput]}>
          <TextInput
            style={[styles.input, focusedInput === 'reviewText' && styles.focusedInput]}
            placeholder="Write your review here..."
            placeholderTextColor="#8c8c8c"
            multiline
            numberOfLines={4}
            value={reviewText}
            onChangeText={setReviewText}
            onFocus={() => setFocusedInput('reviewText')}
            onBlur={() => setFocusedInput(null)}
            textAlignVertical="top"
            selectionColor="#ff99ad"
          />
        </View>
      </View>

      {/* Star Rating Section */}
      <View style={styles.ratingContainer}>
        {Array.from({ length: 5 }, (_, index) => (
          <TouchableOpacity key={index} onPress={() => setRating(index + 1)}>
            <Icon name={index < rating ? 'star' : 'star-o'} size={30} color="#FFD700" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.uploadButton} onPress={handleSelectImage}>
        <Feather name="upload" size={24} color="black" />
        <Text style={styles.uploadText}>Upload File</Text>
      </TouchableOpacity>

      <View style={styles.imageContainer}>
        {reviewImages.map((imageUri, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity onPress={() => handleRemoveImage(index)} style={styles.removeImageButton}>
              <MaterialIcons name="delete" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Review</Text>}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  uploadButton: {
    flexDirection: 'column',
    textAlign: 'center',
    alignItems: 'center',
    marginVertical: 20,
    paddingVertical: 20,
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
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff0000',
    marginTop: 10,
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
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    height: 100,
    borderColor: '#f4f5f9',
  },
  input: {
    flex: 1,
    color: '#000',
  },
  focusedInput: {
    borderColor: '#bf0141',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 10,
  },
});

export default ReviewScreen;
