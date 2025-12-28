import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface SiteContent {
    privacyPolicy: string;
    termsAndConditions: string;
    contactInfo: {
        address: string;
        phone: string;
        email: string;
    };
}

const CONTENT_DOC_ID = 'site_settings';

export const getContent = async (): Promise<SiteContent> => {
    try {
        const docRef = doc(db, 'settings', CONTENT_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as SiteContent;
        } else {
            // Return defaults if not set
            return {
                privacyPolicy: "## Privacy Policy\n\nAdd your privacy policy here...",
                termsAndConditions: "## Terms and Conditions\n\nAdd your terms here...",
                contactInfo: {
                    address: "Putrajaya Lake Recreation Centre",
                    phone: "+60 3-8888 8888",
                    email: "info@lrc.my"
                }
            };
        }
    } catch (error) {
        console.error("Error fetching content:", error);
        throw error;
    }
};

export const updateContent = async (content: SiteContent): Promise<void> => {
    try {
        const docRef = doc(db, 'settings', CONTENT_DOC_ID);
        await setDoc(docRef, content, { merge: true });
    } catch (error) {
        console.error("Error updating content:", error);
        throw error;
    }
};
