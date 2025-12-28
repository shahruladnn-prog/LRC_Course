
export interface Course {
    id: string;
    name: string;
    price: number;
    category: string;
    termsAndConditions: string;
    isHidden: boolean;
    importantHighlight?: string;
    sku: string; // Mandatory for Loyverse integration
}

export interface Session {
    id: string;
    courseId: string;
    date: string; // Storing date as ISO string e.g., "2024-07-28"
    totalSlots: number;
    remainingSlots: number;
}

export interface Category {
    id: string;
    name: string;
}

// For client-side cart management
export interface CartItem {
    cartId: string; // Unique identifier for the cart item, e.g., `${courseId}-${sessionId}`
    courseId: string;
    courseName: string;
    sessionId: string;
    sessionDate: string;
    price: number;
    category: string;
    quantity: number;
}

// For storing in Firestore `bookings` collection
export interface BookingItem {
    courseId: string;
    courseName: string;
    sessionId: string;
    sessionDate: string;
    price: number;
    category: string;
    quantity: number;
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