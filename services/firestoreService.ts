import { collection, addDoc, getDocs, updateDoc, doc, query, where, deleteDoc, DocumentData, WithFieldValue, QueryDocumentSnapshot, SnapshotOptions, runTransaction, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { Product, Session, Category, Booking, BookingItem, Redemption } from '../types';

// Firestore converter to ensure type safety
const productConverter = {
    toFirestore(product: WithFieldValue<Product>): DocumentData {
        return {
            name: product.name,
            type: product.type || 'course',
            price: product.price,
            category: product.category,
            termsAndConditions: product.termsAndConditions,
            isHidden: product.isHidden,
            importantHighlight: product.importantHighlight || '',
            sku: product.sku,
            hasAddOns: product.hasAddOns || false,
            addOns: product.addOns || [],
            eventDate: product.eventDate || '',
        };
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Product {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
            type: data.type || 'course',
            price: data.price,
            category: data.category,
            termsAndConditions: data.termsAndConditions,
            isHidden: data.isHidden || false,
            importantHighlight: data.importantHighlight || '',
            sku: data.sku || '',
            hasAddOns: data.hasAddOns || false,
            addOns: data.addOns || [],
            eventDate: data.eventDate || '',
        };
    },
};

const courseConverter = {
    toFirestore(course: WithFieldValue<Course>): DocumentData {
        return {
            name: course.name,
            price: course.price,
            category: course.category,
            termsAndConditions: course.termsAndConditions,
            isHidden: course.isHidden,
            importantHighlight: course.importantHighlight || '',
            sku: course.sku,
        };
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Course {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
            price: data.price,
            category: data.category,
            termsAndConditions: data.termsAndConditions,
            isHidden: data.isHidden || false, // Default to false if not set
            importantHighlight: data.importantHighlight || '',
            sku: data.sku || '', // Default to empty string if not set
        };
    },
};

const sessionConverter = {
    toFirestore(session: WithFieldValue<Session>): DocumentData {
        return {
            productId: session.productId,
            date: session.date,
            totalSlots: session.totalSlots,
            remainingSlots: session.remainingSlots,
        };
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Session {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            productId: data.productId || data.courseId, // Fallback for unmigrated data
            date: data.date,
            totalSlots: data.totalSlots,
            remainingSlots: data.remainingSlots,
        };
    },
};

const categoryConverter = {
    toFirestore(category: WithFieldValue<Category>): DocumentData {
        return { name: category.name };
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Category {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
        };
    },
};

const bookingConverter = {
    toFirestore(booking: WithFieldValue<Booking>): DocumentData {
        return {
            customerFullName: booking.customerFullName,
            customerPhone: booking.customerPhone,
            customerEmail: booking.customerEmail,
            items: booking.items,
            totalAmount: booking.totalAmount,
            paymentStatus: booking.paymentStatus,
            bookingDate: booking.bookingDate,
        };
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Booking {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            customerFullName: data.customerFullName || 'Unknown',
            customerPhone: data.customerPhone || '',
            customerEmail: data.customerEmail || '',
            items: Array.isArray(data.items) ? data.items.filter((i: any) => i && typeof i === 'object') : [], // Ensure array of objects
            totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
            paymentStatus: data.paymentStatus || 'pending',
            bookingDate: data.bookingDate || { seconds: 0, nanoseconds: 0 }, // prevent null date
            // Explicitly map sync fields
            syncStatus: data.syncStatus,
            syncError: data.syncError,
            billcode: data.billcode,
        };
    },
};

// Course Functions (LEGACY — use Product functions for new code)
export const getCourses = async (): Promise<Course[]> => {
    const coursesCol = collection(db, 'courses').withConverter(courseConverter);
    const courseSnapshot = await getDocs(coursesCol);
    return courseSnapshot.docs.map(doc => doc.data());
};

export const addCourse = async (courseData: Omit<Course, 'id'>) => {
    await addDoc(collection(db, 'courses').withConverter(courseConverter), {
        ...courseData,
        isHidden: false,
    });
};

export const updateCourse = async (courseId: string, courseData: Partial<Course>) => {
    const courseRef = doc(db, 'courses', courseId).withConverter(courseConverter);
    await updateDoc(courseRef, courseData);
};

export const deleteCourse = async (courseId: string) => {
    const batch = writeBatch(db);
    const courseRef = doc(db, 'courses', courseId);
    batch.delete(courseRef);
    const sessionsQuery = query(collection(db, 'sessions'), where('courseId', '==', courseId));
    const sessionSnapshot = await getDocs(sessionsQuery);
    sessionSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

// ============================================================
// Product Functions (NEW — v2 Multi-Product)
// ============================================================

export const getProducts = async (): Promise<Product[]> => {
    // FIRST: read from courses collection (where existing data lives, permissions work)
    try {
        const coursesCol = collection(db, 'courses');
        const courseSnapshot = await getDocs(coursesCol);
        if (!courseSnapshot.empty) {
            return courseSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'course' as const,
                hasAddOns: false,
                addOns: [],
            } as Product));
        }
    } catch (_) { /* courses collection may not exist or no permissions */ }

    // SECOND: try products collection (post-migration data)
    try {
        const productsCol = collection(db, 'products').withConverter(productConverter);
        const productSnapshot = await getDocs(productsCol);
        if (!productSnapshot.empty) {
            return productSnapshot.docs.map(doc => doc.data());
        }
    } catch (_) { /* products collection may not have permissions yet */ }

    // If nothing works, return empty array
    return [];
};

