# Universal Page Refinement & Quality Assurance Prompt

## Context Understanding Phase

**First, thoroughly analyze and understand:**

1. **Page Identity & Purpose**
   - What is the primary purpose of this page in the application?
   - What user problems does it solve?
   - What actions should users be able to complete on this page?
   - How does this page fit into the overall user journey and application flow?

2. **User Personas & Use Cases**
   - Who are the primary users of this page (e.g., shippers, admins, carriers)?
   - What are the typical scenarios where users interact with this page?
   - What are the user's goals when they land on this page?
   - What information or outcomes do users expect from this page?

3. **Data Flow & State Management**
   - What data does this page consume (props, API responses, context, state)?
   - What data does this page produce or mutate (form submissions, API calls, state updates)?
   - How does data flow between parent and child components?
   - What are the loading, error, and success states for each data operation?

4. **Integration Points & Dependencies**
   - Which other pages, components, or services does this page interact with?
   - What navigation paths lead to and from this page?
   - What APIs, hooks, or utilities does this page depend on?
   - Are there any third-party integrations involved?

## Codebase Architecture Reconnaissance Phase

**Before making any changes, thoroughly audit the existing codebase structure:**

1. **Existing Components Inventory**
   - Scan `client/src/components` directory for all available UI components
   - Identify existing reusable components: Buttons, Cards, Badges, Modals, Forms, Inputs, Toast/Notifications, Loaders/Spinners, Tables, Dropdowns, Tabs, etc.
   - Document the props and usage patterns of these existing components
   - Note any variants or configurations available (sizes, colors, styles)
   - **CRITICAL**: Never create new components that duplicate existing functionality

2. **Centralized Hooks Audit**
   - Thoroughly examine `client/src/core/api/hooks` directory for all existing hooks
   - Identify available data-fetching hooks (useQuery, useMutation patterns)
   - Note existing custom hooks for common functionality (useAuth, useToast, usePagination, useFilters, etc.)
   - Document hook parameters, return values, and usage patterns
   - **CRITICAL**: All new hooks MUST be created in `client/src/core/api/hooks` directory to maintain centralization
   - Check if a hook for your needed functionality already exists before creating a new one

3. **Utilities & Helpers Inventory**
   - Locate centralized utility functions (formatting, validation, data transformation)
   - Identify helper functions in `client/src/utils` or similar directories
   - Note existing API service functions and their locations
   - Document constants, enums, and type definitions already available
   - **CRITICAL**: Reuse existing utilities instead of creating duplicate logic

4. **Design System Audit**
   - Review `global.css` thoroughly for all available CSS custom properties/variables
   - Document available design tokens: colors (primary, secondary, neutral, semantic), spacing scale, typography scale, shadows, border radius, transitions, breakpoints, z-index scale
   - Note any utility classes or design patterns defined globally
   - Identify component-specific styling conventions already established
   - **CRITICAL**: All styling must use these existing variables, never hardcode values

5. **Existing Page Patterns Analysis**
   - Review 2-3 similar pages in the application to understand established patterns
   - Note consistent layout structures, component compositions, and data-fetching patterns
   - Identify common UX patterns for loading states, error handling, empty states, and user feedback
   - Document navigation patterns and user flow conventions
   - **CRITICAL**: Maintain consistency with existing patterns unless there's a compelling reason to deviate

## Comprehensive Analysis Phase

**Conduct a deep audit of the current implementation:**

1. **Component Architecture Analysis**
   - Map out all components, subcomponents, and their hierarchy on this page
   - **Cross-check each component against existing components inventory** - identify opportunities to replace custom components with existing ones
   - Identify component responsibilities and whether they follow single responsibility principle
   - Check for proper component composition and reusability
   - Verify props drilling isn't excessive and state management is appropriate
   - Ensure components are properly typed (TypeScript) with clear interfaces
   - **Flag any duplicate or redundant components that should be consolidated**

2. **Hooks & Data Management Audit**
   - Identify all hooks currently used on the page
   - **Cross-check against centralized hooks in `client/src/core/api/hooks`** - identify hooks that should be moved or replaced
   - Note any custom hooks defined within the page file (these should likely be centralized)
   - Verify all API calls are properly implemented with error handling
   - Check that hooks follow consistent patterns with other centralized hooks
   - Ensure proper hook dependencies and avoid stale closures
   - **Flag any duplicate data-fetching logic that should use centralized hooks**

3. **State Management & Data Flow Audit**
   - Check that loading states use existing loader components, not custom spinners
   - Ensure error states use the existing Toast/notification system for user feedback
   - Confirm success states provide clear feedback using existing Toast components
   - Validate that data transformations are correct and efficient
   - Check for race conditions or stale data issues
   - Ensure proper data validation before submission
   - Verify state updates don't cause unnecessary re-renders
   - **Ensure Toast is used consistently for all notifications, not custom alerts**

4. **Functionality & Workflow Verification**
   - Test all user interactions (clicks, inputs, form submissions, filters, searches)
   - Verify all forms have proper validation (client-side and match backend expectations)
   - Ensure all buttons use existing Button components with consistent styling
   - Check that conditional rendering logic works correctly for all scenarios
   - Validate pagination, sorting, and filtering functionality if present
   - Verify modal/dialog flows open, close, and submit properly using existing Modal components
   - Ensure file uploads, downloads, or data exports work correctly
   - Check that navigation flows to correct destinations with proper parameters

5. **Design System Compliance Audit**
   - **Identify all hardcoded colors, spacing, font-sizes, shadows, borders** - these must be replaced with CSS variables from global.css
   - Check for inline styles that should use design system classes or variables
   - Verify consistency with design system color palette (not inventing new colors)
   - Ensure spacing follows the established spacing scale
   - Check typography hierarchy uses design system font scales and weights
   - **Flag any custom styled-components or CSS that duplicates design system patterns**

6. **Integration & Connection Audit**
   - Verify API endpoints are correctly called with proper parameters
   - Ensure data passed between components is complete and correctly formatted
   - Check that URL parameters, query strings, and route params are properly handled
   - Validate that global state (context, Redux, etc.) is correctly accessed and updated
   - Ensure event handlers and callbacks are properly connected
   - Verify form data maps correctly to API payload structure

