import React, { useState } from 'react';
import { Booking } from '../../types';
import { functions } from '../../services/firebase';
import { httpsCallable } from 'firebase/functions';

interface BookingDetailsModalProps {
    booking: Booking | null;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ booking, onClose, onUpdate }) => {
    const [syncing, setSyncing] = useState(false);

    if (!booking) return null;

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            const syncFn = httpsCallable(functions, 'syncToLoyverse');
            const result = await syncFn({ bookingId: booking.id });
            const data = result.data as any;

            if (data.success) {
                alert("Synced successfully!");
                onUpdate(); // Refresh parent data
                onClose();
            } else {
                alert(`Sync failed: ${data.error}`);
            }
        } catch (error: any) {
            console.error("Manual sync failed:", error);
            alert(`Sync error: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return "N/A";
        // Handle Firestore Timestamp or Date object
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return d.toLocaleString();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center sticky top-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Booking Details</h3>
                        <p className="text-sm text-slate-500">ID: {booking.id}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Status Banner */}
                    <div className="flex flex-wrap gap-4">
                        <div className={`flex-1 p-4 rounded-xl border ${booking.paymentStatus === 'paid' ? 'bg-green-50 border-green-200' :
                                booking.paymentStatus === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                            }`}>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Status</p>
                            <p className={`text-lg font-bold ${booking.paymentStatus === 'paid' ? 'text-green-700' :
                                    booking.paymentStatus === 'pending' ? 'text-yellow-700' : 'text-red-700'
                                }`}>{booking.paymentStatus.toUpperCase()}</p>
                        </div>

                        <div className={`flex-1 p-4 rounded-xl border ${booking.syncStatus === 'synced' ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Loyverse Sync</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-lg font-bold ${booking.syncStatus === 'synced' ? 'text-indigo-700' : 'text-slate-600'}`}>
                                    {booking.syncStatus ? booking.syncStatus.toUpperCase() : 'PENDING'}
                                </p>
                                {booking.paymentStatus === 'paid' && booking.syncStatus !== 'synced' && (
                                    <button
                                        onClick={handleManualSync}
                                        disabled={syncing}
                                        className="ml-auto px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                                    >
                                        {syncing ? 'Syncing...' : 'Sync Now'}
                                    </button>
                                )}
                            </div>
                            {booking.syncError && <p className="text-xs text-red-500 mt-1">{booking.syncError}</p>}
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Customer Information</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-500">Name</span>
                                    <span className="font-medium text-slate-900">{booking.customerFullName}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-500">Email</span>
                                    <span className="font-medium text-slate-900">{booking.customerEmail}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-500">Phone</span>
                                    <span className="font-medium text-slate-900">{booking.customerPhone}</span>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Info */}
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Transaction Details</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-500">Date</span>
                                    <span className="font-medium text-slate-900">{formatDate(booking.bookingDate)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-500">Bill Code</span>
                                    <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{(booking as any).billcode || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-slate-500">Total Amount</span>
                                    <span className="font-bold text-slate-900">RM {booking.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Purchased Items</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Course</th>
                                        <th className="px-4 py-3 text-center">Session</th>
                                        <th className="px-4 py-3 text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {booking.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{item.courseName}</div>
                                                <div className="text-xs text-slate-500">Qty: {item.quantity}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-600">{item.sessionDate}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-900">RM {item.price.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
                    <button onClick={onClose} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition">
                        Close
                    </button>
                    {/* Only show Payment Link if pending */}
                    {booking.paymentStatus === 'pending' && (
                        <a
                            href={`https://bizappay.my/payment/link/${/* Theoretical link gen */ ''}`} // Ideally we'd have the link stored
                            target="_blank" rel="noreferrer"
                            className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                        >
                            Retry Payment
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingDetailsModal;
