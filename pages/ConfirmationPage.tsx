import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
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
        const fetchBooking = async () => {
            if (!bookingId) return;
            const docRef = doc(db, 'bookings', bookingId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) setBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
            setLoading(false);
        };
        fetchBooking();
    }, [bookingId]);

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;
    if (!booking) return <div className="text-center py-20">Booking not found.</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <main className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-xl text-center">
                <Logo />
                <div className={`mt-6 p-4 rounded-lg ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {booking.paymentStatus === 'paid' ? 'Payment Successful!' : 'Payment is being processed...'}
                </div>
                <h1 className="text-2xl font-bold mt-4">Order Summary</h1>
                <div className="text-left mt-6 border-t pt-4">
                    {booking.items.map((item, i) => (
                        <div key={i} className="flex justify-between py-2 border-b">
                            <span>{item.courseName} (x{item.quantity})</span>
                            <span>RM{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="font-bold text-xl mt-4 flex justify-between">
                        <span>Total:</span>
                        <span>RM{booking.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
                <Link to="/" className="mt-8 inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg">Back to Home</Link>
            </main>
        </div>
    );
};

export default OrderConfirmationPage;