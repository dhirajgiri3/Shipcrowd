---
name: shipcrowd-feature-implementation
description: Implements new features for ShipCrowd shipping aggregator frontend following established patterns, architecture, and quality standards. Use when adding new pages, modals, tables, or domain features (Address Validation, Manifests, Communication Center, E-Commerce Integrations, Analytics, etc.).
---

# ShipCrowd Feature Implementation Skill

This skill guides implementation of new features for the ShipCrowd shipping aggregator platform, ensuring consistency with existing codebase patterns, architecture, and production-quality standards.

## When to Use This Skill

Use this skill when:
- Implementing new feature pages (Address Validation, Manifests, Communication Center, etc.)
- Creating new modals or wizards (E-Commerce setup, Bulk operations, etc.)
- Building new data tables or dashboards
- Adding new API integrations
- Implementing any feature from the frontend masterplan

**DO NOT use this skill for:**
- Bug fixes in existing features (use code-review skill instead)
- Simple text/style changes
- Documentation updates

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16.0.4 (App Router)
- **Language**: TypeScript (strict mode, no `any` types)
- **State Management**: @tanstack/react-query v5.90.12
- **Styling**: Tailwind CSS v4 + custom CSS variables
- **Forms**: react-hook-form v7.69.0
- **Notifications**: sonner v2.0.7
- **File Upload**: react-dropzone v14.3.8
- **HTTP Client**: axios v1.13.2

### Directory Structure
```
client/
├── app/
│   ├── seller/              # Seller dashboard pages
│   │   ├── wallet/
│   │   ├── cod/
│   │   ├── disputes/
│   │   ├── ndr/
│   │   ├── returns/
│   │   └── [new-feature]/   # New feature pages go here
│   └── admin/               # Admin dashboard pages
├── src/
│   ├── features/            # Feature-based components
│   │   ├── wallet/
│   │   │   └── components/  # Modals, tables, etc.
│   │   ├── disputes/
│   │   └── [new-feature]/   # New feature components
│   ├── core/
│   │   └── api/
│   │       └── hooks/       # React Query hooks
│   ├── components/
│   │   └── ui/              # Reusable UI primitives
│   └── lib/
│       └── utils.ts         # Utility functions
```

## Implementation Checklist

### Phase 1: Planning & API Analysis (15-20 minutes)

1. **Read Backend Documentation**
   - Check `/docs/Development/Planning/Masterplans/Frontend/Complete_Frontend_Masterplan.md`
   - Identify API endpoints for the feature
   - Verify backend API availability (Real API vs Mock Data)

2. **Understand Business Context**
   - Read `/docs/Resources/Data/Shipping-Aggregator-Scene.md`
   - Identify business rules and workflows
   - Determine priority level (P0/P1/P2)

3. **Review Similar Implementations**
   - Find similar existing features
   - Study their component structure
   - Reuse patterns and utilities

### Phase 2: API Integration (30-45 minutes)

1. **Create React Query Hooks** (`/src/core/api/hooks/use[Feature].ts`)

**Pattern for Query Hooks:**
```typescript
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005/api/v1';

// Type definitions (match backend DTOs)
interface FeatureListResponse {
  success: boolean;
  data: FeatureItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

interface FeatureItem {
  id: string;
  // ... other fields
  createdAt: string;
  updatedAt: string;
}

// Query hook
export function useFeatureList(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['feature-list', params],
    queryFn: async () => {
      const { data } = await axios.get<FeatureListResponse>(
        `${API_BASE_URL}/feature/list`,
        { params }
      );
      return data.data;
    },
    // Only refetch on mount if data is older than 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}
```

**Pattern for Mutation Hooks:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CreateFeaturePayload {
  name: string;
  // ... other fields
}

export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateFeaturePayload) => {
      const { data } = await axios.post(
        `${API_BASE_URL}/feature/create`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate related queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['feature-list'] });
      toast.success('Feature created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create feature';
      toast.error(message);
    },
  });
}
```

**CRITICAL RULES:**
- ✅ **ALWAYS** use TypeScript interfaces (no `any` types)
- ✅ **ALWAYS** handle errors with `toast.error()` (NEVER use `alert()`)
- ✅ **ALWAYS** show success feedback with `toast.success()`
- ✅ **ALWAYS** invalidate related queries after mutations
- ✅ **ALWAYS** use proper `staleTime` (5 minutes for lists, 10 minutes for details)
- ❌ **NEVER** use `alert()`, `confirm()`, or `prompt()`
- ❌ **NEVER** use fake/placeholder URLs for file uploads

### Phase 3: Page Implementation (1-2 hours)

1. **Create Page Component** (`/app/seller/[feature]/page.tsx`)

**Page Pattern:**
```typescript
'use client';

