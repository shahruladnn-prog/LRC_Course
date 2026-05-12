export type ProductType = 'course' | 'event_ticket' | 'entrance_ticket';

export interface AddOn {
    id: string;           // e.g., 'tshirt'
    name: string;         // e.g., 'Event T-Shirt'
    price: number;        // e.g., 25
    variantField: string; // e.g., 'Size'
    variants: string[];   // e.g., ['S', 'M', 'L', 'XL']
}

export interface Product {
    id: string;
    name: string;
    type: ProductType;
    price: number;
    category: string;
    termsAndConditions: string;
    isHidden: boolean;
    importantHighlight?: string;
    sku: string;
    hasAddOns?: boolean;
    addOns?: AddOn[];
    eventDate?: string; // For entrance tickets without sessions
    images?: string[];  // Up to 3 image URLs
}

export interface Session {
    id: string;
    productId: string;  // WAS: courseId — renamed for multi-product support
    date: string;
    totalSlots: number;
    remainingSlots: number;
}

export interface Category {
    id: string;
    name: string;
}

// For client-side cart management
export interface CartAddOn {
    addOnId: string;
    name: string;
    variant: string;  // e.g., 'XL'
    price: number;
}

export interface CartItem {
    cartId: string;        // NOW: crypto.randomUUID() — no longer depends on sessionId
    productId: string;
    productName: string;
    productType: ProductType;
    sessionId?: string;    // Optional — entrance tickets don't have sessions
    sessionDate?: string;  // Optional
    price: number;
    category: string;
    quantity: number;
    addOns?: CartAddOn[];  // NEW — optional add-ons (e.g., t-shirt)
}

// For storing in Firestore `bookings` collection
export interface BookingItem {
    productId: string;
    productName: string;
    productType: ProductType;  // Denormalized for reporting
    sessionId?: string;        // Optional
    sessionDate?: string;      // Optional
    price: number;
    category: string;
    quantity: number;
    addOns?: CartAddOn[];      // NEW
}

export interface Booking {
    id: string;
    customerFullName: string;
    customerPhone: string;
    customerEmail: string;
    items: BookingItem[];
    totalAmount: number;
    paymentStatus: 'pending' | 'paid' | 'failed';
    syncStatus?: 'pending' | 'synced' | 'failed';
    syncError?: string;
    bookingDate: {
        seconds: number;
        nanoseconds: number;
    } | Date; // Firestore timestamp
    billcode?: string;
}

// ============================================================
// Redemption (New — v2)
// ============================================================

export interface Redemption {
    id: string;              // Deterministic: `${bookingId}-${itemIndex}`
    bookingId: string;
    itemIndex: number;
    addOnIndex?: number;
    itemType: 'ticket' | 'merchandise';
    code: string;            // Same as id
    status: 'pending' | 'redeemed';
    redeemedAt?: string;     // ISO timestamp
    redeemedBy?: string;     // Staff name
    customerName?: string;   // Denormalized for scanner display
    itemName?: string;       // Denormalized for scanner display
}