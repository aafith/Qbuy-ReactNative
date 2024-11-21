import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { auth, db } from '../firebaseConfig'; // Ensure this path matches your actual config file
import { collection, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';

const userBenefits = [
  'Unlimited Free Shipping',
  'First Access to New Products',
  '24/7 Priority Support',
  'Verified Store Badge',
];

const MembershipScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // State to hold verification status
  const userId = auth.currentUser ? auth.currentUser.uid : null; // Get the current user's ID

  useEffect(() => {
    const checkStoreVerification = async () => {
      if (!userId) return;

      try {
        const storeRef = collection(db, 'stores');
        const storeQuery = query(storeRef, where('userId', '==', userId));
        const storeSnapshot = await getDocs(storeQuery);

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data();
          setIsVerified(storeData.isVerified); // Set the verification status
        }
      } catch (error) {
        console.error('Error checking store verification: ', error);
      }
    };

    checkStoreVerification();
  }, [userId]);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      if (!userId) {
        Alert.alert('Login', 'You need to be logged in to upgrade your membership.');
        navigation.navigate('Login');
        return;
      }

      // Update the user's membership to "Premium"
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        isMembership: true,
      });

      // Update the store's verification status
      const storeRef = collection(db, 'stores');
      const storeQuery = query(storeRef, where('userId', '==', userId));
      const storeSnapshot = await getDocs(storeQuery);

      if (!storeSnapshot.empty) {
        storeSnapshot.forEach(async (storeDoc) => {
          const storeDocRef = doc(db, 'stores', storeDoc.id);
          await updateDoc(storeDocRef, {
            isVerified: true,
          });
        });
        setIsVerified(true); // Set isVerified to true after upgrading
      } else {
        Alert.alert('No Store Found', 'No store linked to your user ID was found.');
      }

      Alert.alert('Success', 'Your membership has been upgraded and your store verified!');
    } catch (error) {
      console.error('Error upgrading membership: ', error);
      Alert.alert('Error', 'There was a problem upgrading your membership.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.memberCard}>
          {/* List of User Benefits */}
          <Text style={styles.sectionHeader}>Premium Membership</Text>
          {userBenefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <MaterialIcons name="verified" size={23} color="#bf0141" style={styles.checkIcon} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}

          {/* Upgrade Membership Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              isVerified && styles.disabledButton, // Add disabled style if verified
            ]}
            onPress={handleUpgrade}
            disabled={isVerified || isLoading} // Disable if already verified or loading
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.createButtonText}>
                {isVerified ? 'Membership Upgraded' : 'Upgrade Membership'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  memberCard: {
    justifyContent: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 14,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: '#bf0141',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkIcon: {
    marginRight: 5,
  },
  benefitText: {
    fontSize: 16,
  },
  createButton: {
    width: '100%',
    padding: 14,
    justifyContent: 'center',
    backgroundColor: '#000',
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
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default MembershipScreen;
