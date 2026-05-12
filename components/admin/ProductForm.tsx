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
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [image1, setImage1] = useState('');
    const [image2, setImage2] = useState('');
    const [image3, setImage3] = useState('');
    const [showRemainingSlots, setShowRemainingSlots] = useState(true);

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
            setAddOns(product.addOns || []);
            setShowRemainingSlots(product.showRemainingSlots !== undefined ? product.showRemainingSlots : true);
            const imgs = product.images || [];
            setImage1(imgs[0] || '');
            setImage2(imgs[1] || '');
            setImage3(imgs[2] || '');
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
        setAddOns([]);
        setShowRemainingSlots(true);
        setImage1('');
        setImage2('');
        setImage3('');
    };

    // Add-on helpers
    const handleAddAddOn = () => {
        const newAddOn: AddOn = {
            id: crypto.randomUUID(),
            name: '',
            price: 0,
            variantField: '',
            variants: [],
            loyverseSku: '',
        };
        setAddOns([...addOns, newAddOn]);
    };

    const handleRemoveAddOn = (addOnId: string) => {
        setAddOns(addOns.filter(a => a.id !== addOnId));
    };

    const handleAddOnChange = (addOnId: string, field: keyof AddOn, value: string | number | string[]) => {
        setAddOns(addOns.map(a => a.id === addOnId ? { ...a, [field]: value } : a));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const validAddOns = hasAddOns
            ? addOns.filter(a => a.name.trim() !== '')
            : [];

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
            addOns: validAddOns,
            eventDate: eventDate || '',
            images,
            showRemainingSlots,
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

                    {/* Add-on Builder — Dynamic Multi-Add-On */ }
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <label className="flex items-center space-x-3 cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={hasAddOns}
                                onChange={e => {
                                    setHasAddOns(e.target.checked);
                                    if (!e.target.checked) setAddOns([]);
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                            />
                            <span className="text-sm font-medium text-slate-700">Has Add-ons (e.g., T-shirt, Gift, Kit)</span>
                        </label>
                        {hasAddOns && (
                            <div className="space-y-3 ml-7">
                                {addOns.map((addOn, idx) => (
                                    <div key={addOn.id} className="border border-slate-300 bg-white rounded-md p-3 space-y-2 relative">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAddOn(addOn.id)}
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold"
                                            title="Remove add-on"
                                        >
                                            ✕
                                        </button>
                                        <p className="text-xs font-bold text-slate-500">Add-on #{idx + 1}</p>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600">Name</label>
                                            <input
                                                type="text"
                                                value={addOn.name}
                                                onChange={e => handleAddOnChange(addOn.id, 'name', e.target.value)}
                                                placeholder="e.g., Event T-Shirt, Gift Voucher"
                                                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600">Price (RM)</label>
                                            <input
                                                type="number"
                                                value={addOn.price}
                                                onChange={e => handleAddOnChange(addOn.id, 'price', Number(e.target.value))}
                                                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600">Variant Label (e.g., "Size" — leave empty if none)</label>
                                            <input
                                                type="text"
                                                value={addOn.variantField}
                                                onChange={e => handleAddOnChange(addOn.id, 'variantField', e.target.value)}
                                                placeholder="Size"
                                                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600">Variants (comma-separated, leave empty if none)</label>
                                            <input
                                                type="text"
                                                value={addOn.variants.join(',')}
                                                onChange={e => handleAddOnChange(addOn.id, 'variants', e.target.value.split(',').map(v => v.trim()).filter(v => v))}
                                                placeholder="S,M,L,XL"
                                                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600">
                                                Loyverse SKU Prefix
                                                <span className="text-slate-400 ml-1">(optional — base SKU in Loyverse POS)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={addOn.loyverseSku || ''}
                                                onChange={e => handleAddOnChange(addOn.id, 'loyverseSku', e.target.value)}
                                                placeholder="e.g., TSHIRT → TSHIRT-S, TSHIRT-M"
                                                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white font-mono"
                                            />
                                            <p className="mt-0.5 text-[10px] text-slate-400">
                                                If left empty, this add-on will be skipped during Loyverse receipt sync.
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleAddAddOn}
                                    className="w-full py-2 border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-semibold rounded-md hover:bg-indigo-50 transition"
                                >
                                    + Add Another Add-on
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Show Remaining Slots Toggle */}
                    <div>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showRemainingSlots}
                                onChange={e => setShowRemainingSlots(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                            />
                            <span className="text-sm font-medium text-slate-700">Show remaining slots on storefront</span>
                        </label>
                        <p className="mt-1 text-xs text-slate-400 ml-7">
                            When enabled, the remaining slot count appears next to session dates.
                        </p>
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
