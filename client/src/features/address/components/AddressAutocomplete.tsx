/**
 * Address Autocomplete Component
 * 
 * Intelligent autocomplete input with real-time address suggestions.
 * Features:
 * - Debounced search (300ms) to reduce API calls
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Touch-friendly dropdown
 * - Loading and empty states
 * - Click-outside to close
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/src/components/ui';
import { useDebounce } from '@/src/hooks/utility/useDebounce';
import { useOnClickOutside } from '@/src/hooks/utility/useOnClickOutside';
import { useAddressSuggestions } from '@/src/core/api/hooks/logistics/useAddress';
import type { Address } from '@/src/types/api/logistics';

export interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onAddressSelect: (address: Address) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    className?: string;
}

export function AddressAutocomplete({
    value,
    onChange,
    onAddressSelect,
    placeholder = "Start typing your address...",
    disabled = false,
    error = false,
    className = '',
}: AddressAutocompleteProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce search query
    const debouncedQuery = useDebounce(value, 300);

    // Fetch suggestions
    const { data: suggestions = [], isLoading, isError } = useAddressSuggestions(debouncedQuery, {
        enabled: debouncedQuery.length >= 3,
    });

    // Show dropdown when we have suggestions or are loading
    useEffect(() => {
        if (debouncedQuery.length >= 3) {
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    }, [debouncedQuery]);

    // Reset highlighted index when suggestions change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [suggestions]);

    // Close dropdown on click outside
    useOnClickOutside(dropdownRef as React.RefObject<HTMLElement>, () => {
        setShowDropdown(false);
        setHighlightedIndex(-1);
    });

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    // Handle suggestion selection
    const handleSelect = useCallback((suggestion: Address) => {
        onChange(suggestion.line1);
        onAddressSelect(suggestion);
        setShowDropdown(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    }, [onChange, onAddressSelect]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || suggestions.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;

            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSelect(suggestions[highlightedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setShowDropdown(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && dropdownRef.current) {
            const highlightedElement = dropdownRef.current.querySelector(
                `[data-index="${highlightedIndex}"]`
            );
            highlightedElement?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [highlightedIndex]);

    return (
        <div className={`relative ${className}`}>
            <Input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                error={error}
                size="lg"
                icon={<MapPin className="w-4 h-4" />}
                rightIcon={
                    isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primaryBlue" />
                    ) : null
                }
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="address-suggestions"
                aria-expanded={showDropdown}
                role="combobox"
            />

            {/* Dropdown */}
            {showDropdown && (
                <div
                    ref={dropdownRef}
                    id="address-suggestions"
                    role="listbox"
                    className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                    {isLoading && suggestions.length === 0 && (
                        <div className="p-4">
                            {/* Skeleton loaders */}
                            {[1, 2, 3].map(i => (
                                <div key={i} className="mb-2 animate-pulse">
                                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-1"></div>
                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoading && suggestions.length === 0 && !isError && (
                        <div className="p-4 text-center text-slate-500">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">No addresses found</p>
                            <p className="text-xs mt-1">
                                Try entering your pincode to auto-fill details
                            </p>
                        </div>
                    )}

                    {isError && (
                        <div className="p-4 text-center">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                            <p className="text-sm text-amber-700">
                                Unable to fetch suggestions
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Please enter address manually
                            </p>
                        </div>
                    )}

                    {!isLoading && suggestions.length > 0 && (
                        <div>
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    data-index={index}
                                    role="option"
                                    aria-selected={highlightedIndex === index}
                                    type="button"
                                    onClick={() => handleSelect(suggestion)}
                                    className={`w-full text-left px-4 py-3 transition-colors border-b border-slate-100 last:border-0 ${highlightedIndex === index
                                        ? 'bg-primaryBlue/5 border-l-2 border-l-primaryBlue'
                                        : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {suggestion.line1}
                                            </p>
                                            {suggestion.line2 && (
                                                <p className="text-xs text-slate-500 truncate">
                                                    {suggestion.line2}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-600 mt-1">
                                                {suggestion.city}, {suggestion.state} - {suggestion.pincode}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AddressAutocomplete;
