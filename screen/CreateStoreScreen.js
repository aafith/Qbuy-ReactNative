import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, db, auth } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

// Icons
import Entypo from '@expo/vector-icons/Entypo';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';

const CreateStoreScreen = () => {
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [aboutUs, setAboutUs] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const [charCount, setCharCount] = useState(0);
  const [focusedInput, setFocusedInput] = useState(null);
  const route = useRoute();
  const [error, setError] = useState('');

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
    const requestLocationPermission = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
      }
    };
    requestLocationPermission();
  }, []);

  const handleCreateStore = async () => {
    if (!storeName || !profileImageUri || !storeLocation || !aboutUs || !latitude || !longitude) {
      setError('Please fill out all fields');
      return;
    }

    setIsLoading(true);

    try {
      // Upload profile image to Firebase Storage
      const imageName = `storeProfileImages/${Date.now()}.jpg`;
      const storageRef = ref(storage, imageName);
      const response = await fetch(profileImageUri);
      const blob = await response.blob();

      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('Upload failed:', error);
          setError('Failed to upload image');
          setIsLoading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            const user = auth.currentUser;
            if (!user) {
              setError('User not authenticated');
              setIsLoading(false);
              return;
            }

            const storeRef = doc(db, 'stores', user.uid);
            await setDoc(storeRef, {
              storeName,
              storeLocation,
              aboutUs,
              profileImageURL: downloadURL,
              createdAt: new Date(),
              userId: user.uid,
              latitude,
              longitude,
              isVerified: false,
            });

            console.log('Store Created');
            navigation.goBack();
          } catch (error) {
            console.error('Failed to save store:', error);
            setError('Failed to create store');
          } finally {
            setIsLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error creating store or uploading image:', error);
      setError('An error occurred while creating the store. Please try again.');
      setIsLoading(false);
    }
  };


  const handleSelectImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      console.log('ImagePicker result:', result); // Debug log

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('Image selected:', imageUri); // Debug log
        setProfileImageUri(imageUri);
        setProfileImage(imageUri); // For preview
      } else {
        console.log('Image selection canceled');
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  const handleClearImage = () => {
    setProfileImage(null);
    setProfileImageUri(null);
  };

  const handleAboutUsChange = (text) => {
    if (text.length <= 30) {
      setAboutUs(text);
      setCharCount(text.length);
    }
  };

  const getLiveLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;
      setLatitude(latitude);
      setLongitude(longitude);

      // Reverse geocoding
      const [location] = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (location) {
        const locationName = `${location.street}, ${location.city}, ${location.region}, ${location.country}`;
        setStoreLocation(locationName);
      } else {
        setStoreLocation(`Lat: ${latitude}, Long: ${longitude}`);
      }
    } catch (error) {
      setLocationError('Failed to get location');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={handleSelectImage} style={styles.imageSection}>
          {profileImage ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
              <TouchableOpacity onPress={handleClearImage} style={styles.clearIcon}>
                <MaterialIcons name="delete" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Image source={{ uri: 'https://placehold.co/400' }} style={styles.profileImage} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.buttonSection}>
          <TouchableOpacity style={styles.uploadButton} onPress={handleSelectImage}>
            <Feather name="upload" size={24} color="black" />
            <Text style={styles.uploadButtonText}>Upload Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.label}>Store Name</Text>
        <View style={[styles.inputContainer, focusedInput === 'storeName' && styles.focusedInput]}>
          <Entypo name="shop" size={24}
            color={focusedInput === 'storeName' ? '#bf0141' : '#8c8c8c'}
            style={styles.icon}
          />
          <TextInput
            style={[styles.input, focusedInput === 'storeName' && styles.focusedInput]}
            placeholder="Store Name"
            placeholderTextColor="#8c8c8c"
            autoCapitalize="words"
            value={storeName}
            onChangeText={setStoreName}
            onFocus={() => setFocusedInput('storeName')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.label}>Store Location</Text>
        <TouchableOpacity onPress={getLiveLocation} style={styles.button}>
          <Entypo name="location" size={24} color="#bf0141" />
          <Text style={styles.buttonText}>{storeLocation || 'Get Current Location'}</Text>
        </TouchableOpacity>
        {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.label}>About Us</Text>
        <View style={[styles.inputContainer, focusedInput === 'aboutUs' && styles.focusedInput]}>
          <AntDesign name="infocirlceo" size={24}
            color={focusedInput === 'aboutUs' ? '#bf0141' : '#8c8c8c'}
            style={styles.icon}
          />
          <TextInput
            style={[styles.input, focusedInput === 'aboutUs' && styles.focusedInput]}
            placeholder="About Us (Max 40 characters)"
            placeholderTextColor="#8c8c8c"
            value={aboutUs}
            onChangeText={handleAboutUsChange}
            maxLength={30}
            onFocus={() => setFocusedInput('aboutUs')}
            onBlur={() => setFocusedInput(null)}
          />
          <Text style={styles.charCount}>{charCount}/30</Text>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateStore} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Create Store</Text>}
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
    justifyContent: 'center',
  },
  buttonSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
  },
  imageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff0000',
    borderRadius: 50,
    padding: 8,
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
  uploadButton: {
    flexDirection: 'column',
    textAlign: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 60,
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  charCount: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 8,
    textAlign: 'right',
  },
  createButton: {
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f9',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    color: '#bf0141',
    marginLeft: 10,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 14,
  },
  loadingModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
  },
});

export default CreateStoreScreen;
