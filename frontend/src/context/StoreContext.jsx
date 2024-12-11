/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { createContext, useEffect, useState } from "react";
import axios from 'axios';

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
    const [cartItems, setCartItems] = useState({});
    const url = import.meta.env.VITE_BACKEND_URL;
    const [token, setToken] = useState("");
    const [discount, setDiscount] = useState(0);
    const [food_list, setFoodList] = useState([]);

    const addToCart = async (itemId) => {
        setCartItems((prev) => ({
            ...prev,
            [itemId]: (prev[itemId] || 0) + 1,
        }));

        if (token) {
            try {
                await axios.post(`${url}/api/cart/add`, { itemId }, { headers: { token } });
            } catch (error) {
                console.error("Error adding item to cart:", error);
            }
        }
    };

    const removeFromCart = async (itemId) => {
        setCartItems((prev) => {
            const updatedCart = { ...prev, [itemId]: (prev[itemId] || 1) - 1 };
            if (updatedCart[itemId] <= 0) delete updatedCart[itemId];
            return updatedCart;
        });

        if (token) {
            try {
                await axios.post(`${url}/api/cart/remove`, { itemId }, { headers: { token } });
            } catch (error) {
                console.error("Error removing item from cart:", error);
            }
        }
    };

    const loadCartData = async (token) => {
        try {
            const response = await axios.post(`${url}/api/cart/get`, {}, { headers: { token } });
            setCartItems(response.data.cartData || {});
        } catch (error) {
            console.error("Error loading cart data:", error);
        }
    };

    const getTotalCartAmount = () => {
        return Object.entries(cartItems).reduce((total, [itemId, quantity]) => {
            const itemInfo = food_list.find((product) => product._id === itemId);
            return total + (itemInfo?.price || 0) * quantity;
        }, 0);
    };

    const fetchFoodList = async () => {
        try {
            const response = await axios.get(`${url}/api/food/list`);
            setFoodList(response.data.data || []);
        } catch (error) {
            console.error("Error fetching food list:", error);
        }
    };

    useEffect(() => {
        async function loadData() {
            await fetchFoodList();
            const storedToken = localStorage.getItem("token");
            if (storedToken) {
                setToken(storedToken);
                await loadCartData(storedToken);
            }
        }
        loadData();
    }, []);

    const contextValue = {
        food_list,
        cartItems,
        setCartItems,
        addToCart,
        removeFromCart,
        getTotalCartAmount,
        discount,
        setDiscount,
        url,
        token,
        setToken,
    };

    return (
        <StoreContext.Provider value={contextValue}>
            {props.children}
        </StoreContext.Provider>
    );
};

export default StoreContextProvider;