7. **Edge Cases & Error Scenarios**
   - Check behavior with empty states (no data available) - ensure using existing empty state patterns
   - Verify handling of partial data or missing fields
   - Test behavior with invalid or unexpected input
   - Ensure proper handling of network failures or API errors using Toast
   - Check permission-based rendering (if applicable)
   - Verify behavior when session expires or user is unauthorized
   - Test boundary conditions (maximum values, character limits, etc.)

## Gap Identification Phase

**Identify all issues, gaps, and improvement opportunities:**

1. **Broken or Incomplete Functionality**
   - List any features that are partially implemented but not functional
   - Identify buttons, links, or forms that don't perform their intended action
   - Note any components that render but don't update based on user interaction
   - Flag any data that should display but doesn't appear
   - Identify missing error handling or validation

2. **Missing Connections & Integrations**
   - Identify components that should communicate but don't
   - Note data that should flow between components but isn't passed
   - Flag API calls that should be made but aren't implemented
   - Identify navigation paths that should exist but are missing
   - Note callbacks or event handlers that should be wired but aren't

3. **Code Redundancy & Duplication Issues**
   - **List any custom components that duplicate existing UI components** (Button, Card, Badge, Toast, Loader, Modal, Input, etc.)
   - **Identify any custom hooks defined in page files that should be in `client/src/core/api/hooks`**
   - Note duplicate data-fetching logic that should use centralized hooks
   - Flag duplicate utility functions or helper logic
   - Identify repeated styling patterns that should use design system
   - **List any custom loaders/spinners that should use existing loader components**
   - **Note any custom notification/alert logic that should use Toast system**

