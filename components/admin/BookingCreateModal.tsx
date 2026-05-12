import React, { useState, useEffect } from 'react';
import { Product, Session, BookingItem } from '../../types';
import { getProducts, getSessionsForProduct, addBooking } from '../../services/firestoreService';
import LoadingSpinner from '../common/LoadingSpinner';

interface BookingCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const BookingCreateModal: React.FC<BookingCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);

    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [customerFullName, setCustomerFullName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            const data = await getProducts();
            setProducts(data.filter(c => !c.isHidden));
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        if (!selectedProductId) {
            setSessions([]);
            return;
        }
        const fetchSessions = async () => {
            setIsLoadingSessions(true);
            const data = await getSessionsForProduct(selectedProductId);
            setSessions(data.filter(s => s.remainingSlots > 0));
            setIsLoadingSessions(false);
        };
        fetchSessions();
    }, [selectedProductId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const product = products.find(c => c.id === selectedProductId);
            const session = sessions.find(s => s.id === selectedSessionId);

            if (!product || !session) throw new Error("Please select product and session.");

            const bookingItem: BookingItem = {
                productId: product.id,
                productName: product.name,
                productType: product.type,
                sessionId: session.id,
                sessionDate: session.date,
                price: product.price,
                category: product.category,
                quantity: quantity
            };

            await addBooking({
                customerFullName,
                customerEmail,
                customerPhone,
                items: [bookingItem],
                totalAmount: course.price * quantity,
                paymentStatus: 'paid', // Admin created bookings are assumed paid/manual
                syncStatus: 'pending',
                bookingDate: new Date()
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to create booking");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
                <h2 className="text-xl font-bold mb-4">Create Manual Booking</h2>
                {error && <p className="text-red-500 mb-4 text-sm bg-red-50 p-2 rounded">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Product</label>
                        <select
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                            required
                        >
                            <option value="">Select Product</option>
                            {products.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Session</label>
                        {isLoadingSessions ? <div className="text-xs text-slate-500">Loading sessions...</div> : (
                            <select
                                value={selectedSessionId}
                                onChange={e => setSelectedSessionId(e.target.value)}
                                className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                                required
                                disabled={!selectedProductId}
                            >
                                <option value="">Select Session</option>
                                {sessions.map(s => <option key={s.id} value={s.id}>{s.date} ({s.remainingSlots} slots)</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value))}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                            required
                        />
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-slate-700">Customer Name</label>
                        <input
                            type="text"
                            value={customerFullName}
                            onChange={e => setCustomerFullName(e.target.value)}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Phone</label>
                        <input
                            type="text"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            value={customerEmail}
                            onChange={e => setCustomerEmail(e.target.value)}
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2"
                            required
                        />
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {isLoading ? 'Creating...' : 'Create Booking'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingCreateModal;
