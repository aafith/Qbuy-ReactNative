import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HelpSupportScreen = ({ navigation }) => {
  const handleEmail = () => {
    Linking.openURL('mailto:support@example.com');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/1234567890');
  };

  const handleHelp = () => {
    navigation.navigate('HelpScreen');
  };

  const handleAbout = () => {
    navigation.navigate('AboutScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>Welcome to Qbuy!</Text>
          <Text style={styles.aboutText}>
            Your trusted partner for a seamless shopping experience. Explore our
            resources below for assistance and information.
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleHelp}>
            <Icon name="help-circle-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Help Center</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleEmail}>
            <Icon name="email-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Email Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleWhatsApp}>
            <Icon name="whatsapp" size={24} color="#fff" />
            <Text style={styles.buttonText}>WhatsApp Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleAbout}>
            <Icon name="information-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>About Us</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 16,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#bf0141',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});

export default HelpSupportScreen;