export const addProduct = async (productData: Omit<Product, 'id'>) => {
    // Write to courses collection (existing permissions) until migration
    await addDoc(collection(db, 'courses'), {
        name: productData.name,
        type: productData.type || 'course',
        price: productData.price,
        category: productData.category,
        termsAndConditions: productData.termsAndConditions,
        isHidden: productData.isHidden ?? false,
        importantHighlight: productData.importantHighlight || '',
        sku: productData.sku || '',
        hasAddOns: productData.hasAddOns ?? false,
        addOns: productData.addOns ?? [],
        eventDate: productData.eventDate || '',
    });
};

export const updateProduct = async (productId: string, productData: Partial<Product>) => {
    const productRef = doc(db, 'courses', productId);
    await updateDoc(productRef, productData);
};

export const deleteProduct = async (productId: string) => {
    const batch = writeBatch(db);
    const productRef = doc(db, 'courses', productId);
    batch.delete(productRef);
    const sessionsQuery = query(collection(db, 'sessions'), where('productId', '==', productId));
    const sessionSnapshot = await getDocs(sessionsQuery);
    if (sessionSnapshot.empty) {
        // Try legacy courseId
        const legacyQuery = query(collection(db, 'sessions'), where('courseId', '==', productId));
        const legacySnapshot = await getDocs(legacyQuery);
        legacySnapshot.forEach((doc) => batch.delete(doc.ref));
    } else {
        sessionSnapshot.forEach((doc) => batch.delete(doc.ref));
    }
    await batch.commit();
};


// Session Functions
export const getSessionsForCourse = async (courseId: string): Promise<Session[]> => {
    const results: Session[] = [];

    // Query by legacy courseId first (existing data) — NO converter to avoid type conflicts
    try {
        const q2 = query(collection(db, 'sessions'), where('courseId', '==', courseId));
        const snapshot2 = await getDocs(q2);
        snapshot2.forEach(doc => {
            const d = doc.data();
            results.push({
                id: doc.id,
                productId: d.productId || d.courseId || '',
                date: d.date || '',
                totalSlots: d.totalSlots || 0,
                remainingSlots: d.remainingSlots || 0,
            });
        });
    } catch (_) { /* may not have permission */ }

    // Also try productId if courseId query returned nothing
    if (results.length === 0) {
        try {
            const q = query(collection(db, 'sessions'), where('productId', '==', courseId));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const d = doc.data();
                results.push({
                    id: doc.id,
                    productId: d.productId || d.courseId || '',
                    date: d.date || '',
                    totalSlots: d.totalSlots || 0,
                    remainingSlots: d.remainingSlots || 0,
                });
            });
        } catch (_) { /* fallback failed too */ }
    }

    return results;
};

export const getSessionsForProduct = getSessionsForCourse; // Alias — same function, cleaner name

export const addSession = async (sessionData: Omit<Session, 'id'>) => {
    await addDoc(collection(db, 'sessions'), {
        ...sessionData,
        remainingSlots: sessionData.totalSlots
    });
};

export const updateSession = async (sessionId: string, sessionData: Partial<Session>) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, sessionData);
};

export const deleteSession = async (sessionId: string) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await deleteDoc(sessionRef);
};


