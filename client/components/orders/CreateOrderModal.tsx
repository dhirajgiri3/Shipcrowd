import { useState } from 'react';
import { Modal } from '@/src/shared/components/Modal';
import { Input } from '@/src/shared/components/Input';
import { Button } from '@/src/shared/components/button';
import { useCreateOrder } from '@/src/core/api/hooks/useOrders';
import { useWarehouses } from '@/src/core/api/hooks/useWarehouses';
import { useToast } from '@/src/shared/components/Toast';
import { X, Plus, Trash2 } from 'lucide-react';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Product {
    name: string;
    sku: string;
    quantity: number;
    price: number;
    weight: number;
}

export function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
    const { addToast } = useToast();
    const createOrder = useCreateOrder();
    const { data: warehouses } = useWarehouses();

    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        email: '',
        phone: '',
        address: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            country: 'India',
            postalCode: '',
        },
    });

    const [products, setProducts] = useState<Product[]>([
        { name: '', sku: '', quantity: 1, price: 0, weight: 0.5 },
    ]);

    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'prepaid'>('prepaid');
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');

    const handleAddProduct = () => {
        setProducts([...products, { name: '', sku: '', quantity: 1, price: 0, weight: 0.5 }]);
    };

    const handleRemoveProduct = (index: number) => {
        if (products.length > 1) {
            setProducts(products.filter((_, i) => i !== index));
        }
    };

    const handleProductChange = (index: number, field: keyof Product, value: string | number) => {
        const updated = [...products];
        updated[index] = { ...updated[index], [field]: value };
        setProducts(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!customerInfo.name || !customerInfo.phone) {
            addToast('Customer name and phone are required', 'error');
            return;
        }

        if (!customerInfo.address.line1 || !customerInfo.address.city || !customerInfo.address.state || !customerInfo.address.postalCode) {
            addToast('Complete address is required', 'error');
            return;
        }

        if (!/^\d{6}$/.test(customerInfo.address.postalCode)) {
            addToast('Invalid pincode (6 digits required)', 'error');
            return;
        }

        if (!/^\d{10}$/.test(customerInfo.phone)) {
            addToast('Invalid phone number (10 digits required)', 'error');
            return;
        }

        if (products.some(p => !p.name || p.quantity <= 0 || p.price <= 0)) {
            addToast('All products must have name, valid quantity and price', 'error');
            return;
        }

        createOrder.mutate(
            {
                customerInfo,
                products,
                paymentMethod,
                warehouseId: warehouseId || undefined,
                notes: notes || undefined,
            },
            {
                onSuccess: () => {
                    addToast('Order created successfully!', 'success');
                    onClose();
                    resetForm();
                },
            }
        );
    };

    const resetForm = () => {
        setCustomerInfo({
            name: '',
            email: '',
            phone: '',
            address: { line1: '', line2: '', city: '', state: '', country: 'India', postalCode: '' },
        });
        setProducts([{ name: '', sku: '', quantity: 1, price: 0, weight: 0.5 }]);
        setPaymentMethod('prepaid');
        setWarehouseId('');
        setNotes('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Order">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Information */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Name *</label>
                            <Input
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Phone *</label>
                            <Input
                                value={customerInfo.phone}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                placeholder="9876543210"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
                            <Input
                                type="email"
                                value={customerInfo.email}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">Shipping Address</h3>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Address Line 1 *</label>
                        <Input
                            value={customerInfo.address.line1}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, address: { ...customerInfo.address, line1: e.target.value } })}
                            placeholder="Street address"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Address Line 2</label>
                        <Input
                            value={customerInfo.address.line2}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, address: { ...customerInfo.address, line2: e.target.value } })}
                            placeholder="Apartment, suite, etc."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">City *</label>
                            <Input
                                value={customerInfo.address.city}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, address: { ...customerInfo.address, city: e.target.value } })}
                                placeholder="Mumbai"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">State *</label>
                            <Input
                                value={customerInfo.address.state}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, address: { ...customerInfo.address, state: e.target.value } })}
                                placeholder="Maharashtra"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Pincode *</label>
                            <Input
                                value={customerInfo.address.postalCode}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, address: { ...customerInfo.address, postalCode: e.target.value } })}
                                placeholder="400001"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Country</label>
                            <Input
                                value={customerInfo.address.country}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, address: { ...customerInfo.address, country: e.target.value } })}
                                disabled
                            />
                        </div>
                    </div>
                </div>

                {/* Products */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-primary)] text-sm">Products</h3>
                        <Button type="button" onClick={handleAddProduct} size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Product
                        </Button>
                    </div>

                    {products.map((product, index) => (
                        <div key={index} className="border border-[var(--border-subtle)] rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-[var(--text-muted)]">Product {index + 1}</span>
                                {products.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveProduct(index)}
                                        className="text-[var(--error)] hover:text-[var(--error-hover)]"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Product Name *</label>
                                    <Input
                                        value={product.name}
                                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                                        placeholder="T-Shirt"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">SKU</label>
                                    <Input
                                        value={product.sku}
                                        onChange={(e) => handleProductChange(index, 'sku', e.target.value)}
                                        placeholder="TSH-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Weight (kg)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={product.weight}
                                        onChange={(e) => handleProductChange(index, 'weight', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Quantity *</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={product.quantity}
                                        onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Price (₹) *</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={product.price}
                                        onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Payment & Warehouse */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Payment Method *</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as 'cod' | 'prepaid')}
                            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]"
                            required
                        >
                            <option value="prepaid">Prepaid</option>
                            <option value="cod">Cash on Delivery</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Warehouse (Optional)</label>
                        <select
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]"
                        >
                            <option value="">Select warehouse</option>
                            {warehouses?.map((wh) => (
                                <option key={wh._id} value={wh._id}>
                                    {wh.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any special instructions..."
                        rows={3}
                        className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                    <Button type="button" onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={createOrder.isPending}>
                        Create Order
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
