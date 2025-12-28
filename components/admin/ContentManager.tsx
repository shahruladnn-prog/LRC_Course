import React, { useState, useEffect } from 'react';
import { getContent, updateContent, SiteContent } from '../../services/contentService';
import LoadingSpinner from '../common/LoadingSpinner';

const ContentManager: React.FC = () => {
    const [content, setContent] = useState<SiteContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            const data = await getContent();
            setContent(data);
        } catch (error) {
            setMessage({ type: 'error', text: "Failed to load content." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content) return;
        setIsSaving(true);
        setMessage(null);
        try {
            await updateContent(content);
            setMessage({ type: 'success', text: "Content updated successfully!" });
        } catch (error) {
            setMessage({ type: 'error', text: "Failed to save content." });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (!content) return <div>Error loading content.</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Site Content Settings</h2>

            {message && (
                <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* Contact Info Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-700 border-b pb-2">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={content.contactInfo.email}
                                onChange={e => setContent({ ...content, contactInfo: { ...content.contactInfo, email: e.target.value } })}
                                className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                            <input
                                type="text"
                                value={content.contactInfo.phone}
                                onChange={e => setContent({ ...content, contactInfo: { ...content.contactInfo, phone: e.target.value } })}
                                className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                            <textarea
                                value={content.contactInfo.address}
                                onChange={e => setContent({ ...content, contactInfo: { ...content.contactInfo, address: e.target.value } })}
                                className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 h-20"
                            />
                        </div>
                    </div>
                </div>

                {/* Policies Section */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-700 border-b pb-2">Policies (Markdown Support)</h3>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Privacy Policy</label>
                        <textarea
                            value={content.privacyPolicy}
                            onChange={e => setContent({ ...content, privacyPolicy: e.target.value })}
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 h-64 font-mono text-sm"
                            placeholder="# Privacy Policy..."
                        />
                        <p className="text-xs text-slate-500 mt-1">Supports Markdown for formatting.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
                        <textarea
                            value={content.termsAndConditions}
                            onChange={e => setContent({ ...content, termsAndConditions: e.target.value })}
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 h-64 font-mono text-sm"
                            placeholder="# Terms..."
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md disabled:bg-indigo-300"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ContentManager;
