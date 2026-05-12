import React, { useState, useEffect, FormEvent } from 'react';
import { Product, Category, AddOn, ProductType } from '../../types';

interface ProductFormProps {
    product: Product | null;
    categories: Category[];
    onSave: (product: Omit<Product, 'id'> | Product) => void;
    onCancel: () => void;
    isSaving: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, categories, onSave, onCancel, isSaving }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<ProductType>('course');
    const [price, setPrice] = useState(0);
    const [category, setCategory] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [isHidden, setIsHidden] = useState(false);
    const [importantHighlight, setImportantHighlight] = useState('');
    const [sku, setSku] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [hasAddOns, setHasAddOns] = useState(false);
    const [addOnName, setAddOnName] = useState('Event T-Shirt');
    const [addOnPrice, setAddOnPrice] = useState(25);
    const [addOnVariantField, setAddOnVariantField] = useState('Size');
    const [addOnVariants, setAddOnVariants] = useState('S,M,L,XL');
    const [image1, setImage1] = useState('');
    const [image2, setImage2] = useState('');
    const [image3, setImage3] = useState('');

    useEffect(() => {
        if (product) {
            setName(product.name);
            setType(product.type || 'course');
            setPrice(product.price);
            setCategory(product.category);
            setTermsAndConditions(product.termsAndConditions);
            setIsHidden(product.isHidden || false);
            setImportantHighlight(product.importantHighlight || '');
            setSku(product.sku || '');
            setEventDate(product.eventDate || '');
            setHasAddOns(product.hasAddOns || false);
            const imgs = product.images || [];
            setImage1(imgs[0] || '');
            setImage2(imgs[1] || '');
            setImage3(imgs[2] || '');
            if (product.addOns && product.addOns.length > 0) {
                const a = product.addOns[0];
                setAddOnName(a.name);
                setAddOnPrice(a.price);
                setAddOnVariantField(a.variantField);
                setAddOnVariants(a.variants.join(','));
            }
        } else {
            resetForm();
        }
    }, [product, categories]);

    const resetForm = () => {
        setName('');
        setType('course');
        setPrice(0);
        setCategory(categories[0]?.name || '');
        setTermsAndConditions('');
        setIsHidden(false);
        setImportantHighlight('');
        setSku('');
        setEventDate('');
        setHasAddOns(false);
        setAddOnName('Event T-Shirt');
        setAddOnPrice(25);
        setAddOnVariantField('Size');
        setAddOnVariants('S,M,L,XL');
        setImage1('');
        setImage2('');
        setImage3('');
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const addOns: AddOn[] = hasAddOns ? [{
            id: 'tshirt',
            name: addOnName,
            price: addOnPrice,
            variantField: addOnVariantField,
            variants: addOnVariants.split(',').map(v => v.trim()).filter(v => v),
        }] : [];

        const images = [image1, image2, image3].filter(url => url.trim() !== '');

        const productData = {
            name,
            type,
            price,
            category,
            termsAndConditions,
            isHidden,
            importantHighlight,
            sku,
            hasAddOns,
            addOns,
            eventDate: eventDate || '',  // Always string, Firestore rejects undefined
            images,
        };

        if (product) {
            onSave({ ...productData, id: product.id });
        } else {
            onSave(productData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-slate-900">{product ? 'Edit Product' : 'Add New Product'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Product Type</label>
                        <select value={type} onChange={e => setType(e.target.value as ProductType)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">
                            <option value="course">Course</option>
                            <option value="event_ticket">Event Ticket</option>
                            <option value="entrance_ticket">Entrance Ticket</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">SKU (Stock Keeping Unit)</label>
                        <input type="text" value={sku} onChange={e => setSku(e.target.value)} required placeholder="SKU-001" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white" />
                        <p className="mt-1 text-xs text-slate-500">Must match the SKU in your POS system.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Price (RM)</label>
                        <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">
                            {categories.length === 0 ? (
                                <option disabled>Please add a category first</option>
                            ) : (
                                categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                    {type === 'entrance_ticket' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Event Date</label>
                            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Terms & Conditions</label>
                        <textarea value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} required rows={4} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white"></textarea>
                        <p className="mt-1 text-xs text-slate-500">Use Enter for line breaks. They will be preserved on the storefront.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Important Highlight (Optional)</label>
                        <textarea value={importantHighlight} onChange={e => setImportantHighlight(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white" placeholder="e.g., Early bird discount ends soon!"></textarea>
                        <p className="mt-1 text-xs text-slate-500">Use Enter for line breaks. They will be preserved on the storefront.</p>
                    </div>

                    {/* Product Images */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Product Images (Optional — max 3)</label>
                        <p className="text-xs text-slate-500 mb-3">Paste direct image URLs (e.g., from Imgur). Leave empty if none.</p>
                        <div className="space-y-2">
                            <input type="text" value={image1} onChange={e => setImage1(e.target.value)} placeholder="Image 1 URL" className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            <input type="text" value={image2} onChange={e => setImage2(e.target.value)} placeholder="Image 2 URL" className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            <input type="text" value={image3} onChange={e => setImage3(e.target.value)} placeholder="Image 3 URL" className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>

                    {/* Add-on Builder */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <label className="flex items-center space-x-3 cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={hasAddOns}
                                onChange={e => setHasAddOns(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                            />
                            <span className="text-sm font-medium text-slate-700">Has Add-ons (e.g., T-shirt)</span>
                        </label>
                        {hasAddOns && (
                            <div className="space-y-3 ml-7">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600">Add-on Name</label>
                                    <input type="text" value={addOnName} onChange={e => setAddOnName(e.target.value)} className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600">Add-on Price (RM)</label>
                                    <input type="number" value={addOnPrice} onChange={e => setAddOnPrice(Number(e.target.value))} className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600">Variant Label (e.g., "Size")</label>
                                    <input type="text" value={addOnVariantField} onChange={e => setAddOnVariantField(e.target.value)} className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600">Variants (comma-separated)</label>
                                    <input type="text" value={addOnVariants} onChange={e => setAddOnVariants(e.target.value)} placeholder="S,M,L,XL" className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isHidden}
                                onChange={e => setIsHidden(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                            />
                            <span className="text-sm font-medium text-slate-700">Hide product from storefront</span>
                        </label>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onCancel} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-md">Cancel</button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-blue-400"
                            disabled={isSaving || categories.length === 0}
                        >
                            {isSaving ? 'Saving...' : 'Save Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductForm;
