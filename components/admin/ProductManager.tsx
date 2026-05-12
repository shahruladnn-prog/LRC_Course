import React, { useState } from 'react';
import { Product, Category } from '../../types';
import ProductForm from './ProductForm';
import ConfirmationModal from '../common/ConfirmationModal';

interface ProductManagerProps {
    products: Product[];
    categories: Category[];
    onProductSave: (product: Omit<Product, 'id'> | Product) => Promise<void>;
    onProductDelete: (productId: string) => Promise<void>;
}

const ProductTypeBadge: React.FC<{ type: string }> = ({ type }) => {
    const colors: Record<string, string> = {
        course: 'bg-blue-100 text-blue-800',
        event_ticket: 'bg-green-100 text-green-800',
        entrance_ticket: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
        course: 'Course',
        event_ticket: 'Event',
        entrance_ticket: 'Entrance',
    };
    return (
        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors[type] || 'bg-slate-100 text-slate-700'}`}>
            {labels[type] || type}
        </span>
    );
};

const ProductManager: React.FC<ProductManagerProps> = ({ products, categories, onProductSave, onProductDelete }) => {
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    const openEditForm = (product: Product) => {
        setEditingProduct(product);
        setIsProductFormOpen(true);
    };

    const openNewForm = () => {
        setEditingProduct(null);
        setIsProductFormOpen(true);
    };

    const handleProductSave = async (productData: Omit<Product, 'id'> | Product) => {
        setIsSavingProduct(true);
        await onProductSave(productData);
        setIsSavingProduct(false);
        setIsProductFormOpen(false);
        setEditingProduct(null);
    };

    const handleDeleteClick = (productId: string) => {
        setProductToDelete(productId);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (productToDelete) {
            setIsDeleting(productToDelete);
            await onProductDelete(productToDelete);
            setIsDeleting(null);
            setProductToDelete(null);
            setIsConfirmModalOpen(false);
        }
    };

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Your Products</h2>
                <button onClick={openNewForm} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add New Product
                </button>
            </div>

            {isProductFormOpen && (
                <ProductForm
                    product={editingProduct}
                    categories={categories}
                    onSave={handleProductSave}
                    onCancel={() => { setIsProductFormOpen(false); setEditingProduct(null); }}
                    isSaving={isSavingProduct}
                />
            )}

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { setProductToDelete(null); setIsConfirmModalOpen(false); }}
                onConfirm={handleConfirmDelete}
                title="Delete Product"
                message={<>Are you sure you want to delete this product and all its associated slots?<br /><span className="font-semibold text-red-700">This action cannot be undone.</span></>}
                confirmText="Delete"
                isConfirming={!!isDeleting}
            />

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.length > 0 ? products.map(product => (
                        <div key={product.id} className={`bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col transition-opacity ${product.isHidden ? 'opacity-60' : ''}`}>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <h3 className="text-xl font-bold text-slate-900 leading-tight">{product.name}</h3>
                                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                        <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{product.category}</span>
                                        <ProductTypeBadge type={product.type} />
                                        {product.isHidden && <span className="inline-block bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Hidden</span>}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-slate-700 font-semibold">RM{product.price.toFixed(2)}</p>
                                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${product.sku ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                                        {product.sku ? 'Linked' : 'No SKU'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-mono bg-slate-200 px-2 py-1 rounded">SKU: {product.sku || 'N/A'}</p>
                                {product.hasAddOns && product.addOns && product.addOns.length > 0 && (
                                    <p className="text-xs text-indigo-600 mt-1">+ {product.addOns.length} add-on(s)</p>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2">
                                <button onClick={() => openEditForm(product)} className="flex-1 text-center bg-white hover:bg-slate-100 text-indigo-600 font-bold py-2 px-4 rounded-md transition duration-300 border border-indigo-600">
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(product.id)}
                                    disabled={isDeleting === product.id}
                                    className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition duration-300 disabled:opacity-50"
                                    aria-label="Delete product"
                                >
                                    {isDeleting === product.id ? (
                                        <svg className="animate-spin h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full text-center py-10">
                            <p className="text-slate-500">No products found. Click "Add New Product" to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductManager;
