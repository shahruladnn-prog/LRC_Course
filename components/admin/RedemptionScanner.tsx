import React, { useState } from 'react';
import { getRedemptionByCode, redeemItem } from '../../services/firestoreService';
import { Redemption } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

const RedemptionScanner: React.FC = () => {
    const [code, setCode] = useState('');
    const [staffName, setStaffName] = useState('Admin');
    const [redemption, setRedemption] = useState<Redemption | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!code.trim()) return;
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        setRedemption(null);
        try {
            const result = await getRedemptionByCode(code.trim());
            if (result) {
                setRedemption(result);
            } else {
                setError('No redemption found with that code.');
            }
        } catch (e: any) {
            setError(e.message || 'Error searching for redemption.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (!redemption || !staffName.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            await redeemItem(redemption.id, staffName.trim());
            setSuccessMsg(`Successfully redeemed by ${staffName.trim()}!`);
            setRedemption({ ...redemption, status: 'redeemed', redeemedBy: staffName.trim(), redeemedAt: new Date().toISOString() });
        } catch (e: any) {
            setError(e.message || 'Error redeeming item.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Section */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Redemption Scanner</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter redemption code..."
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !code.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg transition disabled:opacity-50"
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </div>
                {error && <p className="mt-3 text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
                {successMsg && <p className="mt-3 text-green-600 text-sm bg-green-50 p-3 rounded-lg">{successMsg}</p>}
            </div>

            {/* Result Section */}
            {isLoading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}
            {redemption && (
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Redemption Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-500">Code</span>
                                <span className="font-mono font-bold text-slate-900">{redemption.code}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-500">Customer</span>
                                <span className="font-medium text-slate-900">{redemption.customerName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-500">Item</span>
                                <span className="font-medium text-slate-900">{redemption.itemName || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-500">Type</span>
                                <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${redemption.itemType === 'ticket' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {redemption.itemType === 'ticket' ? '🎫 Ticket' : '👕 Merchandise'}
                                </span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-slate-500">Status</span>
                                <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${redemption.status === 'redeemed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {redemption.status.toUpperCase()}
                                </span>
                            </div>
                            {redemption.status === 'redeemed' && (
                                <div className="flex justify-between border-b pb-1">
                                    <span className="text-slate-500">Redeemed by</span>
                                    <span className="font-medium text-slate-900">{redemption.redeemedBy} at {redemption.redeemedAt ? new Date(redemption.redeemedAt).toLocaleString() : 'N/A'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {redemption.status === 'pending' && (
                        <div className="mt-6 pt-4 border-t border-slate-200">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700">Staff Name:</label>
                                <input
                                    type="text"
                                    value={staffName}
                                    onChange={e => setStaffName(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                                    placeholder="Your name"
                                />
                                <button
                                    onClick={handleRedeem}
                                    disabled={isLoading || !staffName.trim()}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg transition disabled:opacity-50"
                                >
                                    {isLoading ? 'Redeeming...' : '✅ Redeem'}
                                </button>
                            </div>
                        </div>
                    )}
                    {redemption.status === 'redeemed' && (
                        <div className="mt-6 pt-4 border-t border-slate-200">
                            <p className="text-green-700 font-semibold text-center">✅ Already redeemed</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RedemptionScanner;