import React, { useState } from 'react';
import { useFeatureList } from '@/src/core/api/hooks/useFeature';
import { FeatureTable } from '@/src/features/feature-name/components/FeatureTable';
import { CreateFeatureModal } from '@/src/features/feature-name/components/CreateFeatureModal';
import { Button } from '@/src/components/ui/button';
import { Plus } from 'lucide-react';

export default function FeaturePage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: 'all',
    search: '',
  });

  const { data, isLoading, isError } = useFeatureList(filters);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Name</h1>
          <p className="text-muted-foreground mt-1">
            Brief description of what this page does
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Main Content */}
      <FeatureTable
        data={data || []}
        isLoading={isLoading}
        isError={isError}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Modals */}
      <CreateFeatureModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
```

**Page Layout Rules:**
- ✅ Use `'use client'` directive (App Router requires it for interactivity)
- ✅ Implement loading states (show skeletons during `isLoading`)
- ✅ Implement error states (show error message during `isError`)
- ✅ Use semantic HTML (`<h1>`, `<main>`, etc.)
- ✅ Use consistent spacing (`space-y-6`, `p-6`)
- ✅ Support dark mode (use Tailwind's `dark:` variants)

### Phase 4: Component Implementation (2-3 hours)

#### 4.1 Table Components

**Table Pattern** (`/src/features/[feature]/components/[Feature]Table.tsx`):

```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { Search, Filter, Download } from 'lucide-react';
import { useDebounce } from '@/src/hooks/useDebounce';

interface FeatureTableProps {
  data: FeatureItem[];
  isLoading: boolean;
  isError: boolean;
  filters: {
    page: number;
    limit: number;
    status: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function FeatureTable({
  data,
  isLoading,
  isError,
  filters,
  onFiltersChange,
}: FeatureTableProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(localSearch, 300);

  // Update filters when debounced search changes
  React.useEffect(() => {
    onFiltersChange({ ...filters, search: debouncedSearch });
  }, [debouncedSearch]);

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load data</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
          className="px-3 py-2 rounded-md border"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>

        {/* Export Button */}
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Column 1</th>
              <th className="text-left p-3 font-medium">Column 2</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3" colSpan={5}>
                    <div className="h-12 bg-muted/50 animate-pulse rounded" />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  No data found
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((item) => (
                <tr key={item.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">{item.field1}</td>
                  <td className="p-3">{item.field2}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'active' ? 'bg-green-100 text-green-700' :
                      item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {data.length} results
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => onFiltersChange({ ...filters, page: filters.page - 1 })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFiltersChange({ ...filters, page: filters.page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Table Rules:**
- ✅ **ALWAYS** debounce search inputs (300ms delay)
- ✅ **ALWAYS** show loading skeletons during data fetch
- ✅ **ALWAYS** show empty state when no data
- ✅ **ALWAYS** show error state with retry button
- ✅ **ALWAYS** implement pagination
- ✅ **ALWAYS** use status badges with color coding
- ✅ **ALWAYS** format dates consistently
- ❌ **NEVER** trigger API calls on every keystroke

#### 4.2 Modal Components

**Modal Pattern** (`/src/features/[feature]/components/CreateFeatureModal.tsx`):

```typescript
'use client';

import React, { useState } from 'react';
import { useCreateFeature } from '@/src/core/api/hooks/useFeature';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { X } from 'lucide-react';

interface CreateFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFeatureModal({ isOpen, onClose }: CreateFeatureModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    // ... other fields
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createFeature, isPending } = useCreateFeature();

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createFeature(formData, {
      onSuccess: () => {
        onClose();
        setFormData({ name: '', description: '' }); // Reset form
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Create Feature</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter name..."
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description..."
              rows={4}
              className={`w-full px-3 py-2 rounded-md border ${
                errors.description ? 'border-red-500' : ''
              }`}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Modal Rules:**
- ✅ **ALWAYS** use inline validation with error messages
- ✅ **ALWAYS** disable buttons during submission (`isPending`)
- ✅ **ALWAYS** reset form on successful submission
- ✅ **ALWAYS** close modal on successful submission
- ✅ **ALWAYS** show loading state on submit button
- ✅ **ALWAYS** use overlay backdrop (bg-black/50)
- ✅ **ALWAYS** support keyboard escape (optional enhancement)
- ❌ **NEVER** use browser `alert()` for errors

#### 4.3 File Upload Components

**File Upload Pattern:**

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File } from 'lucide-react';
import { toast } from 'sonner';

// Import your S3 upload service
import { uploadFileToS3 } from '@/src/lib/storage/s3-upload';

interface FileUploadProps {
  onUploadComplete: (urls: string[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number; // in bytes
}

export function FileUpload({
  onUploadComplete,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png'],
    'application/pdf': ['.pdf'],
  },
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate file size
    const oversizedFiles = acceptedFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed ${maxSize / (1024 * 1024)}MB limit`);
      return;
    }

    setFiles(prev => [...prev, ...acceptedFiles].slice(0, maxFiles));
  }, [maxFiles, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      // Upload files to S3 in parallel
      const uploadPromises = files.map(async (file, index) => {
        const url = await uploadFileToS3(file, {
          folder: 'feature-uploads',
          onProgress: (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress,
            }));
          },
        });
        return url;
      });

      const urls = await Promise.all(uploadPromises);

      onUploadComplete(urls);
      setFiles([]);
      setUploadProgress({});
      toast.success('Files uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <div>
            <p className="font-medium">Click to upload or drag and drop</p>
            <p className="text-sm text-muted-foreground mt-1">
              Maximum {maxFiles} files, up to {maxSize / (1024 * 1024)}MB each
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              {uploading && uploadProgress[file.name] !== undefined ? (
                <div className="w-32">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${uploadProgress[file.name]}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadProgress[file.name]}%
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
        </Button>
      )}
    </div>
  );
}
```

**File Upload Rules:**
- ✅ **ALWAYS** upload to real S3/CloudFlare R2 (NEVER fake URLs)
- ✅ **ALWAYS** validate file size and type
- ✅ **ALWAYS** show upload progress
- ✅ **ALWAYS** handle upload errors gracefully
- ✅ **ALWAYS** show file previews (for images)
- ✅ **ALWAYS** allow removing files before upload
- ❌ **NEVER** use placeholder/fake URLs
- ❌ **NEVER** skip error handling

### Phase 5: Testing & Quality Assurance (30 minutes)

**Manual Testing Checklist:**

1. **Functional Testing**
   - [ ] All API calls work correctly
   - [ ] Loading states show properly
   - [ ] Error states show properly
   - [ ] Empty states show properly
   - [ ] Form validation works
   - [ ] Success/error toasts appear
   - [ ] Data refreshes after mutations

2. **UX Testing**
   - [ ] Search debouncing works (no API spam)
   - [ ] Modals open/close smoothly
   - [ ] Forms reset after submission
   - [ ] Buttons disable during loading
   - [ ] No `alert()` dialogs anywhere

3. **Visual Testing**
   - [ ] Dark mode works correctly
   - [ ] Responsive on mobile/tablet/desktop
   - [ ] Loading skeletons match table layout
   - [ ] Status badges have proper colors
   - [ ] Spacing is consistent

4. **Edge Cases**
   - [ ] Empty data lists
   - [ ] API errors (disconnect backend to test)
   - [ ] Large file uploads (>10MB)
   - [ ] Very long text inputs
   - [ ] Rapid clicking (double submissions)

## Common Patterns Reference

### useDebounce Hook

Create `/src/hooks/useDebounce.ts` if it doesn't exist:

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### Date Formatting Utility

Add to `/src/lib/utils.ts`:

```typescript
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = new Date(date);

