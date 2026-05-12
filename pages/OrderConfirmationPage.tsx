import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../services/firebase';
import { Booking } from '../types';
import { QRCodeSVG } from 'qrcode.react';
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
                            <span>{item.productName} (x{item.quantity})</span>
                            <span>RM{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between font-bold text-xl mt-4">
                        <span>Total:</span>
                        <span>RM{booking.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                {/* Redemption Codes & QR Codes */}
                {booking.paymentStatus === 'paid' && (
                  <div className="text-left mt-8 border-t pt-4">
                    <h2 className="font-semibold mb-2 text-lg">🎫 Your Tickets & Redemption Codes</h2>
                    <p className="text-xs text-slate-500 mb-4">
                      Screenshot or save this page. Show the QR code at the event for check-in.
                    </p>
                    <div className="space-y-4">
                      {booking.items.map((item, i) => {
                        const ticketCode = `${booking.id}-${i}`;
                        return (
                          <div key={ticketCode} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                            <p className="font-bold text-slate-800">
                              {item.productName}
                              {item.sessionDate && (
                                <span className="text-sm font-normal text-slate-500 ml-2">
                                  — {item.sessionDate}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Qty: {item.quantity} · Code: <code className="bg-slate-200 px-1 rounded">{ticketCode}</code>
                            </p>
                            <div className="mt-3 flex justify-center">
                              <QRCodeSVG
                                value={ticketCode}
                                size={120}
                                bgColor="#ffffff"
                                fgColor="#1e293b"
                                level="M"
                              />
                            </div>
                            {/* Add-on redemptions */}
                            {item.addOns && item.addOns.map((addon, addIdx) => {
                              const addonQty = addon.quantity || 1;
                              return Array.from({ length: addonQty }).map((_, qtyIdx) => {
                                const merchCode = addonQty > 1
                                  ? `${booking.id}-${i}-addon-${addIdx}-${qtyIdx}`
                                  : `${booking.id}-${i}-addon-${addIdx}`;
                                return (
                                  <div key={merchCode} className="mt-3 ml-4 border-l-2 border-indigo-200 pl-4">
                                    <p className="text-sm font-medium text-indigo-700">
                                      🎁 {addon.name}{addon.variant ? ` (${addon.variant})` : ''}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Code: <code className="bg-slate-200 px-1 rounded">{merchCode}</code>
                                    </p>
                                    <div className="mt-2 flex justify-center">
                                      <QRCodeSVG
                                        value={merchCode}
                                        size={100}
                                        bgColor="#ffffff"
                                        fgColor="#4338ca"
                                        level="M"
                                      />
                                    </div>
                                  </div>
                                );
                              });
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Link to="/" className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg inline-block transition-colors">Back to Home</Link>
            </main>
        </div>
    );
};

export default OrderConfirmationPage;