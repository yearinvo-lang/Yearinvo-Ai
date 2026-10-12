import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Tag,
  DollarSign,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Eye,
  AlertCircle,
  FileImage,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Product } from '../types/index.ts';
import { uploadProductImage } from '../lib/firebase.ts';

export const ProductsPage: React.FC = () => {
  const { activeWorkspace, apiRequest, language, theme } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [nameBengali, setNameBengali] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Menswear');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('20');
  const [shippingInfo, setShippingInfo] = useState('Inside Dhaka 24-48 hrs, Outside Dhaka 3-4 days');

  // Image Upload State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [manualImageUrl, setManualImageUrl] = useState<string>('');
  const [showManualUrlInput, setShowManualUrlInput] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [existingStoragePath, setExistingStoragePath] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isBn = language === 'bn';

  const getStorageKey = () => `yia_products_${activeWorkspace?.id || 'default'}`;

  const loadProducts = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      // 1. Try to fetch from backend API
      const data = await apiRequest('/api/products').catch(() => null);
      if (data && Array.isArray(data)) {
        setProducts(data);
        localStorage.setItem(getStorageKey(), JSON.stringify(data));
      } else {
        // 2. Rehydrate from local cache if API is offline
        const cached = localStorage.getItem(getStorageKey());
        if (cached) {
          try {
            setProducts(JSON.parse(cached));
          } catch {
            setProducts([]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load products:', e);
      const cached = localStorage.getItem(getStorageKey());
      if (cached) {
        try {
          setProducts(JSON.parse(cached));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [activeWorkspace?.id]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setNameBengali('');
    setSku('SKU-' + Math.floor(1000 + Math.random() * 9000));
    setCategory('Menswear');
    setDescription('');
    setPrice('');
    setDiscountPrice('');
    setStock('20');
    setShippingInfo('Inside Dhaka 24-48 hrs, Outside Dhaka 3-4 days');
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    setManualImageUrl('');
    setShowManualUrlInput(false);
    setExistingStoragePath(undefined);
    setFormError(null);
    setUploadProgress(null);
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setNameBengali(p.nameBengali || '');
    setSku(p.sku);
    setCategory(p.category);
    setDescription(p.description);
    setPrice(String(p.price));
    setDiscountPrice(p.discountPrice ? String(p.discountPrice) : '');
    setStock(String(p.stock));
    setShippingInfo(p.shippingInfo || 'Inside Dhaka 24-48 hrs, Outside Dhaka 3-4 days');
    setSelectedImageFile(null);
    setImagePreviewUrl(p.images[0] || '');
    setManualImageUrl(p.images[0] || '');
    setShowManualUrlInput(false);
    setExistingStoragePath(p.imageStoragePath);
    setFormError(null);
    setUploadProgress(null);
    setShowModal(true);
  };

  // Image Selection & Validation
  const processSelectedFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setFormError('Unsupported file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      setFormError(`Image size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit.`);
      return;
    }

    setFormError(null);
    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    setManualImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form Save Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanName = name.trim();
    const cleanSku = sku.trim();
    const numPrice = Number(price);

    if (!cleanName) {
      setFormError('Please enter a product name.');
      return;
    }
    if (!cleanSku) {
      setFormError('Please provide a SKU code.');
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setFormError('Please enter a valid regular price greater than 0.');
      return;
    }

    if (discountPrice && Number(discountPrice) >= numPrice) {
      setFormError('Discount price must be less than the regular price.');
      return;
    }

    setIsSubmitting(true);

    try {
      const workspaceId = activeWorkspace?.id || 'ws_default';
      const productId = editingId || `prod_${Date.now()}`;
      let finalImageUrl = manualImageUrl.trim();
      let storagePath = existingStoragePath;

      // 1. Upload new image file if selected
      if (selectedImageFile) {
        setUploadProgress('Uploading product image to secure storage...');
        try {
          const uploadRes = await uploadProductImage(selectedImageFile, workspaceId, productId);
          finalImageUrl = uploadRes.url;
          storagePath = uploadRes.storagePath;
        } catch (uploadErr: any) {
          console.warn('Image upload error:', uploadErr);
          setFormError(`Image upload error: ${uploadErr.message || 'Failed to upload image'}`);
          setIsSubmitting(false);
          setUploadProgress(null);
          return;
        }
      }

      // Default fallback image if none provided
      if (!finalImageUrl) {
        finalImageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
      }

      setUploadProgress('Saving product details to catalog...');

      const payload = {
        name: cleanName,
        nameBengali: nameBengali.trim() || undefined,
        sku: cleanSku,
        category: category.trim() || 'General',
        description: description.trim() || '',
        price: numPrice,
        discountPrice: discountPrice ? Number(discountPrice) : undefined,
        stock: Number(stock) || 0,
        images: [finalImageUrl],
        imageStoragePath: storagePath,
        shippingInfo: shippingInfo.trim() || 'Standard Delivery',
      };

      let savedProduct: Product;

      if (editingId) {
        try {
          savedProduct = await apiRequest(`/api/products/${editingId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } catch {
          // Local fallback update if backend is unreachable
          savedProduct = {
            id: editingId,
            workspaceId,
            ...payload,
            available: true,
            variants: [],
            createdAt: new Date().toISOString(),
          };
        }
        setProducts((prev) => {
          const updated = prev.map((p) => (p.id === editingId ? savedProduct : p));
          localStorage.setItem(getStorageKey(), JSON.stringify(updated));
          return updated;
        });
      } else {
        try {
          savedProduct = await apiRequest('/api/products', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        } catch {
          // Local fallback creation if backend is unreachable
          savedProduct = {
            id: productId,
            workspaceId,
            ...payload,
            available: true,
            variants: [],
            createdAt: new Date().toISOString(),
          };
        }
        setProducts((prev) => {
          const updated = [savedProduct, ...prev];
          localStorage.setItem(getStorageKey(), JSON.stringify(updated));
          return updated;
        });
      }

      setShowModal(false);
    } catch (e: any) {
      console.error('Failed to save product:', e);
      setFormError(e.message || 'An unexpected error occurred while saving the product.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiRequest(`/api/products/${id}`, { method: 'DELETE' }).catch(() => null);
      setProducts((prev) => {
        const remaining = prev.filter((p) => p.id !== id);
        localStorage.setItem(getStorageKey(), JSON.stringify(remaining));
        return remaining;
      });
    } catch (e) {
      console.error('Failed to delete product:', e);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.nameBengali && p.nameBengali.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-gradient-to-r from-white via-purple-50/50 to-white dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 p-6 shadow-sm dark:shadow-xl transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Product Catalog</h1>
            <span className="rounded-full bg-purple-100 dark:bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
              {products.length} Items
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage inventory and pricing. Products sync automatically with the AI Sales Agent for customer recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
            title="Refresh Catalog"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:bg-purple-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3 shadow-sm transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? 'নাম বা SKU দিয়ে খুঁজুন...' : 'Search by name or SKU...'}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-12 text-center transition-colors">
          <Package className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            {search || categoryFilter !== 'all' ? 'No products found' : 'No products added.'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {search || categoryFilter !== 'all'
              ? 'No products match your search filters.'
              : 'Add your first product with photo, price, and SKU to enable AI sales recommendations.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((p) => {
            const hasDiscount = p.discountPrice && p.discountPrice < p.price;
            const isOutOfStock = p.stock <= 0;

            return (
              <div
                key={p.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md dark:shadow-none hover:border-purple-300 dark:hover:border-purple-500/40 transition duration-200"
              >
                <div>
                  {/* Product Image */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                    <img
                      src={p.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                      <span className="rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-sm">
                        {p.category}
                      </span>
                      {hasDiscount && (
                        <span className="rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          SALE
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      {isOutOfStock ? (
                        <span className="rounded-md bg-rose-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white">
                          {p.stock} in stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{p.name}</h3>
                        {p.nameBengali && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-bengali line-clamp-1">
                            {p.nameBengali}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                      SKU: {p.sku}
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Pricing & Actions */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        ৳{hasDiscount ? p.discountPrice?.toLocaleString() : p.price.toLocaleString()}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-slate-400 line-through">
                          ৳{p.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                      title="Edit product"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 transition"
                      title="Delete product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-purple-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl my-auto max-h-[92dvh] flex flex-col transition-colors">
            <button
              onClick={() => !isSubmitting && setShowModal(false)}
              disabled={isSubmitting}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {editingId ? 'Edit Product Details' : 'Add New Product to Catalog'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter product specifications and upload an image directly from your device.
            </p>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Product Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Traditional Silk Panjabi"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name in Bengali (বাংলা)</label>
                  <input
                    type="text"
                    value={nameBengali}
                    onChange={(e) => setNameBengali(e.target.value)}
                    placeholder="e.g. ঐতিহ্যবাহী সিল্ক পাঞ্জাবি"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none font-bengali transition-colors"
                  />
                </div>
              </div>

              {/* SKU, Category, Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="PANJABI-01"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Menswear"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Available Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="20"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Regular Price (BDT) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="2500"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount Price (Optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="2200"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Direct Image Upload Control */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Product Image
                </label>

                {imagePreviewUrl ? (
                  /* Preview with Replace & Remove actions */
                  <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 flex items-center gap-3">
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-200 dark:bg-slate-900">
                      <img
                        src={imagePreviewUrl}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedImageFile ? selectedImageFile.name : 'Configured Image'}
                      </div>
                      {selectedImageFile && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {(selectedImageFile.size / 1024).toFixed(1)} KB • {selectedImageFile.type.split('/')[1]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition"
                        >
                          Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Drag and Drop Zone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                      isDragging
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                        : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 bg-slate-50/50 dark:bg-slate-950/60'
                    }`}
                  >
                    <Upload className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                    <div className="text-xs font-bold text-slate-800 dark:text-white">
                      Click to upload an image, or drag and drop
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      PNG, JPG, WebP, or GIF (max 10MB)
                    </p>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Backward Compatible URL toggle */}
                <div className="pt-1">
                  {!showManualUrlInput ? (
                    <button
                      type="button"
                      onClick={() => setShowManualUrlInput(true)}
                      className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      + Or enter external image URL manually
                    </button>
                  ) : (
                    <div className="space-y-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Image Web URL</label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowManualUrlInput(false);
                            setManualImageUrl('');
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="url"
                        value={manualImageUrl}
                        onChange={(e) => {
                          setManualImageUrl(e.target.value);
                          setImagePreviewUrl(e.target.value);
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fabric, materials, care instructions, sizing notes..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Shipping Info */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery & Shipping Info</label>
                <input
                  type="text"
                  value={shippingInfo}
                  onChange={(e) => setShippingInfo(e.target.value)}
                  placeholder="Inside Dhaka 24-48 hrs, Outside Dhaka 3-4 days"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Submit Buttons & Upload Status */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                  {uploadProgress && (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {uploadProgress}
                    </span>
                  )}
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                  >
                    {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editingId ? 'Update Product' : 'Add to Catalog'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
