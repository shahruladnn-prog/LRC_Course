import React from 'react';
import { Link } from 'react-router-dom';
import { Product, Session } from '../types';

interface ProductCardProps {
    product: Product;
    sessions: Session[];
    isFullyBooked: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, sessions, isFullyBooked }) => {
    const needsSession = product.type === 'course' || product.type === 'event_ticket';
    const nextAvailable = !needsSession
        ? null
        : sessions.find(s => s.remainingSlots > 0);

    const productLabel =
        product.type === 'course' ? 'Course' :
        product.type === 'event_ticket' ? 'Event' :
        'Entrance';

    const typeBadgeColor =
        product.type === 'course' ? 'bg-blue-50 text-blue-700' :
        product.type === 'event_ticket' ? 'bg-green-50 text-green-700' :
        'bg-purple-50 text-purple-700';

    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;

    return (
        <Link
            to={`/product/${product.id}`}
            className={`group bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 ${isFullyBooked ? 'opacity-60 hover:opacity-75' : ''}`}
        >
            {/* Image Section */}
            <div className="relative h-48 bg-gradient-to-br from-indigo-400 to-purple-600 overflow-hidden">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white/40 text-4xl font-bold">{product.name.charAt(0)}</span>
                    </div>
                )}

                {/* Sold Out Badge */}
                {isFullyBooked && (
                    <div className="absolute top-3 right-3 bg-red-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                        Sold Out
                    </div>
                )}

                {/* Category overlay */}
                <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/90 text-slate-700 backdrop-blur-sm uppercase tracking-wide">
                        {product.category}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-grow">
                {/* Name */}
                <h3 className="text-base font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors mb-1 line-clamp-2">
                    {product.name}
                </h3>

                {/* Type badge */}
                <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${typeBadgeColor} mb-2`}>
                    {productLabel}
                </span>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-xl font-extrabold text-slate-900">RM{product.price.toFixed(0)}</span>
                    <span className="text-xs text-slate-400">/person</span>
                </div>

                {/* Important Highlight (truncated) */}
                {product.importantHighlight && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100 line-clamp-2 whitespace-pre-line mb-3">
                        {product.importantHighlight}
                    </p>
                )}

                {/* Next available date hint */}
                {needsSession && !isFullyBooked && nextAvailable && (
                    <p className="text-xs text-slate-400 mt-auto mb-3">
                        📅 Next: {nextAvailable.date}
                        {product.showRemainingSlots !== false && (
                            <span className="text-emerald-600 ml-1">({nextAvailable.remainingSlots} slots left)</span>
                        )}
                    </p>
                )}

                {/* Spacer */}
                <div className="flex-grow" />

                {/* View Details link area */}
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100">
                    <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                        View Details
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
