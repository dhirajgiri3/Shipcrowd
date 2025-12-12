"use client";

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useState } from 'react';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Fake submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            onClose();
        }, 1500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Order">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">Customer Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Full Name" required />
                        <Input placeholder="Phone Number" required />
                    </div>
                    <Input placeholder="Email Address" type="email" />
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-500">Product Info</h4>
                    <Input placeholder="Product Name" required />
                    <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="SKU (Optional)" />
                        <Input placeholder="Quantity" type="number" defaultValue={1} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Value (₹)" type="number" required />
                        <Select
                            options={[
                                { label: 'Prepaid', value: 'prepaid' },
                                { label: 'COD', value: 'cod' }
                            ]}
                        />
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-500">Shipping Address</h4>
                    <Input placeholder="Address Line 1" required />
                    <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="City" required />
                        <Input placeholder="Pincode" required />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={isLoading}>Create Order</Button>
                </div>
            </form>
        </Modal>
    );
}
