import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { addBooking } from '../services/firestoreService';
import { functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { BookingItem } from '../types';
import Logo from '../components/common/Logo';

// RESTORED: Helper to check if a session is within 7 days
const isWithin7Days = (dateString: string): boolean => {
    const sessionDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return sessionDate >= today && sessionDate <= sevenDaysFromNow;
};

const CartPage: React.FC = () => {
    const { items, removeItem, totalAmount, clearCart, updateItemQuantity } = useCart();
    const navigate = useNavigate();

    const [customerFullName, setCustomerFullName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UPDATED: handleCheckout now redirects to Bizappay
    const handleCheckout = async () => {
        if (!customerFullName || !customerEmail || !customerPhone) {
            setError("Please fill in your Full Name, Email, and Phone Number.");
            return;
        }
        setError(null);
        setIsProcessing(true);

        const bookingItems: BookingItem[] = items.map(item => ({
            courseId: item.courseId,
            courseName: item.courseName,
            sessionId: item.sessionId,
            sessionDate: item.sessionDate,
            price: item.price,
            category: item.category,
            quantity: item.quantity,
        }));

        try {
            // 1. Create the initial booking document with 'pending' status
            const bookingId = await addBooking({
                customerFullName,
                customerPhone,
                customerEmail,
                items: bookingItems,
                totalAmount,
                paymentStatus: 'pending',
                bookingDate: new Date(),
            });

            // 2. Call the NEW Cloud Function to create the payment link
            const createBizappayBill = httpsCallable(functions, 'createBizappayBill');
            const result = await createBizappayBill({ 
                bookingId, 
                amount: totalAmount,
                customerName: customerFullName,
                customerEmail: customerEmail,
                customerPhone: customerPhone
            });
            
            // 3. Redirect the user to the Bizappay Payment Page
            const paymentUrl = (result.data as any)?.url;
            if (paymentUrl) {
                clearCart();
                window.location.href = paymentUrl;
            } else {
                throw new Error("Could not generate payment link. Please try again.");
            }

        } catch (e: any) {
            console.error("Checkout failed:", e);
            setError(e.message || "An error occurred during checkout. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white shadow-sm">
                 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Logo />
                </div>
            </header>
            <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">Your Shopping Cart</h1>
                {items.length === 0 ? (
                    <div className="text-center bg-white p-12 rounded-xl shadow-md">
                        <h2 className="text-2xl font-bold text-slate-800">Your cart is empty</h2>
                        <p className="text-slate-500 mt-2 mb-6">Looks like you haven't added any courses yet.</p>
                        <Link to="/" className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-transform hover:scale-105 inline-block">
                            Browse Courses
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-md space-y-4">
                             <h2 className="text-xl font-semibold text-slate-800 border-b pb-4">Order Summary</h2>
                            <ul className="divide-y divide-slate-200">
                                {items.map(item => (
                                    <li key={item.cartId} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex-grow w-full">
                                            <p className="font-semibold text-slate-800">{item.courseName}</p>
                                            <p className="text-sm text-slate-500">Date: {item.sessionDate}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <label htmlFor={`qty-${item.cartId}`} className="text-sm font-medium text-slate-600">Qty:</label>
                                                <input
                                                    id={`qty-${item.cartId}`}
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItemQuantity(item.cartId, parseInt(e.target.value, 10) || 1)}
                                                    min="1"
                                                    className="w-16 px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 sm:mt-0 self-end sm:self-center">
                                            {isWithin7Days(item.sessionDate) && (
                                                <span className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Upcoming</span>
                                            )}
                                            <div className="text-right">
                                                <p className="font-semibold text-slate-800">RM{(item.price * item.quantity).toFixed(2)}</p>
                                                {item.quantity > 1 && <p className="text-xs text-slate-500">({item.quantity} x RM{item.price.toFixed(2)})</p>}
                                            </div>
                                            <button onClick={() => removeItem(item.cartId)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md lg:sticky top-28">
                            <h2 className="text-xl font-semibold text-slate-800 mb-4 border-b pb-4">Checkout Details</h2>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Full Name</label>
                                    <input type="text" value={customerFullName} onChange={e => setCustomerFullName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                                    <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Email Address</label>
                                    <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"/>
                                    <p className="mt-2 text-xs text-slate-500">
                                        Please ensure your email is valid. Your indemnity form and payment receipt will be sent here.
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-slate-200 pt-4">
                                <div className="flex justify-between font-bold text-lg text-slate-900 mb-4">
                                    <span>Total:</span>
                                    <span>RM{totalAmount.toFixed(2)}</span>
                                </div>
                                {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
                                <button
                                    onClick={handleCheckout}
                                    disabled={isProcessing}
                                    className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                >
                                    {isProcessing ? 'Redirecting to Payment Gateway...' : 'Proceed to Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CartPage;