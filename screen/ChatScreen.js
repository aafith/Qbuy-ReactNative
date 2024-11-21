import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, query, where, doc, documentId, deleteDoc } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import MaterialIcons from Expo vector icons
import MaterialIcons from '@expo/vector-icons/MaterialIcons';


export default function ChatScreen() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUserID, setCurrentUserID] = useState(null);
    const navigation = useNavigation();

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                setCurrentUserID(user.uid);
            } else {
                console.log("User is not signed in");
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!currentUserID) return;

        const fetchChats = async () => {
            try {
                const chatsRef = collection(db, 'chats');
                const q = query(chatsRef, where('participants', 'array-contains', currentUserID));
                const chatSnapshot = await getDocs(q);

                if (chatSnapshot.empty) {
                    console.log("No chats found.");
                    setUsers([]);
                    return;
                }

                const otherUserIds = new Set();
                const chatDetails = {};

                chatSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const { participants, lastMessage, lastMessageTimestamp } = data;
                    participants.forEach(userId => {
                        if (userId !== currentUserID) {
                            otherUserIds.add(userId);
                            chatDetails[userId] = {
                                lastMessage: lastMessage || 'No messages yet',
                                lastMessageTimestamp: lastMessageTimestamp || new Date(),
                            };
                        }
                    });
                });

                const userIdsArray = Array.from(otherUserIds);

                if (userIdsArray.length > 0) {
                    const usersRef = collection(db, 'users');
                    const userQuery = query(usersRef, where(documentId(), 'in', userIdsArray));
                    const userSnapshot = await getDocs(userQuery);

                    if (userSnapshot.empty) {
                        setUsers([]);
                        return;
                    }

                    const loadedUsers = userSnapshot.docs.map(doc => {
                        const userData = doc.data();
                        const userId = doc.id;
                        return {
                            id: userId,
                            name: userData.name,
                            profileImageURL: userData.profileImageURL,
                            lastMessage: chatDetails[userId]?.lastMessage || 'No messages yet',
                            lastMessageTimestamp: chatDetails[userId]?.lastMessageTimestamp || new Date(),
                        };
                    });

                    setUsers(loadedUsers);
                } else {
                    setUsers([]);
                }
            } catch (fetchError) {
                console.error("Error fetching users:", fetchError);
                setError('Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        fetchChats();
    }, [currentUserID]);

    const handleUserPress = (userId) => {
        navigation.navigate('MessageScreen', { otherUserId: userId });
    };

    const handleRemoveChat = (chatId) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this chat?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                onPress: async () => {
                    try {
                        const chatRef = doc(db, 'chats', chatId);
                        await deleteDoc(chatRef);
                        setUsers(prevUsers => prevUsers.filter(user => user.id !== chatId));
                    } catch (error) {
                        console.error('Error deleting chat:', error);
                        setError('Failed to delete chat');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity onPress={() => handleUserPress(item.id)} style={styles.userItem}>
            <Image source={{ uri: item.profileImageURL || 'https://via.placeholder.com/150' }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name || 'Unknown User'}</Text>
                <Text style={styles.lastMessage}>{item.lastMessage || 'No messages yet'}</Text>
                <Text style={styles.lastMessageTime}>
                    {item.lastMessageTimestamp.toDate().toLocaleTimeString() || 'N/A'}
                </Text>
            </View>
            <TouchableOpacity onPress={() => handleRemoveChat(item.id)} style={styles.removeButton}>
                <MaterialIcons name="delete" size={20} color="#fff" />
            </TouchableOpacity>
        </TouchableOpacity>
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
            {users.length === 0 ? (
                <View style={styles.noUsersContainer}>
                    <Text style={styles.noUsersText}>No users available</Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 10,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
        marginHorizontal: 10,
        marginBottom: 10,
        justifyContent: 'space-between',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        borderBottomColor: '#ddd',
        borderBottomWidth: 1,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 50,
    },
    userInfo: {
        marginLeft: 15,
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    lastMessage: {
        fontSize: 14,
        color: '#777',
        marginVertical: 5,
    },
    lastMessageTime: {
        fontSize: 12,
        color: '#999',
    },
    removeButton: {
        marginLeft: 10,
        backgroundColor: '#bf0141',
        padding: 5,
        borderRadius: 5,
    },
    removeText: {
        fontSize: 18,
        color: '#FF0000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        fontSize: 18,
        color: '#007BFF',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#FF0000',
        fontSize: 16,
    },
    noUsersContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noUsersText: {
        fontSize: 18,
        color: '#555',
    },
});
