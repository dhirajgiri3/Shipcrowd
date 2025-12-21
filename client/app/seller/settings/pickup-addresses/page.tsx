"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    MapPin,
    Plus,
    Edit2,
    Trash2,
    Phone,
    User,
    Home,
    Star,
    CheckCircle,
    X,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

// Mock pickup addresses
const mockAddresses = [
    {
        id: '1',
        name: 'Main Warehouse',
        contactPerson: 'Rahul Sharma',
        phone: '+91 98765 43210',
        addressLine1: '123, Industrial Area, Phase 2',
        addressLine2: 'Near Metro Station',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        isDefault: true,
        isVerified: true,
    },
    {
        id: '2',
        name: 'Office Address',
        contactPerson: 'Priya Singh',
        phone: '+91 87654 32109',
        addressLine1: '456, Tech Park, Tower B',
        addressLine2: 'Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
        isDefault: false,
        isVerified: true,
    },
    {
        id: '3',
        name: 'Secondary Warehouse',
        contactPerson: 'Amit Kumar',
        phone: '+91 76543 21098',
        addressLine1: '789, Sector 18',
        addressLine2: 'Near DLF Mall',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        isDefault: false,
        isVerified: false,
    },
];

export default function PickupAddressesPage() {
    const [addresses, setAddresses] = useState(mockAddresses);
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { addToast } = useToast();

    const filteredAddresses = addresses.filter(addr =>
        addr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        addr.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        addr.pincode.includes(searchQuery)
    );

    const setAsDefault = (id: string) => {
        setAddresses(prev => prev.map(addr => ({
            ...addr,
            isDefault: addr.id === id
        })));
        addToast('Default address updated!', 'success');
    };

    const deleteAddress = (id: string) => {
        setAddresses(prev => prev.filter(addr => addr.id !== id));
        addToast('Address deleted successfully!', 'success');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-[#2525FF]" />
                        Pickup Addresses
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage your pickup locations for shipment collection
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Address
                </Button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by name, city, or pincode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Badge variant="neutral" className="hidden sm:flex">
                    {addresses.length} Address{addresses.length !== 1 ? 'es' : ''}
                </Badge>
            </div>

            {/* Add Address Form Modal */}
            {showAddForm && (
                <Card className="border-[#2525FF]/20 bg-[#2525FF]/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Add New Pickup Address</CardTitle>
                            <CardDescription>Enter the details for your new pickup location</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Address Name *</label>
                                <Input placeholder="e.g., Main Warehouse" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Contact Person *</label>
                                <Input placeholder="Full name" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                            <Input placeholder="+91 98765 43210" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Address Line 1 *</label>
                            <Input placeholder="Building, Street, Area" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Address Line 2</label>
                            <Input placeholder="Landmark (Optional)" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">City *</label>
                                <Input placeholder="City" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">State *</label>
                                <Input placeholder="State" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium text-gray-700">Pincode *</label>
                                <Input placeholder="6-digit pincode" maxLength={6} />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <input type="checkbox" id="setDefault" className="h-4 w-4 rounded border-gray-300 text-[#2525FF]" />
                            <label htmlFor="setDefault" className="text-sm text-gray-600">Set as default pickup address</label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                            <Button onClick={() => {
                                addToast('Address added successfully!', 'success');
                                setShowAddForm(false);
                            }}>
                                Save Address
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Address Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAddresses.map((address) => (
                    <Card key={address.id} className={cn(
                        "relative overflow-hidden transition-all hover:shadow-md",
                        address.isDefault && "ring-2 ring-[#2525FF] ring-offset-2"
                    )}>
                        {address.isDefault && (
                            <div className="absolute top-0 right-0 bg-[#2525FF] text-white text-xs px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Default
                            </div>
                        )}
                        <CardContent className="p-5">
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-[#2525FF]/10 flex items-center justify-center">
                                            <Home className="h-5 w-5 text-[#2525FF]" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{address.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {address.isVerified ? (
                                                    <Badge variant="success" className="text-xs gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Verified
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning" className="text-xs">Pending Verification</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <User className="h-4 w-4 text-gray-400" />
                                        {address.contactPerson}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        {address.phone}
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="text-sm text-gray-600 bg-[var(--bg-secondary)] rounded-lg p-3">
                                    <p>{address.addressLine1}</p>
                                    {address.addressLine2 && <p>{address.addressLine2}</p>}
                                    <p className="font-medium text-gray-900 mt-1">
                                        {address.city}, {address.state} - {address.pincode}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => addToast('Edit feature coming soon!', 'info')}>
                                            <Edit2 className="h-4 w-4 mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                            onClick={() => deleteAddress(address.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                    {!address.isDefault && (
                                        <Button variant="outline" size="sm" onClick={() => setAsDefault(address.id)}>
                                            Set Default
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredAddresses.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No addresses found</h3>
                        <p className="text-gray-500 mt-1">
                            {searchQuery ? 'Try a different search term' : 'Add your first pickup address to get started'}
                        </p>
                        {!searchQuery && (
                            <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Address
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
