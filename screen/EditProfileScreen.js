import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth, db } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Icons
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { signOut } from 'firebase/auth';

const EditProfileScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteloading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert('Login', 'You need to be logged in to view Edit Profile screen');
          navigation.navigate('Login');
          return;
        }

        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          setName(userData.name || '');
          setEmail(userData.email || '');
          setProfileImageUri(userData.profileImageURL || null);
          setProfileImage(userData.profileImageURL || null); // For preview
        } else {
          Alert.alert('Error', 'No user data found');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleSelectImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setProfileImageUri(imageUri);
        setProfileImage(imageUri); // For preview
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  const handleClearImage = () => {
    setProfileImage(null);
    setProfileImageUri(null);
  };

  const handleSaveChanges = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Please fill out all fields');
      return;
    }

    setLoading(true); // Set loading state to true

    try {
      let downloadURL = profileImageUri; // Default to existing image URL

      if (profileImageUri) {
        // Upload new image if selected
        const imageName = `profileImages/${Date.now()}.jpg`;
        const storageRef = ref(storage, imageName);
        const response = await fetch(profileImageUri);
        const blob = await response.blob();

        const uploadTask = uploadBytesResumable(storageRef, blob);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => {
              console.error('Upload failed:', error);
              reject(error);
            },
            async () => {
              try {
                downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
              } catch (error) {
                console.error('Failed to get download URL:', error);
                reject(error);
              }
            }
          );
        });
      }

      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        email,
        profileImageURL: downloadURL || profileImageUri,
      });

      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'An error occurred while updating the profile. Please try again.');
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Confirm deletion
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete your account? This action will delete all your data including stores, products, orders, and cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeleteLoading(true);
              try {
                // Delete user stores and products
                const storesRef = collection(db, 'stores');
                const q = query(storesRef, where('userId', '==', user.uid));
                const storeSnapshots = await getDocs(q);

                for (const storeDoc of storeSnapshots.docs) {
                  const storeId = storeDoc.id;

                  // Delete all products for this store
                  const productsRef = collection(db, 'products');
                  const pQuery = query(productsRef, where('storeId', '==', storeId));
                  const productSnapshots = await getDocs(pQuery);

                  for (const productDoc of productSnapshots.docs) {
                    await deleteDoc(doc(db, 'products', productDoc.id));
                  }

                  // Delete store
                  await deleteDoc(doc(db, 'stores', storeId));
                }

                // Delete user orders
                const ordersRef = collection(db, 'orders');
                const oQuery = query(ordersRef, where('userId', '==', user.uid));
                const orderSnapshots = await getDocs(oQuery);

                for (const orderDoc of orderSnapshots.docs) {
                  await deleteDoc(doc(db, 'orders', orderDoc.id));
                }

                // Delete user data
                const userRef = doc(db, 'users', user.uid);
                await deleteDoc(userRef);

                // Delete user authentication
                await user.delete();

                // Clear AsyncStorage
                await AsyncStorage.clear();
                await signOut(auth);
                navigation.navigate('Login');

                // Navigate to login screen after clearing storage
                navigation.navigate('Login');
              } catch (error) {
                console.error('Failed to delete account:', error);
                Alert.alert('Error', 'An error occurred while deleting the account. Please try again.');
              }
              finally {
                setDeleteLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'An error occurred while deleting the account. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={handleSelectImage} style={styles.imageContainer}>
        {profileImage ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
            <TouchableOpacity onPress={handleClearImage} style={styles.clearIcon}>
              <AntDesign name="edit" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholder}>
          <AntDesign name="edit" size={24} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <Text style={styles.label}>Name</Text>
        <View style={[styles.inputContainer, focusedInput === 'name' && styles.focusedInput]}>
          <AntDesign name="user"
            size={20}
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
          <Entypo name="mail"
            size={20}
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
            editable={false}
          />
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        onPress={handleSaveChanges}
        style={styles.signUpButton}
        disabled={loading} // Disable button while loading
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <View style={styles.deleteSection}>

        <Text style={styles.deleteTitle}>Delete Account</Text>

        <Text style={styles.deleteSubtitle}>
          This action will delete your account, all stores you created, and all products associated with those stores. This cannot be undone.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          {deleteloading  ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <MaterialIcons name="delete" size={24} color="#fff" style={styles.deleteIcon} />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    paddingVertical: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
    backgroundColor: '#000',
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
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 14,
  },
  deleteSection: {
    marginTop: 30,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 8,
  },
  deleteSubtitle: {
    fontSize: 14,
    color: '#721c24',
    marginBottom: 20,
  },
  deleteButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: '#d70000',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIcon: {
    marginRight: 10,
  },
});

export default EditProfileScreen;
