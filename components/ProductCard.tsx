import React, { useState, useEffect } from 'react';
import { Product, Session, CartItem, CartAddOn } from '../types';
import { getSessionsForProduct } from '../services/firestoreService';
import { useCart } from '../hooks/useCart';
import LoadingSpinner from './common/LoadingSpinner';
import TermsModal from './common/TermsModal';

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const { items, addItem } = useCart();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    // Add-on state
    const [addTshirt, setAddTshirt] = useState(false);
    const [tshirtSize, setTshirtSize] = useState('');

    const needsSession = product.type === 'course' || product.type === 'event_ticket';
    const isFullyBooked = needsSession && !isLoadingSessions && sessions.length > 0 && sessions.every(s => s.remainingSlots <= 0);

    // Fetch sessions if needed
    useEffect(() => {
        if (!needsSession) return;
        setIsLoadingSessions(true);
        getSessionsForProduct(product.id).then(data => {
            const sorted = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setSessions(sorted);
            const firstAvail = sorted.find(s => s.remainingSlots > 0);
            setSelectedSessionId(firstAvail?.id || sorted[0]?.id || null);
            setIsLoadingSessions(false);
        });
    }, [product.id, needsSession]);

    // Reset add-on when product changes
    useEffect(() => {
        setAddTshirt(false);
        setTshirtSize('');
        setQuantity(1);
    }, [product.id]);

    const selectedSession = sessions.find(s => s.id === selectedSessionId);
    const cartId = `${product.id}-${selectedSessionId || 'nosession'}`;
    const isItemInCart = items.some(item => item.cartId === cartId);

    const hasAddOns = product.hasAddOns && product.addOns && product.addOns.length > 0;
    const tshirtAddOn = hasAddOns ? product.addOns![0] : null;

    // Calculate effective price per unit
    const effectivePrice = product.price + (addTshirt && tshirtAddOn ? tshirtAddOn.price : 0);

    const handleAgreeAndAddToCart = () => {
        const addOns: CartAddOn[] = [];
        if (addTshirt && tshirtSize && tshirtAddOn) {
            addOns.push({
                addOnId: tshirtAddOn.id,
                name: tshirtAddOn.name,
                variant: tshirtSize,
                price: tshirtAddOn.price,
            });
        }

        const cartItem: CartItem = {
            cartId,
            productId: product.id,
            productName: product.name,
            productType: product.type,
            sessionId: selectedSession?.id,
            sessionDate: selectedSession?.date,
            price: product.price,
            category: product.category,
            quantity,
            addOns: addOns.length > 0 ? addOns : undefined,
        };
        addItem(cartItem);
        setIsTermsModalOpen(false);
    };

    // Slots calculation (for session-based products)
    const existingCartItem = selectedSessionId ? items.find(item => item.cartId === cartId) : undefined;
    const availableSlotsForBooking = selectedSession
        ? selectedSession.remainingSlots - (existingCartItem?.quantity || 0)
        : 99; // Unlimited for non-session products

    const productLabel =
        product.type === 'course' ? 'Course' :
        product.type === 'event_ticket' ? 'Event' :
        'Entrance';

    const typeBadgeColor =
        product.type === 'course' ? 'bg-blue-50 text-blue-700' :
        product.type === 'event_ticket' ? 'bg-green-50 text-green-700' :
        'bg-purple-50 text-purple-700';

    return (
        <>
            <div className={`group bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 ring-1 ring-slate-900/5 ${isFullyBooked && !isLoadingSessions ? 'opacity-80 grayscale-[0.5]' : ''}`}>

                {/* Fully Booked Overlay */}
                {isFullyBooked && !isLoadingSessions && (
                    <div className="absolute inset-0 bg-slate-900/40 z-10 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white/95 text-red-600 px-6 py-2 rounded-lg font-bold text-xl shadow-2xl transform -rotate-6 border-2 border-red-500">
                            SOLD OUT
                        </div>
                    </div>
                )}

                {/* Category & Price Header */}
                <div className="p-6 pb-2">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${typeBadgeColor}`}>
                            {product.category}
                        </span>
                        <div className="text-right">
                            <span className="block text-2xl font-extrabold text-slate-900">RM{product.price.toFixed(0)}</span>
                            <span className="text-xs text-slate-400 font-medium">per person</span>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors mb-2">
                        {product.name}
                    </h2>
                    {product.type && (
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${typeBadgeColor}`}>
                            {productLabel}
                        </span>
                    )}
                    {product.importantHighlight && (
                        <div className="mt-3 text-xs bg-amber-50 text-amber-800 px-3 py-2 rounded-lg border border-amber-100 flex gap-2">
                            <span className="font-bold shrink-0">Note:</span> {product.importantHighlight}
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="px-6 py-2 flex-grow space-y-4">
                    {/* Session Selector (for courses & event tickets) */}
                    {needsSession && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Choose Date</label>
                            <div className="relative">
                                {isLoadingSessions ? (
                                    <div className="h-10 w-full bg-slate-100 animate-pulse rounded-lg"></div>
                                ) : (
                                    <select
                                        className="w-full bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2.5"
                                        onChange={(e) => setSelectedSessionId(e.target.value)}
                                        value={selectedSessionId || ""}
                                    >
                                        {sessions.length === 0 ? <option disabled>No dates available</option> : null}
                                        {sessions.map(session => (
                                            <option key={session.id} value={session.id} disabled={session.remainingSlots <= 0}>
                                                {session.date} {session.remainingSlots <= 0 ? '(Full)' : `(${session.remainingSlots} slots)`}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Event Date for entrance tickets without sessions */}
                    {product.type === 'entrance_ticket' && product.eventDate && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Date</label>
                            <p className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">{product.eventDate}</p>
                        </div>
                    )}

                    {/* Quantity Selector */}
                    {(!needsSession || (selectedSession && availableSlotsForBooking > 0)) && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold transition"
                                >-</button>
                                <input
                                    type="number"
                                    min="1"
                                    max={availableSlotsForBooking}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.min(availableSlotsForBooking, Math.max(1, parseInt(e.target.value) || 1)))}
                                    className="flex-1 text-center font-bold text-slate-800 border-none bg-slate-50 rounded-lg focus:ring-0 h-10"
                                />
                                <button
                                    onClick={() => setQuantity(Math.min(availableSlotsForBooking, quantity + 1))}
                                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold transition"
                                >+</button>
                            </div>
                        </div>
                    )}

                    {/* Add-on Section (T-shirt) */}
                    {hasAddOns && tshirtAddOn && (!needsSession || selectedSession) && (
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={addTshirt}
                                    onChange={(e) => {
                                        setAddTshirt(e.target.checked);
                                        if (e.target.checked && !tshirtSize && tshirtAddOn.variants.length > 0) {
                                            setTshirtSize(tshirtAddOn.variants[0]);
                                        }
                                    }}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                />
                                <span className="text-sm font-medium text-slate-700">
                                    Add {tshirtAddOn.name} <span className="text-indigo-600 font-bold">+RM{tshirtAddOn.price.toFixed(0)}</span>
                                </span>
                            </label>
                            {addTshirt && (
                                <div className="ml-7">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        {tshirtAddOn.variantField}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {tshirtAddOn.variants.map(v => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setTshirtSize(v)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                                                    tshirtSize === v
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                        : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                                                }`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Effective Price Display */}
                    {addTshirt && tshirtAddOn && (
                        <div className="text-xs text-slate-500 text-center">
                            Per unit: RM{product.price.toFixed(0)} + RM{tshirtAddOn.price.toFixed(0)} = <span className="font-bold text-slate-700">RM{effectivePrice.toFixed(0)}</span>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-4 mt-auto">
                    {/* Availability Status */}
                    {needsSession && selectedSession && (
                        <div className={`mb-3 text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
                            availableSlotsForBooking > 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                            {availableSlotsForBooking > 0 ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    {availableSlotsForBooking} slots available
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Session Full
                                </>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => setIsTermsModalOpen(true)}
                        disabled={
                            (needsSession && (!selectedSession || availableSlotsForBooking <= 0)) ||
                            (addTshirt && !tshirtSize)
                        }
                        className="w-full bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-slate-200 transition-all duration-300 hover:bg-indigo-600 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isItemInCart ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Update Cart ({quantity})
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                                </svg>
                                Add to Cart
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Terms & Conditions Modal */}
            {isTermsModalOpen && (
                <TermsModal
                    title={product.name}
                    terms={product.termsAndConditions}
                    onAgree={handleAgreeAndAddToCart}
                    onCancel={() => setIsTermsModalOpen(false)}
                />
            )}
        </>
    );
};

export default ProductCard;
