// helpers/firestoreFunctions.js
import { collection, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const fetchCartItems = async (userId) => {
    const cartItems = [];
    try {
        const cartRef = collection(db, 'carts');
        const q = query(cartRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            cartItems.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('Error fetching cart items:', error);
    }
    return cartItems;
};

export const removeCartItem = async (itemId) => {
    try {
        await deleteDoc(doc(db, 'carts', itemId));
    } catch (error) {
        console.error('Error removing cart item:', error);
    }
};

export const updateCartItemQuantity = async (itemId, quantity) => {
    try {
        const itemRef = doc(db, 'carts', itemId);
        await updateDoc(itemRef, { quantity });
    } catch (error) {
        console.error('Error updating cart item quantity:', error);
    }
};


export const fetchProductStock = async (productId) => {
    let totalStock = 0;
    try {
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        totalStock = productDoc.data().totalStocks;
    } catch (error) {
        console.error('Error fetching product stock:', error);
    }
    return totalStock;
}

