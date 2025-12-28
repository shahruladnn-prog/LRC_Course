import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore'; // Changed to onSnapshot
import { db } from '../services/firebase';
import { Booking } from '../types';
import Logo from '../components/common/Logo';
import LoadingSpinner from '../components/common/LoadingSpinner';

const OrderConfirmationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bookingId) return;

        // REAL-TIME LISTENER: Updates instantly when payment succeeds
        const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (docSnap) => {
            if (docSnap.exists()) {
                setBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [bookingId]);

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;
    if (!booking) return <div className="text-center py-20">Booking Not Found</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <main className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-xl text-center">
                <Logo />
                <div className={`mt-6 p-4 rounded-lg font-bold transition-colors duration-500 ${
                    booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                    {booking.paymentStatus === 'paid' ? (
                        <div className="flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Payment Confirmed!
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <LoadingSpinner />
                            <span>Waiting for payment confirmation...</span>
                        </div>
                    )}
                </div>
                
                <div className="text-left mt-8 border-t pt-4">
                     <h2 className="font-semibold mb-4 text-lg">Order Details</h2>
                    {booking.items.map((item, i) => (
                        <div key={i} className="flex justify-between py-2 border-b">
                            <span>{item.courseName} (x{item.quantity})</span>
                            <span>RM{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between font-bold text-xl mt-4">
                        <span>Total:</span>
                        <span>RM{booking.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
                <Link to="/" className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg inline-block transition-colors">Back to Home</Link>
            </main>
        </div>
    );
};

export default OrderConfirmationPage;