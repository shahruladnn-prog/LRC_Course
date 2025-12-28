
import { collection, addDoc, getDocs, updateDoc, doc, query, where, deleteDoc, DocumentData, WithFieldValue, QueryDocumentSnapshot, SnapshotOptions, runTransaction, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { Course, Session, Category, Booking, BookingItem } from '../types';

// Firestore converter to ensure type safety
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
            courseId: session.courseId,
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
            courseId: data.courseId,
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
        };
    },
};

// Course Functions
export const getCourses = async (): Promise<Course[]> => {
    const coursesCol = collection(db, 'courses').withConverter(courseConverter);
    const courseSnapshot = await getDocs(coursesCol);
    return courseSnapshot.docs.map(doc => doc.data());
};

export const addCourse = async (courseData: Omit<Course, 'id'>) => {
    await addDoc(collection(db, 'courses').withConverter(courseConverter), {
        ...courseData,
        isHidden: false, // Default to not hidden
    });
};

export const updateCourse = async (courseId: string, courseData: Partial<Course>) => {
    const courseRef = doc(db, 'courses', courseId).withConverter(courseConverter);
    await updateDoc(courseRef, courseData);
};

export const deleteCourse = async (courseId: string) => {
    const batch = writeBatch(db);

    // 1. Delete the course itself
    const courseRef = doc(db, 'courses', courseId);
    batch.delete(courseRef);

    // 2. Find and delete all associated sessions
    const sessionsQuery = query(collection(db, 'sessions'), where('courseId', '==', courseId));
    const sessionSnapshot = await getDocs(sessionsQuery);
    sessionSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // 3. Commit the batched write
    await batch.commit();
};


// Session Functions
export const getSessionsForCourse = async (courseId: string): Promise<Session[]> => {
    const q = query(collection(db, 'sessions'), where('courseId', '==', courseId)).withConverter(sessionConverter);
    const sessionSnapshot = await getDocs(q);
    return sessionSnapshot.docs.map(doc => doc.data());
};

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