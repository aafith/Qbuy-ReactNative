import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { auth, db } from '../firebaseConfig'; // Ensure correct imports from your firebaseConfig
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, query, onSnapshot, addDoc, orderBy, setDoc, doc, getDoc } from 'firebase/firestore';
import { SafeAreaView } from "react-native-safe-area-context";


import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function MessageScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { otherUserId } = route.params; // Get the other user's ID from the route params
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [otherUser, setOtherUser] = useState(null); // State to store the other user’s details
    const [userImage, setUserImage] = useState('');
    const currentUserID = auth.currentUser ? auth.currentUser.uid : null;
    const flatListRef = useRef(null);

    useEffect(() => {
        async function fetchOtherUser() {
            if (!otherUserId) return;

            try {
                // Reference to the 'users' collection
                const userDocRef = doc(db, 'users', otherUserId);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    setOtherUser(userDoc.data());
                    setUserImage(userDoc.data().profileImageURL); // Set profile image URL
                } else {
                    console.error('No such user!');
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setError('Failed to load user');
            }
        }

        fetchOtherUser();
    }, [otherUserId]);

    useEffect(() => {
        if (!currentUserID || !otherUserId) return;

        // Reference to the messages collection for the chat between currentUserID and otherUserId
        const chatId = [currentUserID, otherUserId].sort().join('_'); // Create a unique chat ID
        const messagesRef = collection(db, 'messages', chatId, 'chatMessages');
        
        // Create a query to get messages ordered by timestamp
        const q = query(messagesRef, orderBy('timestamp'));

        // Set up real-time listener
        const unsubscribe = onSnapshot(q, snapshot => {
            const loadedMessages = [];
            snapshot.forEach(doc => {
                loadedMessages.push({
                    id: doc.id,
                    ...doc.data(),
                });
            });
            setMessages(loadedMessages);
            setLoading(false);

            // Scroll to the bottom when new messages are loaded
            if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        }, error => {
            console.error("Error fetching messages: ", error);
            setError('Failed to load messages');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserID, otherUserId]);

    const saveChatDetails = async () => {
        if (!currentUserID || !otherUserId) return;

        try {
            // Reference to the chats collection
            const chatsRef = collection(db, 'chats');
            const chatId = [currentUserID, otherUserId].sort().join('_'); // Create a unique chat ID
            const chatDocRef = doc(chatsRef, chatId);

            // Set or update the chat document
            await setDoc(chatDocRef, {
                participants: [currentUserID, otherUserId],
                lastMessage: newMessage,
                lastMessageTimestamp: new Date(),
            }, { merge: true });

        } catch (error) {
            console.error("Error saving chat details: ", error);
            setError('Failed to save chat details');
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return; // Do not send empty messages

        try {
            const chatId = [currentUserID, otherUserId].sort().join('_'); // Create a unique chat ID
            const messagesRef = collection(db, 'messages', chatId, 'chatMessages');
            
            // Add new message to Firestore
            await addDoc(messagesRef, {
                text: newMessage,
                senderID: currentUserID,
                timestamp: new Date(),
            });

            await saveChatDetails(); // Save or update the chat details

            setNewMessage(''); // Clear the input field
        } catch (error) {
            console.error("Error sending message: ", error);
            setError('Failed to send message');
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.message, item.senderID === currentUserID ? styles.sentMessage : styles.receivedMessage]}>
            <Text style={styles.receivedMessageText}>{item.text}</Text>
        </View>
    );

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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <AntDesign name="arrowleft" size={24} color="black" />
                </TouchableOpacity>
                {userImage ? (
                    <Image
                        source={{ uri: userImage }}
                        style={styles.headerImage}
                    />
                ) : (
                    <View style={styles.headerImage}>
                        <Image source={{uri: 'https://placehold.co/400'}} style={styles.headerImage} />
                    </View>
                )}
                <Text style={styles.headerTitle}>{otherUser ? otherUser.name : 'Loading...'}</Text>
            </View>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
            />
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                />
                <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                    <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    headerTitle: {
        fontSize: 18,
        color: '#000',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    headerImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: 10,
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
        backgroundColor: '#fff',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bf0141',
        marginRight: 10,
        paddingVertical: 15,
    },
    sendButton: {
        backgroundColor: '#bf0141',
        borderRadius: 50,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    message: {
        padding: 10,
        marginVertical: 5,
    },
    sentMessage: {
        backgroundColor: '#bf0141',
        alignSelf: 'flex-end',
        marginRight: 10,
        borderRadius: 30,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 0,
    },
    receivedMessage: {
        backgroundColor: '#e27c00',
        alignSelf: 'flex-start',
        marginLeft: 10,
        borderRadius: 30,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 30,
    },
    receivedMessageText: {
        color: '#fff',
    },
    listContent: {
        paddingBottom: 20, // Add some padding at the bottom
    },
});
