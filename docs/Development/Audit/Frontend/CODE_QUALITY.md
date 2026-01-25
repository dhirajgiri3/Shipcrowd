/**
 * Code Quality & Best Practices Guide
 * 
 * This document outlines coding standards and best practices for the Shipcrowd frontend.
 */

# Shipcrowd Frontend - Code Quality Guidelines

## 1. TypeScript Best Practices

### ✅ DO:
- Use explicit return types for functions
- Define interfaces for all component props
- Use enums for fixed sets of values
- Leverage generics for reusable components
- Use discriminated unions for complex state

### ❌ DON'T:
- Use `any` type (use `unknown` if truly necessary)
- Ignore TypeScript errors
- Disable strict mode checks
- Use type assertions without verification

**Example:**
```typescript
// ✅ Good
interface UserProps {
    id: string;
    name: string;
    role: 'admin' | 'user';
}

function UserCard({ id, name, role }: UserProps): JSX.Element {
    return <div>{name}</div>;
}

// ❌ Bad
function UserCard(props: any) {
    return <div>{props.name}</div>;
}
```

---

## 2. Component Structure

### Recommended Order:
1. Imports (React, third-party, local)
2. Type definitions
3. Constants
4. Component function
5. Hooks (useState, useEffect, custom)
6. Event handlers
7. Helper functions
8. Return JSX

**Example:**
```tsx
// 1. Imports
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

// 2. Types
interface Props {
    userId: string;
}

// 3. Constants
const MAX_RETRIES = 3;

// 4. Component
export function UserProfile({ userId }: Props) {
    // 5. Hooks
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetchUser();
    }, [userId]);

    // 6. Event handlers
    const handleSave = () => {
        // ...
    };

    // 7. Helpers
    const fetchUser = async () => {
        // ...
    };

    // 8. JSX
    return <div>...</div>;
}
```

---

## 3. API Hooks Pattern

### Structure:
```typescript
export function useResource(id?: string) {
    return useQuery({
        queryKey: queryKeys.resource.detail(id!),
        queryFn: async () => {
            const { data } = await apiClient.get(`/resource/${id}`);
            return data.data;
        },
        enabled: !!id,
        staleTime: 60000,
    });
}

export function useCreateResource() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateResourcePayload) => {
            const { data } = await apiClient.post('/resource', payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.resource.all() });
        },
        onError: (error) => handleApiError(error, 'Failed to create resource'),
    });
}
```

---

## 4. Accessibility Checklist

- [ ] All images have alt text
- [ ] Interactive elements have aria-labels
- [ ] Forms have associated labels
- [ ] Color is not the only means of conveying information
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] ARIA roles are used appropriately
- [ ] Screen reader announcements for dynamic content

---

## 5. Performance Tips

### Memoization:
```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }: Props) => {
    // ...
});

// Use useMemo for expensive calculations
const sortedData = useMemo(() => {
    return data.sort((a, b) => a.value - b.value);
}, [data]);

// Use useCallback for event handlers passed as props
const handleClick = useCallback(() => {
    // ...
}, [dependency]);
```

### Code Splitting:
```typescript
// Lazy load heavy components
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
    loading: () => <ChartSkeleton />,
    ssr: false,
});
```

---

## 6. Error Handling

### Consistent Pattern:
```typescript
try {
    const result = await riskyOperation();
    showSuccessToast('Operation completed');
    return result;
} catch (error) {
    handleApiError(error, 'Operation failed');
    // Don't rethrow unless necessary for parent to handle
}
```

### Use Error Boundaries:
```tsx
<ErrorBoundary>
    <SuspiciousComponent />
</ErrorBoundary>
```

---

## 7. CSS/Styling

### Tailwind Best Practices:
- Use `cn()` utility for conditional classes
- Extract repeated patterns to components
- Use CSS variables for theming
- Avoid inline styles when possible

```tsx
// ✅ Good
const buttonClass = cn(
    'px-4 py-2 rounded-lg',
    isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
);

// ❌ Bad
<button style={{ backgroundColor: isActive ? 'blue' : 'gray' }}>
```

---

## 8. Testing Considerations

### What to Test:
- User interactions (clicks, form submissions)
- Data fetching and loading states
- Error states
- Accessibility (aria labels, keyboard navigation)

### Example:
```typescript
test('shows error message on failed submission', async () => {
    const { getByRole, getByText } = render(<Form />);
    
    fireEvent.click(getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
        expect(getByText(/error occurred/i)).toBeInTheDocument();
    });
});
```

---

## 9. Git Commit Messages

### Format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `style`: Formatting changes
- `test`: Adding tests
- `chore`: Maintenance tasks

### Example:
```
feat(auth): add password reset functionality

- Implemented reset password API endpoint
- Created email template for reset link
- Added frontend form for password reset

Closes #123
```

---

## 10. Code Review Checklist

- [ ] Does it follow TypeScript best practices?
- [ ] Are there any console.logs left?
- [ ] Is error handling comprehensive?
- [ ] Are loading states handled?
- [ ] Is it accessible (ARIA labels, keyboard nav)?
- [ ] Are there any hardcoded values that should be constants?
- [ ] Is the code DRY (Don't Repeat Yourself)?
- [ ] Are naming conventions consistent?
- [ ] Is it performant (no unnecessary re-renders)?
- [ ] Are there tests?
