# Helix Loading System

Comprehensive loading system with intelligent state management and brand-aligned animations.

## Quick Reference

| Use Case | Loader Type | Example |
|----------|-------------|---------|
| Package tracking | `truck` | `<Loader variant="truck" message="Tracking..." />` |
| Data fetching | `skeleton` | `<Skeleton className="h-20 w-full" />` |
| Button click | `dots` | `<Loader variant="dots" size="sm" />` |
| File upload | `progress` | `<Loader variant="progress" progress={65} />` |
| Section loading | `spinner` | `<Loader variant="spinner" size="md" />` |

## Components

### `<Loader />`

Unified loader with multiple variants.

```tsx
import { Loader } from '@/components/ui';

// Truck animation (high-value moments)
<Loader variant="truck" size="lg" message="Tracking your package..." centered />

// Spinner (sections/cards)
<Loader variant="spinner" size="md" />

// Dots (inline/buttons)
<Loader variant="dots" size="sm" />

// Progress bar
<Loader variant="progress" progress={75} message="Uploading files..." />
```

**Props:**
- `variant`: `'truck' | 'spinner' | 'dots' | 'progress'` (default: `'spinner'`)
- `size`: `'sm' | 'md' | 'lg' | 'xl'` (default: `'md'`)
- `message`: Optional loading message
- `progress`: Progress percentage for progress variant (0-100)
- `centered`: Center the loader with minimum height
- `className`: Additional CSS classes

---

### `<Skeleton />`

Layout-preserving loading placeholder.

```tsx
import { Skeleton, CardSkeleton, TableSkeleton } from '@/components/ui';

// Basic skeleton
<Skeleton className="h-4 w-32" />

// With stagger effect
<div>
  <Skeleton className="h-4 w-full" delay={0} />
  <Skeleton className="h-4 w-full" delay={100} />
  <Skeleton className="h-4 w-full" delay={200} />
</div>

// Preset skeletons
<CardSkeleton />
<TableSkeleton rows={5} />
```

**Props:**
- `className`: Size and styling
- `shimmer`: Use shimmer animation (default: `true`)
- `delay`: Animation delay in ms for stagger effects

---

### `<LoadingButton />`

Button with integrated loading state.

```tsx
import { LoadingButton } from '@/components/ui';

<LoadingButton
  isLoading={isSubmitting}
  loadingText="Saving..."
  onClick={handleSubmit}
>
  Save Changes
</LoadingButton>
```

## Hooks

### `useLoader`

Intelligent loading state management with flash prevention.

```tsx
import { useLoader } from '@/hooks';

function TrackingSearch() {
  const { isLoading, showLoader, startLoading, stopLoading } = useLoader({
    minDelay: 300,    // Don't show if completes < 300ms
    minDisplay: 500,  // If shown, keep visible ≥ 500ms
  });

  async function search(trackingId: string) {
    startLoading();
    try {
      const result = await api.track(trackingId);
      setData(result);
    } finally {
      stopLoading();
    }
  }

  return (
    <>
      {showLoader && <Loader variant="truck" message="Tracking..." />}
      {!isLoading && data && <Results data={data} />}
    </>
  );
}
```

**Returns:**
- `isLoading`: Actual state (use for disabling inputs)
- `showLoader`: UI state (use for showing loaders)
- `startLoading()`: Begin loading
- `stopLoading()`: End loading
- `reset()`: Clear all timers

---

### `useProgress`

Progress tracking with completion callback.

```tsx
import { useProgress } from '@/hooks';

function FileUpload() {
  const { progress, setProgress, isComplete, reset } = useProgress({
    onComplete: () => {
      toast.success('Upload complete!');
    },
  });

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    await uploadWithProgress('/api/upload', formData, {
      onProgress: (percent) => setProgress(percent),
    });
  }

  return (
    <Loader 
      variant="progress" 
      progress={progress} 
      message={`${progress}% uploaded`} 
    />
  );
}
```

**Returns:**
- `progress`: Current progress (0-100)
- `setProgress(value)`: Set progress
- `increment(amount)`: Increment by amount
- `isComplete`: True when progress === 100
- `reset()`: Reset to initial value

## Decision Matrix

### When to Use Each Loader

**Truck Loader** (`variant="truck"`)
- ✅ Package tracking search
- ✅ Shipment creation workflow
- ✅ Rate calculation (multiple carriers)
- ✅ Label generation
- ❌ Quick button actions
- ❌ Form submissions

**Skeleton Screens**
- ✅ Dashboard loading (cards, metrics, charts)
- ✅ List/table data loading
- ✅ Timeline/history loading
- ✅ Settings page content
- ❌ Button loading states
- ❌ Modal content (use spinner instead)

**Spinner** (`variant="spinner"`)
- ✅ Card/section loading
- ✅ Modal content loading
- ✅ Infinite scroll loading more
- ✅ Search results loading
- ❌ Button states (use dots)
- ❌ Full page loads (use skeleton)

**Dots** (`variant="dots"`)
- ✅ Button loading states
- ✅ Inline form validation
- ✅ Auto-save indicators
- ✅ Quick filters
- ❌ Long operations (use truck/progress)
- ❌ Content areas (use skeleton)

**Progress Bar** (`variant="progress"`)
- ✅ File uploads
- ✅ Batch processing
- ✅ Multi-step workflows
- ✅ Export/import operations
- ❌ Unknown duration tasks
- ❌ Quick operations

## Best Practices

### 1. Prevent Loader Flash
```tsx
// ❌ Bad: Shows loader immediately
const [loading, setLoading] = useState(false);

// ✅ Good: Uses useLoader hook
const { showLoader, startLoading, stopLoading } = useLoader();
```

### 2. Match Skeleton to Content
```tsx
// ✅ Good: Skeleton matches final layout
{loading ? (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
) : (
  <div className="space-y-4">
    <h2 className="h-8">Title</h2>
    <p>Content line 1</p>
    <p>Content line 2</p>
  </div>
)}
```

### 3. Provide Context
```tsx
// ❌ Bad: Generic message
<Loader variant="spinner" message="Loading..." />

// ✅ Good: Specific message
<Loader variant="spinner" message="Loading shipments..." />
```

### 4. Accessibility
All loaders include:
- `role="status"` for screen readers
- `aria-live="polite"` for announcements
- `<span className="sr-only">Loading...</span>` for context

### 5. Performance
- Loaders use CSS animations (GPU-accelerated)
- Skeleton avoids layout shift (matches content dimensions)
- `useLoader` prevents unnecessary renders

## Dark Mode

All loaders automatically adapt to dark mode using CSS variables:

```css
/* Light mode */
--gray-800: #1F2937;
--primary-blue: #2525FF;

/* Dark mode */
.dark {
  --gray-300: #D1D5DB;
  --primary-blue: #3E3EFF;
}
```

Truck headlight uses `--primary-blue` sparingly, maintaining brand identity across themes.
