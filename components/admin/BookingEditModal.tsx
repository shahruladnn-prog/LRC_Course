import React, { useState } from 'react';
import { Booking } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface BookingEditModalProps {
    booking: Booking | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const BookingEditModal: React.FC<BookingEditModalProps> = ({ booking, isOpen, onClose, onSuccess }) => {
    const [status, setStatus] = useState(booking?.paymentStatus || 'pending');
    const [fullName, setFullName] = useState(booking?.customerFullName || '');
    const [phone, setPhone] = useState(booking?.customerPhone || '');
    const [email, setEmail] = useState(booking?.customerEmail || '');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const bookingRef = doc(db, 'bookings', booking.id);
            await updateDoc(bookingRef, {
                paymentStatus: status,
                customerFullName: fullName,
                customerPhone: phone,
                customerEmail: email
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update booking.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4">Edit Booking</h2>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Payment Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                        >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Customer Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Phone</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                        />
                    </div>
                    <div className="flex gap-4 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {isLoading ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingEditModal;
