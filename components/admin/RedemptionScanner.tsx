import React, { useState } from 'react';
import { getBookingsByPhone, getRedemptionsByBooking, redeemItem } from '../../services/firestoreService';
import { Booking, Redemption } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

const RedemptionScanner: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [staffName, setStaffName] = useState('Admin');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [redemptionMap, setRedemptionMap] = useState<Record<string, Redemption>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [redeemingId, setRedeemingId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!phone.trim()) return;
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        setBookings([]);
        setRedemptionMap({});
        try {
            const results = await getBookingsByPhone(phone.trim());
            if (results.length === 0) {
                setError('No paid bookings found for this phone number.');
            } else {
                setBookings(results);
                // Fetch redemptions for all found bookings
                const allRedemptions: Record<string, Redemption> = {};
                for (const b of results) {
                    try {
                        const reds = await getRedemptionsByBooking(b.id);
                        reds.forEach(r => { allRedemptions[r.id] = r; });
                    } catch (_) { /* skip if no redemptions */ }
                }
                setRedemptionMap(allRedemptions);
            }
        } catch (e: any) {
            setError(e.message || 'Error searching for bookings.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRedeem = async (redemptionId: string) => {
        if (!staffName.trim()) return;
        setRedeemingId(redemptionId);
        setError(null);
        setSuccessMsg(null);
        try {
            await redeemItem(redemptionId, staffName.trim());
            setSuccessMsg(`Successfully redeemed by ${staffName.trim()}!`);
            setRedemptionMap(prev => ({
                ...prev,
                [redemptionId]: {
                    ...prev[redemptionId],
                    status: 'redeemed',
                    redeemedBy: staffName.trim(),
                    redeemedAt: new Date().toISOString()
                }
            }));
        } catch (e: any) {
            setError(e.message || 'Error redeeming item.');
        } finally {
            setRedeemingId(null);
        }
    };

    const getRedemptionStatus = (redemptionId: string): Redemption | undefined => {
        return redemptionMap[redemptionId];
    };

    return (
        <div className="space-y-6">
            {/* Search Section */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-slate-800 mb-4">📱 Check-in by Phone</h2>
                <p className="text-sm text-slate-500 mb-3">Enter the customer's phone number to view all their bookings.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter phone number (e.g. 0123456789)..."
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !phone.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg transition disabled:opacity-50"
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </div>
                {error && <p className="mt-3 text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
                {successMsg && <p className="mt-3 text-green-600 text-sm bg-green-50 p-3 rounded-lg">{successMsg}</p>}
            </div>

            {/* Results Section */}
            {isLoading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}

            {bookings.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Staff:</span>
                        <input
                            type="text"
                            value={staffName}
                            onChange={e => setStaffName(e.target.value)}
                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-40"
                            placeholder="Your name"
                        />
                    </div>
                    {bookings.map(booking => (
                        <div key={booking.id} className="bg-white p-6 rounded-xl shadow-md">
                            <div className="flex flex-wrap justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{booking.customerFullName}</h3>
                                    <p className="text-sm text-slate-500">
                                        Booking #{booking.id.slice(0, 8)}... · {' '}
                                        {new Date((booking.bookingDate as any)?.seconds * 1000).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                    PAID
                                </span>
                            </div>

                            {/* Items Table */}
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Item</th>
                                        <th className="px-3 py-2 text-center">Qty</th>
                                        <th className="px-3 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {booking.items.map((item, idx) => {
                                        const ticketCode = `${booking.id}-${idx}`;
                                        const ticketRedemption = getRedemptionStatus(ticketCode);
                                        return (
                                            <React.Fragment key={ticketCode}>
                                                {/* Main ticket row */}
                                                <tr>
                                                    <td className="px-3 py-3">
                                                        <div className="font-medium text-slate-900">{item.productName}</div>
                                                        {item.sessionDate && (
                                                            <div className="text-xs text-slate-400">{item.sessionDate}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">{item.quantity}</td>
                                                    <td className="px-3 py-3 text-right">
                                                        {ticketRedemption?.status === 'redeemed' ? (
                                                            <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                                                                ✅ Redeemed
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleRedeem(ticketCode)}
                                                                disabled={!staffName.trim() || redeemingId === ticketCode}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                                                            >
                                                                {redeemingId === ticketCode ? '...' : 'Redeem'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* Add-on rows */}
                                                {item.addOns && item.addOns.map((addon, ai) => {
                                                    const addonQty = addon.quantity || 1;
                                                    return Array.from({ length: addonQty }).map((_, aqi) => {
                                                        const merchCode = addonQty > 1
                                                            ? `${booking.id}-${idx}-addon-${ai}-${aqi}`
                                                            : `${booking.id}-${idx}-addon-${ai}`;
                                                        const merchRedemption = getRedemptionStatus(merchCode);
                                                        return (
                                                            <tr key={merchCode} className="bg-slate-50">
                                                                <td className="px-3 py-2 pl-6">
                                                                    <div className="text-sm text-slate-600">
                                                                        ↳ 🎁 {addon.name}{addon.variant ? ` (${addon.variant})` : ''}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2 text-center text-slate-400">1</td>
                                                                <td className="px-3 py-2 text-right">
                                                                    {merchRedemption?.status === 'redeemed' ? (
                                                                        <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                                                                            ✅ Redeemed
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleRedeem(merchCode)}
                                                                            disabled={!staffName.trim() || redeemingId === merchCode}
                                                                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                                                                        >
                                                                            {redeemingId === merchCode ? '...' : 'Redeem'}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RedemptionScanner;