// Category Functions
export const getCategories = async (): Promise<Category[]> => {
    const categoriesCol = collection(db, 'categories').withConverter(categoryConverter);
    const categorySnapshot = await getDocs(categoriesCol);
    return categorySnapshot.docs.map(doc => doc.data());
};

export const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    await addDoc(collection(db, 'categories'), categoryData);
};

export const updateCategory = async (categoryId: string, categoryData: Partial<Category>) => {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, categoryData);
};

export const deleteCategory = async (categoryId: string) => {
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
};

// Booking Functions
export const getBookings = async (): Promise<Booking[]> => {
    const bookingsCol = collection(db, 'bookings').withConverter(bookingConverter);
    const bookingSnapshot = await getDocs(bookingsCol);
    return bookingSnapshot.docs.map(doc => doc.data());
};

export const addBooking = async (bookingData: Omit<Booking, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'bookings'), {
        ...bookingData,
        bookingDate: Timestamp.now()
    });
    return docRef.id;
};

// This function is now deprecated in favor of the cloud function but kept for reference
export const processSuccessfulPayment = async (bookingId: string, items: BookingItem[]) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Update the booking status to 'paid'
            const bookingRef = doc(db, 'bookings', bookingId);
            transaction.update(bookingRef, { paymentStatus: 'paid' });

            // 2. Decrement the remaining slots for each session
            for (const item of items) {
                const sessionRef = doc(db, 'sessions', item.sessionId);
                const sessionDoc = await transaction.get(sessionRef);
                if (!sessionDoc.exists()) {
                    throw `Session ${item.sessionId} not found!`;
                }
                const currentSlots = sessionDoc.data().remainingSlots;
                if (currentSlots < 1) {
                    throw `No remaining slots for session ${item.sessionId} on ${item.sessionDate}`;
                }
                transaction.update(sessionRef, { remainingSlots: currentSlots - 1 });
            }
        });
        console.log("Transaction successfully committed!");
    } catch (e) {
        console.error("Transaction failed: ", e);
        // If the transaction fails, we should ideally update the booking status to 'failed'
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, { paymentStatus: 'failed' });
        throw e; // Re-throw the error to be handled by the caller
    }
};

// ============================================================
// Redemption Functions (NEW — v2)
// ============================================================

export const getRedemptions = async (): Promise<Redemption[]> => {
    try {
        const col = collection(db, 'redemptions');
        const snapshot = await getDocs(col);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Redemption));
    } catch (_) { return []; }
};

export const getRedemptionsByBooking = async (bookingId: string): Promise<Redemption[]> => {
    try {
        const q = query(collection(db, 'redemptions'), where('bookingId', '==', bookingId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Redemption));
    } catch (_) { return []; }
};

export const getRedemptionByCode = async (code: string): Promise<Redemption | null> => {
    try {
        const q = query(collection(db, 'redemptions'), where('code', '==', code));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Redemption;
    } catch (_) { return null; }
};

export const redeemItem = async (redemptionId: string, staffName: string): Promise<void> => {
    try {
        const ref = doc(db, 'redemptions', redemptionId);
        await updateDoc(ref, {
            status: 'redeemed',
            redeemedAt: new Date().toISOString(),
            redeemedBy: staffName,
        });
    } catch (_) { /* collection may not exist yet */ }
};

// ============================================================
// Reports (NEW — v2)
// ============================================================

export interface ReportsData {
    totalRevenue: number;
    totalBookings: number;
    totalItems: number;
    bookings: Booking[];
}

export const getReportsData = async (fromDate?: string, toDate?: string): Promise<ReportsData> => {
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    const bookings = bookingsSnap.docs.map(d => d.data() as Booking);

    const filtered = bookings.filter(b => {
        if (b.paymentStatus !== 'paid') return false;
        if (!fromDate && !toDate) return true;
        const secs = (b.bookingDate as any)?.seconds;
        const d = secs ? new Date(secs * 1000) : (b.bookingDate instanceof Date ? b.bookingDate : new Date());
        if (fromDate && d < new Date(fromDate)) return false;
        if (toDate && d > new Date(toDate + 'T23:59:59')) return false;
        return true;
    });

    return {
        totalRevenue: filtered.reduce((sum, b) => sum + b.totalAmount, 0),
        totalBookings: filtered.length,
        totalItems: filtered.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0),
        bookings: filtered,
    };
};