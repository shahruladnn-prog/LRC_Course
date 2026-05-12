import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Product, Session, CartItem, CartAddOn } from '../types';
import { getProducts, getSessionsForProduct } from '../services/firestoreService';
import { useCart } from '../hooks/useCart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TermsModal from '../components/common/TermsModal';
import Logo from '../components/common/Logo';

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { items, addItem } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Session state
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    // Quantity & add-on state
    const [quantity, setQuantity] = useState(1);
    const [addTshirt, setAddTshirt] = useState(false);
    const [tshirtSize, setTshirtSize] = useState('');
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Fetch product
    useEffect(() => {
        const fetchProduct = async () => {
            setIsLoading(true);
            try {
                const allProducts = await getProducts();
                const found = allProducts.find(p => p.id === id);
                if (found && !found.isHidden) {
                    setProduct(found);
                } else {
                    setNotFound(true);
                }
            } catch (error) {
                console.error("Failed to fetch product:", error);
                setNotFound(true);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchProduct();
    }, [id]);

    // Fetch sessions when product loads
    useEffect(() => {
        if (!product || (product.type !== 'course' && product.type !== 'event_ticket')) return;
        setIsLoadingSessions(true);
        getSessionsForProduct(product.id).then(data => {
            const sorted = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setSessions(sorted);
            const firstAvail = sorted.find(s => s.remainingSlots > 0);
            setSelectedSessionId(firstAvail?.id || sorted[0]?.id || null);
            setIsLoadingSessions(false);
        });
    }, [product]);

    // Reset add-on and quantity when product/session changes
    useEffect(() => {
        setAddTshirt(false);
        setTshirtSize('');
        setQuantity(1);
        setCurrentImageIndex(0);
    }, [product?.id, selectedSessionId]);

    // Derived values
    const needsSession = product?.type === 'course' || product?.type === 'event_ticket';
    const isFullyBooked = needsSession && !isLoadingSessions && sessions.length > 0 && sessions.every(s => s.remainingSlots <= 0);
    const selectedSession = sessions.find(s => s.id === selectedSessionId);
    const cartId = `${product?.id}-${selectedSessionId || 'nosession'}`;
    const isItemInCart = items.some(item => item.cartId === cartId);

    const hasAddOns = product?.hasAddOns && product?.addOns && product.addOns.length > 0;
    const tshirtAddOn = hasAddOns ? product!.addOns![0] : null;
    const effectivePrice = (product?.price || 0) + (addTshirt && tshirtAddOn ? tshirtAddOn.price : 0);

    // Available slots accounting for existing cart
    const existingCartItem = selectedSessionId ? items.find(item => item.cartId === cartId) : undefined;
    const availableSlotsForBooking = selectedSession
        ? selectedSession.remainingSlots - (existingCartItem?.quantity || 0)
        : 99;

    const images = product?.images || [];
    const hasMultipleImages = images.length > 1;

    const handleAgreeAndAddToCart = () => {
        if (!product) return;
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

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="mt-4 text-slate-500">Loading product...</p>
                </div>
            </div>
        );
    }

    // Not found state
    if (notFound || !product) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center bg-white p-12 rounded-2xl shadow-lg max-w-md">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Product Not Found</h2>
                    <p className="text-slate-500 mb-6">The product you're looking for doesn't exist or has been removed.</p>
                    <Link to="/" className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition">
                        Back to Store
                    </Link>
                </div>
            </div>
        );
    }

    const productLabel =
        product.type === 'course' ? 'Course' :
        product.type === 'event_ticket' ? 'Event' :
        'Entrance';

    const typeBadgeColor =
        product.type === 'course' ? 'bg-blue-50 text-blue-700' :
        product.type === 'event_ticket' ? 'bg-green-50 text-green-700' :
        'bg-purple-50 text-purple-700';

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-3 text-slate-600 hover:text-indigo-600 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-medium">Back to Store</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/cart" className="relative flex items-center gap-2 font-medium px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4h-1.5" />
                            </svg>
                            <span className="hidden sm:inline">Cart</span>
                            {items.reduce((sum, i) => sum + i.quantity, 0) > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">
                                    {items.reduce((sum, i) => sum + i.quantity, 0)}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left: Image Gallery */}
                    <div className="space-y-4">
                        <div className="relative bg-slate-200 rounded-2xl overflow-hidden aspect-[4/3]">
                            {images.length > 0 ? (
                                <img
                                    src={images[currentImageIndex]}
                                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.parentElement!.classList.add('bg-gradient-to-br', 'from-indigo-500', 'to-purple-700', 'flex', 'items-center', 'justify-center');
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center">
                                    <span className="text-white/60 text-lg font-medium">{product.name}</span>
                                </div>
                            )}
                            {/* Sold out banner */}
                            {isFullyBooked && (
                                <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                                    SOLD OUT
                                </div>
                            )}
                        </div>
                        {/* Thumbnail dots */}
                        {hasMultipleImages && (
                            <div className="flex gap-2 justify-center">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Product Info & Purchase */}
                    <div className="space-y-6">
                        {/* Category & Type badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide bg-slate-100 text-slate-600">
                                {product.category}
                            </span>
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${typeBadgeColor}`}>
                                {productLabel}
                            </span>
                            {isFullyBooked && (
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                                    Fully Booked
                                </span>
                            )}
                        </div>

                        {/* Name & Price */}
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">{product.name}</h1>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-indigo-600">RM{product.price.toFixed(0)}</span>
                                <span className="text-sm text-slate-400 font-medium">per person</span>
                            </div>
                        </div>

                        {/* Important Highlight */}
                        {product.importantHighlight && (
                            <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-xl border border-amber-200 text-sm">
                                <span className="font-bold text-amber-900">📌 Note:</span>
                                <span className="whitespace-pre-line ml-1">{product.importantHighlight}</span>
                            </div>
                        )}

                        {/* Session Selector */}
                        {needsSession && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Choose Date</label>
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
                        )}

                        {/* Event Date for entrance tickets */}
                        {product.type === 'entrance_ticket' && product.eventDate && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Date</label>
                                <p className="text-sm font-medium text-slate-700 mt-1">{product.eventDate}</p>
                            </div>
                        )}

                        {/* Quantity Selector */}
                        {(!needsSession || (selectedSession && availableSlotsForBooking > 0)) && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold text-lg transition"
                                    >−</button>
                                    <span className="flex-1 text-center font-bold text-xl text-slate-800">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(Math.min(availableSlotsForBooking, quantity + 1))}
                                        className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold text-lg transition"
                                    >+</button>
                                </div>
                                {needsSession && selectedSession && (
                                    <p className={`text-xs font-medium text-center ${availableSlotsForBooking > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {availableSlotsForBooking > 0 ? `${availableSlotsForBooking} slots available` : 'Session Full'}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Add-on Section */}
                        {hasAddOns && tshirtAddOn && (!needsSession || selectedSession) && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
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
                                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-slate-700">
                                        Add {tshirtAddOn.name} <span className="text-indigo-600 font-bold">+RM{tshirtAddOn.price.toFixed(0)}</span>
                                    </span>
                                </label>
                                {addTshirt && (
                                    <div className="ml-8">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                            {tshirtAddOn.variantField}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {tshirtAddOn.variants.map(v => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => setTshirtSize(v)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${tshirtSize === v
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
                                {addTshirt && tshirtAddOn && (
                                    <p className="text-xs text-slate-500 text-center pt-1">
                                        Per unit: RM{product.price.toFixed(0)} + RM{tshirtAddOn.price.toFixed(0)} = <span className="font-bold text-slate-700">RM{effectivePrice.toFixed(0)}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Terms & Conditions — Collapsible */}
                        <details className="bg-white border border-slate-200 rounded-xl overflow-hidden group">
                            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between text-sm font-medium text-slate-600 hover:text-indigo-600 transition select-none">
                                <span>📋 Terms & Conditions</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div className="px-4 pb-4">
                                <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 max-h-40 overflow-y-auto whitespace-pre-line border border-slate-100">
                                    {product.termsAndConditions}
                                </div>
                            </div>
                        </details>

                        {/* Add to Cart Button */}
                        <button
                            onClick={() => setIsTermsModalOpen(true)}
                            disabled={
                                (needsSession && (!selectedSession || availableSlotsForBooking <= 0)) ||
                                (addTshirt && !tshirtSize) ||
                                isFullyBooked
                            }
                            className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-slate-200 transition-all duration-300 hover:bg-indigo-600 hover:shadow-indigo-300 hover:scale-[1.01] active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                        >
                            {isFullyBooked ? (
                                'Sold Out'
                            ) : isItemInCart ? (
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
                                    Add to Cart — RM{effectivePrice.toFixed(0)}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </main>

            {/* Terms & Conditions Modal */}
            <TermsModal
                isOpen={isTermsModalOpen}
                terms={product.termsAndConditions}
                onAgree={handleAgreeAndAddToCart}
                onClose={() => setIsTermsModalOpen(false)}
            />
        </div>
    );
};

export default ProductDetailPage;
