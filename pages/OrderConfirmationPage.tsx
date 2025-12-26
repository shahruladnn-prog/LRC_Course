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
        const fetch = async () => {
            if (!bookingId) return;
            const snap = await getDoc(doc(db, 'bookings', bookingId));
            if (snap.exists()) setBooking({ id: snap.id, ...snap.data() } as Booking);
            setLoading(false);
        };
        fetch();
    }, [bookingId]);

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;
    if (!booking) return <div className="text-center py-20">Booking Not Found</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <main className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-xl text-center">
                <Logo />
                <div className={`mt-6 p-4 rounded-lg font-bold ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {booking.paymentStatus === 'paid' ? 'Payment Confirmed!' : 'Waiting for payment confirmation...'}
                </div>
                <div className="text-left mt-8 border-t pt-4">
                    {booking.items.map((item, i) => (
                        <div key={i} className="flex justify-between py-2 border-b"><span>{item.courseName} (x{item.quantity})</span><span>RM{(item.price * item.quantity).toFixed(2)}</span></div>
                    ))}
                    <div className="flex justify-between font-bold text-xl mt-4"><span>Total:</span><span>RM{booking.totalAmount.toFixed(2)}</span></div>
                </div>
                <Link to="/" className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-lg inline-block">Home</Link>
            </main>
        </div>
    );
};

export default OrderConfirmationPage;