  if (format === 'short') {
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

### Currency Formatting

Add to `/src/lib/utils.ts`:

```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

## Quality Standards Checklist

Before marking a feature as complete, verify:

- [ ] **TypeScript**: No `any` types, all props/responses typed
- [ ] **Error Handling**: All API calls wrapped in try-catch or React Query error handling
- [ ] **User Feedback**: Toast notifications for all actions (no `alert()`)
- [ ] **Loading States**: Skeletons/spinners during data fetch
- [ ] **Empty States**: Friendly message when no data
- [ ] **Validation**: Inline form validation with error messages
- [ ] **Debouncing**: Search inputs debounced (300ms)
- [ ] **Dark Mode**: All components support dark mode
- [ ] **Responsive**: Works on mobile, tablet, desktop
- [ ] **Accessibility**: Proper labels, keyboard navigation
- [ ] **File Uploads**: Real S3 integration (no fake URLs)
- [ ] **Consistency**: Matches existing UI patterns

## Anti-Patterns to Avoid

❌ **DO NOT:**
- Use `alert()`, `confirm()`, or `prompt()`
- Use `any` type in TypeScript
- Create fake/placeholder URLs for file uploads
- Skip loading/error/empty states
- Make API calls on every keystroke
- Hard-code API URLs (use environment variables)
- Duplicate code (reuse existing components/hooks)
- Over-engineer (keep it simple)
- Add unnecessary features beyond requirements

## Getting Help

If stuck:
1. Check existing similar features (Wallet, Disputes, NDR, Returns)
2. Read the Complete Frontend Masterplan
3. Review the FRONTEND_AUDIT_2026-01-14.md for patterns
4. Ask specific questions about backend API structure

## Success Criteria

A feature is "done" when:
- ✅ All API integration works with real backend
- ✅ All CRUD operations functional
- ✅ Loading/error/empty states implemented
- ✅ Form validation working
- ✅ Toast notifications showing
- ✅ Dark mode supported
- ✅ Responsive design working
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ Matches existing UI consistency
- ✅ Manual testing checklist completed