4. **Design System Violations**
   - **List all hardcoded color values that should use CSS variables** (e.g., #3B82F6 → var(--color-primary))
   - **Identify hardcoded spacing values that should use spacing scale** (e.g., 16px → var(--spacing-4))
   - **Note hardcoded typography that should use design system** (e.g., font-size: 14px → var(--font-size-sm))
   - Flag inconsistent button styles not using design system Button component
   - Identify custom shadows, borders, or radii not using design system tokens
   - Note missing or inconsistent hover, focus, active, and disabled states
   - **Flag any component not following established design patterns from similar pages**

5. **Architectural Consistency Issues**
   - Note deviations from established patterns found in similar pages
   - Identify inconsistent hook usage patterns compared to centralized hooks
   - Flag unusual component structures that don't match application conventions
   - Note inconsistent error handling or loading state patterns
   - Identify non-standard navigation or routing approaches

6. **Usability & User Experience Gaps**
   - Identify areas where user intent or available actions are unclear
   - Note missing visual hierarchy or emphasis on important elements
   - Flag insufficient feedback for user actions (should use existing Toast, loaders)
   - Identify overwhelming layouts or information overload
   - Note missing or unclear call-to-action buttons (should use design system Button)
   - Identify confusing navigation or unclear page structure
   - Flag missing empty states with helpful guidance
   - Note accessibility issues (keyboard navigation, screen reader support, color contrast)

7. **Performance & Code Quality Issues**
   - Identify unnecessary re-renders or inefficient rendering patterns
   - Note any memory leaks or improper cleanup
   - Flag overly complex or deeply nested components
   - Identify code duplication that should be abstracted
   - Note missing memoization where beneficial

## Implementation & Refinement Phase

**Fix, improve, and refine systematically with strict adherence to existing architecture:**

1. **Fix All Broken Functionality**
   - Repair any non-functional features, buttons, forms, or interactions
   - Complete all partially implemented features to full working state
   - Fix all data flow issues and ensure proper communication between components
   - Implement missing error handling using existing Toast system
   - Implement missing validation using existing validation utilities
   - Resolve all API integration issues
   - Fix routing and navigation problems

2. **Eliminate All Redundancy & Duplication**
   - **Replace all custom components with existing UI components from components directory**:
     - Use existing Button component (with appropriate variant/size props) instead of custom buttons
     - Use existing Card component instead of custom card wrappers
     - Use existing Badge component for status indicators, labels, tags
     - Use existing Modal/Dialog components instead of custom modals
     - Use existing Input/Form components instead of custom form fields
     - Use existing Table component if displaying tabular data
     - Use existing Dropdown/Select components instead of custom selects
   - **Replace all custom loaders with existing loader components**:
     - Use existing Spinner/Loader component for loading states
     - Use existing Skeleton components for content loading
     - Never create custom loading animations or spinners
   - **Consolidate all notification logic to use existing Toast system**:
     - Use Toast for success messages (e.g., "Shipment created successfully")
     - Use Toast for error messages (e.g., "Failed to load data")
     - Use Toast for warning messages
     - Use Toast for info messages
     - Never use window.alert(), custom notifications, or inline error text for global feedback
   - **Move all custom hooks to centralized location**:
     - Move any page-specific hooks to `client/src/core/api/hooks` if they could be reused
     - Refactor data-fetching logic to use existing centralized hooks pattern
     - Ensure new hooks follow the same naming and structure conventions as existing hooks
     - Document new hooks with clear JSDoc comments
   - **Replace duplicate utility functions with existing centralized utilities**
   - **Remove any duplicate API call logic** - use existing hooks from `client/src/core/api/hooks`

3. **Enforce Design System Consistency**
   - **Replace ALL hardcoded values with CSS variables from global.css**:
     - Colors: Use var(--color-primary), var(--color-secondary), var(--color-neutral-*), var(--color-success), var(--color-error), var(--color-warning), etc.
     - Spacing: Use var(--spacing-1) through var(--spacing-12) or whatever scale exists
     - Typography: Use var(--font-size-xs), var(--font-size-sm), var(--font-size-base), var(--font-weight-normal), var(--font-weight-semibold), etc.
     - Shadows: Use var(--shadow-sm), var(--shadow-md), var(--shadow-lg)
     - Border radius: Use var(--radius-sm), var(--radius-md), var(--radius-lg)
     - Transitions: Use var(--transition-fast), var(--transition-base), var(--transition-slow)
   - Remove all inline styles and convert to CSS variables
   - Ensure consistent component styling patterns across the page
   - Implement proper interactive states (hover, focus, active, disabled) using design system styles
   - Follow established layout patterns (grids, flexbox, spacing scale)
   - Maintain consistent iconography and visual elements matching other pages
   - **Never introduce new colors, spacing values, or design tokens** - only use what exists in global.css

4. **Complete Missing Connections**
   - Wire up all disconnected components, callbacks, and event handlers
   - Implement missing data flow between parent-child components
   - Complete all API integrations using centralized hooks
   - Connect all forms to their submission handlers with Toast feedback
   - Implement missing navigation links and routing logic

5. **Enhance User Experience & Usability**
   - Implement clear visual hierarchy using design system typography and spacing
   - Use existing Button component with action-oriented labels for CTAs
   - Provide immediate visual feedback using existing Toast and Loader components:
     - Show loader when data is being fetched
     - Show Toast on successful action completion
     - Show Toast with clear error message on failure
   - Create helpful empty states with clear guidance on next steps (use existing empty state patterns)
   - Improve form UX with inline validation, Toast error messages, and clear field labels using existing Input components
   - Ensure intuitive page structure with logical grouping and clear section headings
   - Add tooltips or help text where actions might be unclear (use existing Tooltip component if available)
   - Implement skeleton loaders or progress indicators using existing loader components
   - Ensure sufficient color contrast using design system semantic colors
   - Make interactive elements obviously clickable/tappable using existing component styles

6. **Implement Comprehensive State Management**
   - Add loading states using existing loader components for all async operations
   - Implement error states with Toast notifications showing user-friendly, actionable error messages
   - Add success states with Toast confirmations for completed actions
   - Handle edge cases: empty data (use existing empty state components), no results, unauthorized access, network failures
   - Implement optimistic updates where appropriate for better perceived performance
   - Add proper data refetching or cache invalidation after mutations

7. **Maintain Architectural Consistency**
   - Follow the same component structure patterns as similar pages
   - Use the same hook patterns as other pages (centralized hooks from `client/src/core/api/hooks`)
   - Implement error handling consistently with application conventions (Toast for global, inline for field-level)
   - Follow the same navigation and routing patterns as other pages
   - Use the same state management approach as similar pages
   - Match the code organization and file structure of similar pages

8. **Optimize & Refactor Code**
   - Extract reusable logic into custom hooks in `client/src/core/api/hooks`
   - Break down large components into smaller, focused subcomponents (using existing UI components where possible)
   - Eliminate code duplication through abstraction and reuse
   - Optimize rendering with proper memoization (useMemo, useCallback, React.memo)
   - Ensure proper cleanup in useEffect hooks
   - Add meaningful comments for complex logic
   - Improve TypeScript typing for better type safety
   - Remove unused imports, variables, and dead code

9. **Ensure Accessibility**
   - Add proper ARIA labels and roles
   - Ensure keyboard navigation works for all interactive elements
   - Verify color contrast meets WCAG standards using design system semantic colors
   - Add focus indicators that are clearly visible (using design system focus styles)
   - Ensure form fields have associated labels (using existing Input component patterns)
   - Make error messages programmatically associated with their fields

## Pre-Implementation Safety Checks

**Before implementing any changes, verify:**

1. **Component Reusability Check**
   - Have I checked if an existing component can be used instead of creating a new one?
   - Am I using existing Button, Card, Badge, Modal, Input, Loader, Toast components?
   - Have I reviewed the components directory thoroughly?

2. **Hooks Centralization Check**
   - Am I creating any new hooks? If yes, will they be placed in `client/src/core/api/hooks`?
   - Have I checked if a similar hook already exists in `client/src/core/api/hooks`?
   - Am I reusing existing data-fetching hooks instead of making raw API calls?

3. **Design System Compliance Check**
   - Am I using CSS variables from global.css for all styling?
   - Have I eliminated all hardcoded colors, spacing, and typography values?
   - Am I following the same design patterns as similar pages?

4. **No Breaking Changes Check**
   - Will my changes break any existing functionality?
   - Am I modifying shared components in a way that could affect other pages?
   - Am I changing API call signatures or data structures that other parts depend on?
   - Have I tested that navigation to/from this page still works?

5. **Consistency Check**
   - Does my implementation match patterns from similar pages?
   - Am I using Toast consistently for all user feedback?
   - Am I using existing loader components consistently for all loading states?
   - Does my code style match the existing codebase conventions?

## Validation Phase

**Verify the refined implementation meets all requirements:**

1. **Functional Testing**
   - Test all user flows from start to finish
   - Verify all forms submit correctly and display Toast feedback
   - Test all interactive elements using existing component library
   - Verify data loads, displays, and updates correctly
   - Test error scenarios and verify Toast error messages appear
   - Confirm navigation works correctly
   - Verify loaders appear during data fetching using existing loader components

2. **Redundancy Elimination Verification**
   - Confirm NO custom components duplicate existing UI components
   - Verify ALL hooks are in centralized location (`client/src/core/api/hooks`)
   - Confirm Toast system is used for ALL user notifications, not custom solutions
   - Verify existing loader components are used everywhere, no custom loaders
   - Confirm no duplicate utility functions or API call logic

3. **Design System Compliance Check**
   - Verify ALL colors use CSS variables from global.css (no hardcoded hex/rgb values)
   - Verify ALL spacing uses design system spacing variables (no hardcoded px/rem values)
   - Verify ALL typography uses design system font variables
   - Check consistency with other pages in the application
   - Ensure responsive behavior matches design system breakpoints
   - Verify interactive states follow design system patterns

4. **Architectural Consistency Check**
   - Confirm component structure matches similar pages
   - Verify hook usage patterns match other pages
   - Check that error handling matches application conventions
   - Ensure navigation patterns are consistent
   - Verify state management approach is consistent

5. **User Experience Validation**
   - Confirm page purpose and available actions are immediately clear
   - Verify visual hierarchy effectively guides user attention using design system
   - Ensure all user actions receive appropriate feedback (Toast for success/error, loaders for loading)
   - Check that the page is intuitive and doesn't require explanation
   - Verify empty states, loading states (using existing loaders), and error states (using Toast) are helpful and clear
   - Confirm all buttons use existing Button component with clear labels

6. **Code Quality Review**
   - Ensure code is clean, well-organized, and maintainable
   - Verify proper TypeScript typing throughout
   - Check for console errors or warnings
   - Ensure no dead code or unused imports
   - Verify proper component structure and separation of concerns
   - Confirm no breaking changes have been introduced

7. **Safety & Regression Check**
   - Verify no existing functionality has been broken
   - Confirm shared components haven't been modified in breaking ways
   - Test that navigation to/from this page works correctly
   - Verify API calls still work as expected
   - Check that no console errors or warnings have been introduced

## Performance Optimization Phase

**Analyze and implement comprehensive performance, speed, and cost optimizations across the entire stack:**

### 1. **Frontend Performance Analysis & Optimization**

#### A. **Bundle Size & Code Splitting**
   - **Analyze current bundle size** using `npm run build` and review build output
   - **Identify large dependencies** that could be lazy-loaded or replaced with lighter alternatives
   - **Implement code splitting** for routes and heavy components:
     ```typescript
     // Lazy load heavy components
     const HeavyComponent = lazy(() => import('./HeavyComponent'));
     
     // Split routes
     const OrdersPage = lazy(() => import('@/app/orders/page'));
     ```
   - **Dynamic imports for conditionally-used code**:
     ```typescript
     // Only load when needed
     if (needsExport) {
       const { exportToExcel } = await import('@/utils/export');
       exportToExcel(data);
     }
     ```
   - **Tree-shake unused code** by ensuring proper ESM imports (`import { specific }` not `import *`)
   - **Analyze and remove unused dependencies** from `package.json`
   - **Use lightweight alternatives** where possible (e.g., `date-fns` instead of `moment`, `zustand` instead of Redux if applicable)
   - **Target**: Reduce initial bundle size by at least 20-30% for faster First Contentful Paint (FCP)

#### B. **Component Rendering Optimization**
   - **Identify unnecessary re-renders** using React DevTools Profiler
   - **Implement memoization strategically**:
     ```typescript
     // Memoize expensive computations
     const expensiveValue = useMemo(() => {
       return computeExpensiveValue(data);
     }, [data]);
     
     // Memoize callbacks passed to child components
     const handleClick = useCallback(() => {
       performAction(id);
     }, [id]);
     
     // Memoize components that receive stable props
     const MemoizedComponent = React.memo(ExpensiveComponent, (prev, next) => {
       return prev.id === next.id && prev.status === next.status;
     });
     ```
   - **Virtualize long lists** using `react-window` or `react-virtualized`:
     ```typescript
     import { FixedSizeList } from 'react-window';
     
     <FixedSizeList
       height={600}
       itemCount={items.length}
       itemSize={50}
       width="100%"
     >
       {({ index, style }) => (
         <div style={style}>{items[index]}</div>
       )}
     </FixedSizeList>
     ```
   - **Debounce search and filter inputs** to reduce unnecessary API calls:
     ```typescript
     const debouncedSearch = useMemo(
       () => debounce((value: string) => {
         performSearch(value);
       }, 300),
       []
     );
     ```
   - **Use pagination or infinite scroll** instead of loading all data at once
   - **Avoid inline object/array creation in props** (causes new references on every render)
   - **Target**: Reduce re-renders by 40-60% and improve interaction responsiveness

#### C. **Image & Asset Optimization**
   - **Use Next.js Image component** with proper sizing and lazy loading:
     ```typescript
     import Image from 'next/image';
     
     <Image
       src="/product.jpg"
       alt="Product"
       width={400}
       height={300}
       loading="lazy"
       placeholder="blur"
       quality={85}
     />
     ```
   - **Implement responsive images** with proper `srcset` and sizes
   - **Compress images** before upload (WebP format for modern browsers)
   - **Lazy load images below the fold** using native `loading="lazy"` or Intersection Observer
   - **Use SVGs for icons** instead of icon fonts or PNGs
   - **Implement CDN caching** for static assets with long cache headers
   - **Target**: Reduce image payload by 50-70% and improve Largest Contentful Paint (LCP)

#### D. **Client-Side Data Management**
   - **Implement aggressive caching** with proper cache invalidation:
     ```typescript
     // React Query example with optimized caching
     const { data } = useQuery({
       queryKey: ['orders', filters],
       queryFn: fetchOrders,
       staleTime: 5 * 60 * 1000, // 5 minutes
       cacheTime: 10 * 60 * 1000, // 10 minutes
       refetchOnWindowFocus: false,
       refetchOnMount: false,
     });
     ```
   - **Use optimistic updates** to improve perceived performance:
     ```typescript
     const mutation = useMutation({
       mutationFn: updateOrder,
       onMutate: async (newOrder) => {
         // Cancel outgoing refetches
         await queryClient.cancelQueries({ queryKey: ['orders'] });
         
         // Snapshot current value
         const previous = queryClient.getQueryData(['orders']);
         
         // Optimistically update
         queryClient.setQueryData(['orders'], (old) => [...old, newOrder]);
         
         return { previous };
       },
       onError: (err, newOrder, context) => {
         // Rollback on error
         queryClient.setQueryData(['orders'], context.previous);
       },
       onSettled: () => {
         queryClient.invalidateQueries({ queryKey: ['orders'] });
       },
     });
     ```
   - **Prefetch data for likely next actions**:
     ```typescript
     // Prefetch on hover
     const handleMouseEnter = () => {
       queryClient.prefetchQuery({
         queryKey: ['order', orderId],
         queryFn: () => fetchOrderDetails(orderId),
       });
     };
     ```
   - **Implement request deduplication** to prevent duplicate API calls
   - **Use local state for ephemeral UI state** (don't store everything in global state)
   - **Target**: Reduce API calls by 30-50% and improve perceived load time

#### E. **Network Optimization**
   - **Implement request batching** for multiple related queries
   - **Use HTTP/2 multiplexing** (ensure server supports it)
   - **Compress API responses** with gzip/brotli
   - **Implement progressive loading**: load critical data first, defer non-critical
   - **Use Service Workers** for offline capability and faster repeat visits (if applicable)
   - **Implement resource hints**:
     ```html
     <link rel="preconnect" href="https://api.example.com" />
     <link rel="dns-prefetch" href="https://cdn.example.com" />
     <link rel="preload" href="/critical.css" as="style" />
     ```
   - **Target**: Reduce Time to First Byte (TTFB) by 20-40%

### 2. **Backend API Performance Analysis & Optimization**

#### A. **Database Query Optimization**
   - **Analyze slow queries** using database query profiler and logging:
     ```typescript
     // Enable query logging in development
     mongoose.set('debug', (collectionName, method, query, doc) => {
       console.log(`${collectionName}.${method}`, JSON.stringify(query), doc);
     });
     ```
   - **Add proper indexes** for frequently queried fields:
     ```typescript
     // Create compound indexes for common query patterns
     schema.index({ sellerId: 1, status: 1, createdAt: -1 });
     schema.index({ trackingNumber: 1 }); // Unique queries
     schema.index({ 'address.pincode': 1 }); // Nested fields
     ```
   - **Use `.select()` to limit returned fields** (avoid fetching unnecessary data):
     ```typescript
     const orders = await Order.find({ sellerId })
       .select('orderId status totalAmount createdAt') // Only needed fields
       .lean(); // Return plain objects, not Mongoose documents
     ```
   - **Implement pagination at database level**:
     ```typescript
     const { page = 1, limit = 20 } = req.query;
     const orders = await Order.find(query)
       .skip((page - 1) * limit)
       .limit(limit)
       .lean();
     ```
   - **Use aggregation pipelines** for complex data transformations (faster than client-side processing)
   - **Avoid N+1 queries** by using proper population or joins:
     ```typescript
     // BAD: N+1 queries
     const orders = await Order.find();
     for (const order of orders) {
       order.seller = await Seller.findById(order.sellerId);
     }
     
     // GOOD: Single query with population
     const orders = await Order.find()
       .populate('sellerId', 'name email')
       .lean();
     ```
   - **Use `.lean()` for read-only queries** (50-70% faster than full Mongoose documents)
   - **Implement database-level filtering and sorting** (don't fetch all and filter in code)
   - **Target**: Reduce average query time by 50-80%

#### B. **API Endpoint Optimization**
   - **Implement field filtering** (GraphQL-style field selection for REST):
     ```typescript
     // Allow clients to specify needed fields
     // GET /api/orders?fields=orderId,status,totalAmount
     const fields = req.query.fields?.split(',').join(' ');
     const orders = await Order.find().select(fields);
     ```
   - **Use HTTP caching headers** appropriately:
     ```typescript
     // Cache static/infrequent-change data
     res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
     res.setHeader('ETag', generateETag(data));
     
     // Implement conditional requests
     if (req.headers['if-none-match'] === etag) {
       return res.status(304).end();
     }
     ```
   - **Implement response compression** (gzip/brotli):
     ```typescript
     import compression from 'compression';
     app.use(compression({ level: 6 }));
     ```
   - **Batch related queries** into single endpoint when possible
   - **Use HTTP/2 server push** for predictable resource needs
   - **Implement rate limiting** to prevent abuse and ensure fair resource allocation
   - **Target**: Reduce API response time by 30-50%

#### C. **Caching Strategy**
   - **Implement multi-layer caching**:
     
     **Layer 1: In-Memory Cache (Redis/Node-cache)**
     ```typescript
     import NodeCache from 'node-cache';
     const cache = new NodeCache({ stdTTL: 300 }); // 5 min default
     
     async function getOrderStats(sellerId: string) {
       const cacheKey = `stats:${sellerId}`;
       const cached = cache.get(cacheKey);
       if (cached) return cached;
       
       const stats = await computeStats(sellerId);
       cache.set(cacheKey, stats, 300); // Cache for 5 minutes
       return stats;
     }
     ```
     
     **Layer 2: Database Query Result Cache**
     ```typescript
     // Use MongoDB query result caching
     const result = await Order.find({ sellerId })
       .cache(300) // If using mongoose-cache plugin
       .lean();
     ```
     
     **Layer 3: CDN/HTTP Cache**
     ```typescript
     // Cache static/public data at CDN level
     res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
     ```
   
   - **Implement cache invalidation strategy**:
     ```typescript
     // Invalidate related caches on mutation
     async function updateOrder(orderId: string, updates: any) {
       const order = await Order.findByIdAndUpdate(orderId, updates);
       
       // Invalidate related caches
       cache.del(`order:${orderId}`);
       cache.del(`stats:${order.sellerId}`);
       cache.del(`orders:list:${order.sellerId}`);
       
       return order;
     }
     ```
   - **Use stale-while-revalidate pattern** for non-critical data
   - **Implement cache warming** for frequently accessed data
   - **Target**: Reduce database load by 60-80% through effective caching

#### D. **Background Processing & Queue Optimization**
   - **Offload heavy operations to background jobs**:
     ```typescript
     // Don't process heavy tasks in request-response cycle
     app.post('/api/orders/bulk-import', async (req, res) => {
       const jobId = await queue.add('import-orders', {
         file: req.file,
         userId: req.user.id,
       });
       
       // Return immediately
       res.json({ message: 'Import started', jobId });
     });
     ```
   - **Use job queues** (Bull, BullMQ) for async processing:
     ```typescript
     import Queue from 'bull';
     const emailQueue = new Queue('email-notifications', redisConfig);
     
     // Process in background
     emailQueue.process(async (job) => {
       await sendEmail(job.data);
     });
     ```
   - **Implement batch processing** for bulk operations
   - **Use worker threads** for CPU-intensive tasks
   - **Implement graceful degradation** when background services are slow
   - **Target**: Reduce API response time for heavy operations by 70-90%

#### E. **Data Serialization & Payload Optimization**
   - **Minimize response payload size**:
     ```typescript
     // Transform and clean data before sending
     const orders = await Order.find().lean();
     
     const optimized = orders.map(order => ({
       id: order._id,
       orderId: order.orderId,
       status: order.status,
       amount: order.totalAmount,
       date: order.createdAt,
       // Don't send unused fields like __v, internal flags, etc.
     }));
     ```
   - **Use compression** for large payloads
   - **Implement field projection** (only send requested fields)
   - **Use protocol buffers or MessagePack** for binary serialization (if applicable)
   - **Flatten nested objects** when possible to reduce parsing overhead
   - **Target**: Reduce average response size by 40-60%

### 3. **Load & Speed Optimization**

#### A. **Page Load Performance**
   - **Optimize Critical Rendering Path**:
     - Inline critical CSS (above-the-fold styles)
     - Defer non-critical CSS
     - Minimize render-blocking JavaScript
     - Use `async` or `defer` for scripts
   - **Implement skeleton screens** for perceived performance using existing loader components
   - **Progressive enhancement**: load core functionality first, enhancements later
   - **Optimize Web Vitals**:
     - **LCP (Largest Contentful Paint)**: < 2.5s
     - **FID (First Input Delay)**: < 100ms
     - **CLS (Cumulative Layout Shift)**: < 0.1
   - **Use performance monitoring** (Web Vitals, Lighthouse CI) in CI/CD
   - **Target**: Achieve Lighthouse score > 90 for Performance

#### B. **Server Response Time**
   - **Optimize cold start times** (if using serverless)
   - **Implement connection pooling** for database connections:
     ```typescript
     mongoose.connect(uri, {
       maxPoolSize: 10,
       minPoolSize: 2,
       serverSelectionTimeoutMS: 5000,
     });
     ```
   - **Use CDN for static assets** with geo-distribution
   - **Implement server-side caching** (Redis) for frequently accessed data
   - **Optimize middleware chain** (remove unnecessary middleware)
   - **Use efficient serialization** (avoid JSON.stringify for large objects)
   - **Target**: Server response time < 200ms for p95

#### C. **Concurrent Request Handling**
   - **Implement request queueing** to prevent server overload
   - **Use connection limits** and timeouts appropriately
   - **Implement circuit breakers** for external service calls
   - **Use load balancing** for horizontal scaling
   - **Monitor and optimize memory usage** to prevent GC pauses
   - **Target**: Handle 10x current concurrent users without degradation

### 4. **Cost Optimization**

#### A. **Infrastructure Cost Optimization**
   - **Right-size server instances** based on actual usage metrics
   - **Implement auto-scaling** based on demand (scale down during off-peak)
   - **Use reserved instances** for predictable baseline load
   - **Use spot instances** for batch processing and non-critical workloads
   - **Optimize database instance size** based on query patterns
   - **Review and eliminate unused resources** (old instances, snapshots, volumes)
   - **Target**: Reduce infrastructure costs by 20-40%

#### B. **Database Cost Optimization**
   - **Archive old data** to cheaper storage tiers:
     ```typescript
     // Archive orders older than 1 year
     const oldOrders = await Order.find({
       createdAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
     });
     await archiveToS3(oldOrders);
     await Order.deleteMany({ _id: { $in: oldOrders.map(o => o._id) } });
     ```
   - **Implement data retention policies** (delete what's not needed)
   - **Use read replicas** for read-heavy workloads (cheaper than scaling primary)
   - **Optimize indexing** (indexes consume storage and write performance)
   - **Use compression** for text-heavy fields
   - **Target**: Reduce database costs by 15-30%

#### C. **API Call Cost Optimization**
   - **Batch API calls** to external services (e.g., courier APIs, payment gateways)
   - **Cache external API responses** aggressively
   - **Implement request deduplication** for identical calls
   - **Use webhooks** instead of polling when possible
   - **Negotiate better rates** with API providers based on volume
   - **Target**: Reduce third-party API costs by 30-50%

#### D. **CDN & Bandwidth Cost Optimization**
   - **Optimize asset sizes** (smaller files = less bandwidth)
   - **Implement aggressive caching** for static assets
   - **Use CDN for frequently accessed content** (offload from origin)
   - **Compress all text-based content** (HTML, CSS, JS, JSON)
   - **Implement lazy loading** to reduce unnecessary transfers
   - **Target**: Reduce bandwidth costs by 40-60%

#### E. **Development & Monitoring Cost Optimization**
   - **Optimize logging volume** (log smart, not everything):
     ```typescript
     // Sample logs in production (log 1 in 100 for high-volume endpoints)
     if (process.env.NODE_ENV === 'production' && Math.random() > 0.01) {
       return; // Skip logging
     }
     logger.info('Request processed', { orderId, duration });
     ```
   - **Use log retention policies** (delete old logs)
   - **Optimize monitoring metrics** (track what matters, not everything)
   - **Use sampling for APM** in production (100% trace = expensive)
   - **Target**: Reduce observability costs by 20-30%

### 5. **Performance Monitoring & Continuous Optimization**

#### A. **Establish Performance Baselines**
   - **Measure current performance metrics**:
     - Frontend: Page load time, bundle sizes, Core Web Vitals
     - Backend: API response times (p50, p95, p99), database query times
     - Infrastructure: CPU, memory, disk usage
   - **Set performance budgets**:
     - Max bundle size: < 200KB gzipped for initial load
     - Max API response time: < 300ms for p95
     - Max database query time: < 50ms for p95
   - **Document baseline metrics** for comparison

#### B. **Implement Performance Monitoring**
   - **Frontend monitoring**:
     ```typescript
     // Web Vitals tracking
     import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
     
     function sendToAnalytics(metric) {
       analytics.track('web_vital', {
         name: metric.name,
         value: metric.value,
         rating: metric.rating,
       });
     }
     
     getCLS(sendToAnalytics);
     getFID(sendToAnalytics);
     getFCP(sendToAnalytics);
     getLCP(sendToAnalytics);
     getTTFB(sendToAnalytics);
     ```
   - **Backend monitoring**:
     ```typescript
     // Request timing middleware
     app.use((req, res, next) => {
       const start = Date.now();
       res.on('finish', () => {
         const duration = Date.now() - start;
         metrics.histogram('api.response_time', duration, {
           method: req.method,
           path: req.route?.path,
           status: res.statusCode,
         });
       });
       next();
     });
     ```
   - **Database query monitoring**:
     ```typescript
     // Log slow queries
     mongoose.set('debug', (collectionName, method, query, doc, options) => {
       const start = Date.now();
       return function() {
         const duration = Date.now() - start;
         if (duration > 100) { // Log queries > 100ms
           logger.warn('Slow query detected', {
             collection: collectionName,
             method,
             duration,
             query: JSON.stringify(query),
           });
         }
       };
     });
     ```

#### C. **Set Up Performance Alerts**
   - **Alert on performance degradation**:
     - Page load time increases > 20%
     - API response time p95 > 500ms
     - Database query time p95 > 100ms
     - Error rate > 1%
   - **Set up automated Lighthouse CI** in deployment pipeline
   - **Monitor Core Web Vitals** in production with real user monitoring (RUM)

#### D. **Regular Performance Audits**
   - **Weekly**: Review performance dashboards for anomalies
   - **Monthly**: Run comprehensive Lighthouse audits on key pages
   - **Quarterly**: Full performance audit with optimization recommendations
   - **After major releases**: Benchmark and compare performance

### 6. **Performance Optimization Validation**

**Before considering optimization complete, verify:**

#### Frontend Performance Checklist:
   - [ ] Bundle size reduced and within budget (< 200KB initial)
   - [ ] Code splitting implemented for routes and heavy components
   - [ ] Images optimized (WebP, lazy loading, proper sizing)
   - [ ] Memoization implemented for expensive computations
   - [ ] Long lists virtualized
   - [ ] Search/filter inputs debounced
   - [ ] Lighthouse Performance score > 90
   - [ ] Core Web Vitals in "Good" range (LCP < 2.5s, FID < 100ms, CLS < 0.1)
   - [ ] No unnecessary re-renders (verified with React DevTools Profiler)
   - [ ] Aggressive caching with proper invalidation
   - [ ] Optimistic updates for mutations
   - [ ] Prefetching for likely next actions

#### Backend Performance Checklist:
   - [ ] All database queries have proper indexes
   - [ ] No N+1 queries exist
   - [ ] Using `.lean()` and `.select()` appropriately
   - [ ] Database-level pagination implemented
   - [ ] Slow queries identified and optimized (< 50ms p95)
   - [ ] Multi-layer caching implemented (memory, database, HTTP)
   - [ ] Response compression enabled (gzip/brotli)
   - [ ] Background jobs for heavy operations
   - [ ] API response time < 300ms p95
   - [ ] Response payload sizes optimized (minimal necessary data)
   - [ ] Connection pooling configured
   - [ ] Cache invalidation strategy implemented

#### Load & Speed Checklist:
   - [ ] Server response time < 200ms p95
   - [ ] Page load time < 3s on 3G
   - [ ] Time to Interactive < 5s
   - [ ] Skeleton loaders implemented for all async content
   - [ ] Critical rendering path optimized
   - [ ] CDN configured for static assets

#### Cost Optimization Checklist:
   - [ ] Server instances right-sized
   - [ ] Auto-scaling configured
   - [ ] Old data archived to cheaper storage
   - [ ] External API calls batched and cached
   - [ ] Logging volume optimized with sampling
   - [ ] Unused resources identified and removed
   - [ ] Database instance optimized for workload

#### Monitoring Checklist:
   - [ ] Performance baselines documented
   - [ ] Frontend monitoring (Web Vitals) implemented
   - [ ] Backend monitoring (response times, queries) implemented
   - [ ] Performance alerts configured
   - [ ] Lighthouse CI integrated in pipeline
   - [ ] Dashboard for real-time performance metrics

## Deliverable

Provide the fully refined page with:
- All functionality working correctly and completely
- **ZERO redundancy** - all existing UI components (Button, Card, Badge, Toast, Loader, Modal, Input, etc.) used properly
- **ALL hooks centralized** in `client/src/core/api/hooks` directory with no duplicate logic
- **Toast system used consistently** for all user notifications and feedback
- **Existing loader components used** for all loading states, no custom loaders
- **Full design system compliance** using global.css variables exclusively, zero hardcoded values
- **Architectural consistency** matching patterns from similar pages
- Excellent user experience with clear hierarchy, feedback, and guidance
- Clean, maintainable, well-structured code following existing conventions
- Comprehensive state management for loading, error, and success cases using existing components
- Proper error handling with Toast notifications
- Accessibility compliance
- **NO breaking changes** - all existing functionality preserved
- Brief summary of key changes and improvements made, specifically highlighting:
  - Which existing components were reused
  - Which custom code was replaced with existing solutions
  - Which hooks were centralized
  - How design system compliance was achieved

P.S. — **Backend alignment & “everything must already exist” checklist (very detailed, do not skip)**

1. **Single source of truth for API contracts**

   * Require a machine-readable OpenAPI/Swagger (or Postman collection) as the canonical contract. Every front-end hook, type, and mock must be generated from or validated against this contract.
   * If the backend exposes versioned routes, use the exact versioned base path (e.g., `/api/v1/...`) — do **not** hardcode alternate prefixes in the client.
   * Add one-line instruction: always sync the local `openapi.json` (or Postman collection) before starting work and commit any generated client code to the repo.

2. **Type-first integration**

   * All request/response shapes consumed by the page must use shared TypeScript interfaces generated from the backend contract (or from a maintained `shared-types` package). Example: `OrderResponse`, `ShipmentCreatePayload`, `UserProfileDTO`.
   * No `any` or ad-hoc types in page/component files. If a type is missing, add it to the generator or `shared-types` and regenerate—do not craft new types locally.
   * Date/time fields must use ISO-8601 strings in UTC on the wire and be converted to the user's timezone at the presentation layer. (App timezone: Asia/Kolkata only for display; wire uses UTC.)

3. **Centralized API client & hooks**

   * All network calls must use the centralized API client (`apiClient` / `httpService`) and existing error/transform middlewares (retries, auth token insertion, status code mapping).
   * All new data-fetching logic must be implemented as hooks in `client/src/core/api/hooks` and follow existing naming, signature, and return conventions (`useXQuery`/`useXMutation` patterns).
   * Hooks must accept minimal params (ids, filters, pagination) and return `{ data, isLoading, isError, error, refetch, mutate }` shaped like the other hooks in the directory.

4. **Payload & field naming fidelity**

   * Use the exact field names, casing, and nested structure the backend returns (e.g., `created_at` vs `createdAt`) — prefer the canonical casing used across the API. If the backend uses snake_case, convert to camelCase only in a centralized transformer; do not scatter transforms in components.
   * Keep API pagination semantics identical: if backend uses `page` + `pageSize`, use the same; if it returns `cursor`, implement cursor forwarding in hooks exactly as backend prescribes.

5. **Authentication, authorization & RBAC**

   * Use the existing auth context/session token flow for all requests (session token headers, refresh token handling).
   * Enforce permission checks based on backend-provided permission flags in the user profile (do not hardcode role logic). Render UI controls (buttons, actions) only when backend indicates capability.
   * For protected mutations, handle 401/403 with the centralized session handler (redirect to login or show Toast) — do not implement local redirects or custom auth popups.

6. **Errors, retries & idempotency**

   * Surface all backend error messages via the Toast system but translate them to user-friendly text where appropriate. Always include the backend `error.code` or `errorId` in logs.
   * For safe retriable operations, rely on the API client retry policy (exponential backoff). For create/mutate endpoints that require idempotency, ensure the client sends any required idempotency key header exactly as backend expects.
   * Map common error codes to UX actions (e.g., `VALIDATION_ERROR` → mark fields; `QUOTA_EXCEEDED` → Toast with upgrade hint).

7. **Mutations & cache invalidation**

   * After any mutation, invalidate or refetch the exact queries the backend expects to be stale (list endpoints, summary stats). Use the centralized cache invalidation utilities—do not call broad `refetchAll()` unless explicitly permitted.
   * For optimistic updates, follow the existing pattern: apply optimistic change only when backend guarantees eventual consistency; otherwise use post-success refetch.

8. **Contract tests & mocks**

   * Add/maintain contract tests: run the OpenAPI-based contract test (or `superface`/Pact-like tests) to ensure front-end expectations match backend responses.
   * Use the centralized mocking tool (MSW or the existing mock server) to mirror backend responses exactly as the contract defines. Mocks must live in `client/src/mocks` and be generated from the OpenAPI spec where possible.

9. **Response fields & presentation rules**

   * Normalize fields in one place (a DTO mapper) — E.g., the `ShipmentDTO` mapper converts `status_code` → `status` and resolves enumerations to the app's enums. UI components always consume normalized DTOs.
   * Do not perform business logic in presentation components (e.g., computing payable amounts, shipment states). Use a centralized service or helper that implements the same logic the backend uses.

10. **Performance & pagination**

    * Use backend-provided pagination and filtering endpoints; do not implement client-side slicing of full datasets.
    * For heavy-list pages, implement server-side filtering and limit fetch size to backend-supported batch sizes, and use skeleton loaders while paginating.
    * Respect any `X-Rate-Limit` headers — implement a centralized backoff handler in the API client.

11. **Validation parity**

    * Client-side validation must mirror backend validation rules (same required fields, same regex/length constraints). Pull validation rules from the backend where possible (e.g., JSON schema) and generate client validators or share a validation util.
    * Show field-level messages for validation errors returned by the backend using the existing Form/Input components.

12. **Observability & diagnostics**

    * All network failures, uncaught exceptions, and user action failures must emit structured telemetry (Sentry/Telemetry) with backend `errorId`, endpoint, payload summary, and user context.
    * Add a simple, one-line reproduction guide in the Toast/log for operations that fail with `500` so support can triage faster (include correlation id if provided by backend).

13. **Documentation & handoff**

    * Update the page’s README with:

      * API endpoints used (method + path + sample request + sample response)
      * Hook names and where to find types
      * Known edge-cases and server behaviors (e.g., eventual consistency windows)
      * Commands to regenerate types/mocks from OpenAPI
    * Add a short “backend contact” or ticket reference if any assumptions were needed.

14. **Testing & CI gating**

    * Add unit tests for hooks (mocking API client) and component tests for all critical interactions.
    * Add at least one E2E test (Cypress / Playwright) that exercises the happy path and one failure path (backend returns validation error).
    * Ensure PRs that touch API contracts or hooks run contract tests in CI before merge.

15. **Security & data handling**

    * Sanitize any user-generated input before sending to backend (central sanitizer), but do not duplicate server-side validation.
    * Never persist secrets or tokens to localStorage without following the app’s secure storage pattern.
    * Respect PII handling rules: mask or avoid logging sensitive fields (emails, phone numbers, full addresses) in client-side logs.

16. **Versioning & changelog discipline**

    * If the backend contract changes, bump the API client version and add a short migration note in the page README (fields removed/renamed, pagination changes).
    * Do not adapt the page speculatively to unmerged backend changes—only implement against released/stable contract versions unless the team agrees to a coordinated rollout.

17. **Rollback & graceful degradation**

    * For any new feature that depends on a backend flag/endpoint, implement feature-flag guards and graceful fallbacks if the endpoint is missing or returns `404`.
    * Ensure the page displays an informative empty/maintenance state when critical backend services are unavailable.

18. **Final acceptance checklist (must pass before merge)**

    * All API endpoints used are listed and match the OpenAPI spec.
    * All types generated from backend are used; no ad-hoc types remain.
    * All network calls go through `apiClient` and hooks in `client/src/core/api/hooks`.
    * Toast used for all global notifications; existing loaders used for all loads.
    * Contract tests and E2E tests pass in CI.
    * README updated with API usage and mock regeneration instructions.
    * Accessibility and performance smoke checks passed.

**Bottom line:** every piece of code you add must be traceable to an existing backend contract, use existing shared types/hooks/utilities, follow the established API client and UI component patterns, and be fully covered by contract and UI tests. If anything in the backend is ambiguous or missing, open a single backend ticket and reference it in the PR rather than making front-end assumptions.

Use existing centralized UI components instead of creating new reductnat, duplicate components and keep consistency in complete product's UI/UX design here...

@global.css