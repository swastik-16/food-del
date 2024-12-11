import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Ensure the base URL is always defined
const BASE_URL = process.env.URL || "http://localhost:3000";
if (!BASE_URL.startsWith("http://") && !BASE_URL.startsWith("https://")) {
    throw new Error("Invalid BASE_URL: must start with http:// or https://");
}

// Function to place user order from frontend
const placeOrder = async (req, res) => {
    console.log("Base URL:", BASE_URL);

    try {
        // Create a new order in the database
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
            discount: req.body.discount,
            delivery: req.body.delivery
        });
        await newOrder.save();

        // Clear user's cart data
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        // Prepare line items for Stripe Checkout
        const lineItems = req.body.items.map((item) => ({
            price_data: {
                currency: "inr",
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }));

        // Add delivery charges to line items
        lineItems.push({
            price_data: {
                currency: "inr",
                product_data: {
                    name: "Delivery Charges"
                },
                unit_amount: req.body.delivery * 100
            },
            quantity: 1
        });

        // Create a discount coupon in Stripe
        const discountCoupon = await stripe.coupons.create({
            amount_off: req.body.discount * 100,
            currency: "inr",
            duration: "once"
        });

        // Create a Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            line_items: lineItems,
            mode: "payment",
            discounts: [{ coupon: discountCoupon.id }],
            success_url: `${BASE_URL}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${BASE_URL}/verify?success=false&orderId=${newOrder._id}`
        });

        res.json({ success: true, session_url: session.url });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false, message: "Error placing order" });
    }
};
// Function to verify an order's payment status
const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body;
    try {
        if (success) {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Payment successful" });
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false, message: "Payment failed, order deleted" });
        }
    } catch (error) {
        console.error("Error verifying order:", error);
        res.status(500).json({ success: false, message: "Error verifying order" });
    }
};

// Function to retrieve user orders
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("Error retrieving user orders:", error);
        res.status(500).json({ success: false, message: "Error retrieving user orders" });
    }
};

// Function to list all orders for admin
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("Error listing orders:", error);
        res.status(500).json({ success: false, message: "Error listing orders" });
    }
};

// Function to update an order's status
const updateStatus = async (req, res) => {
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status });
        res.json({ success: true, message: "Order status updated" });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: "Error updating order status" });
    }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };