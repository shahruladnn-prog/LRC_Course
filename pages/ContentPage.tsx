import React, { useEffect, useState } from 'react';
import { getContent, SiteContent } from '../services/contentService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Logo from '../components/common/Logo';
import { Link } from 'react-router-dom';

interface Props {
    type: 'privacy' | 'terms' | 'contact';
}

const ContentPage: React.FC<Props> = ({ type }) => {
    const [content, setContent] = useState<SiteContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getContent().then(data => {
            setContent(data);
            setIsLoading(false);
        });
    }, []);

    if (isLoading) return <div className="min-h-screen flex justify-center items-center"><LoadingSpinner /></div>;
    if (!content) return <div>Error loading content.</div>;

    const renderContent = () => {
        switch (type) {
            case 'privacy':
                return (
                    <div className="prose prose-indigo max-w-none">
                        {/* Fallback if ReactMarkdown is missing/fails, though standard React usually requires a lib for MD. 
                 If user environment doesn't have it, we might need to just render whitespace-pre-wrap
              */}
                        <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                            {content.privacyPolicy}
                        </div>
                    </div>
                );
            case 'terms':
                return (
                    <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed prose prose-indigo max-w-none">
                        {content.termsAndConditions}
                    </div>
                );
            case 'contact':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 max-w-2xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-slate-800 mb-8">Contact Us</h2>
                        <div className="space-y-6 text-lg">
                            <div>
                                <p className="text-slate-500 uppercase text-sm font-bold tracking-wider mb-1">Address</p>
                                <p className="text-slate-800 whitespace-pre-line">{content.contactInfo.address}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 uppercase text-sm font-bold tracking-wider mb-1">Email</p>
                                <a href={`mailto:${content.contactInfo.email}`} className="text-indigo-600 hover:underline font-medium">{content.contactInfo.email}</a>
                            </div>
                            <div>
                                <p className="text-slate-500 uppercase text-sm font-bold tracking-wider mb-1">Phone</p>
                                <a href={`tel:${content.contactInfo.phone}`} className="text-indigo-600 hover:underline font-medium">{content.contactInfo.phone}</a>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Simple Header */}
            <header className="bg-white shadow-sm py-4">
                <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
                    <Logo className="h-10" />
                    <Link to="/" className="text-slate-600 hover:text-indigo-600 font-medium">Back to Home</Link>
                </div>
            </header>

            <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
                <div className={`max-w-4xl mx-auto ${type !== 'contact' ? 'bg-white p-8 sm:p-12 rounded-2xl shadow-sm' : ''}`}>
                    {renderContent()}
                </div>
            </main>

            <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
                <p>&copy; {new Date().getFullYear()} LRC Putrajaya</p>
            </footer>
        </div>
    );
};

export default ContentPage;
