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

🏠 Dashboard
/seller (Main Dashboard)
📊 Analytics
/seller/analytics
/seller/analytics/comparison
/seller/analytics/cost (Note: conflicting costs directory also exists)
/seller/analytics/costs
/seller/analytics/courier-comparison
/seller/analytics/reports
/seller/analytics/sla
📦 Orders & Manifests
/seller/orders
/seller/orders/bulk
/seller/orders/create
/seller/manifests
/seller/manifests/create
/seller/manifests/[id]
/seller/label
🚚 Shipments & Tracking
/seller/shipments
/seller/tracking
/seller/ndr
/seller/ndr/analytics
/seller/ndr/[id]
/seller/returns
/seller/returns/[id]
💰 Finance (COD & Wallet)
/seller/cod
/seller/cod/settings
/seller/cod/remittance
/seller/cod/remittance/[id]
/seller/wallet
/seller/wallet/recharge
/seller/bank-accounts
🏭 Inventory & Rates
/seller/warehouses
/seller/warehouses/add
/seller/warehouses/[warehouseId]/inventory
/seller/rates
/seller/rates/b2b
/seller/weight
/seller/disputes/weight
/seller/disputes/weight/[id]
🔌 Integrations
/seller/integrations
/seller/integrations/amazon/setup
/seller/integrations/flipkart/setup
/seller/integrations/woocommerce/setup
/seller/integrations/shopify/setup
/seller/integrations/shopify/[storeId]
/seller/integrations/shopify/[storeId]/sync
/seller/integrations/shopify/[storeId]/settings
⚙️ Settings
/seller/settings
/seller/settings/account
/seller/settings/profile
/seller/settings/email
/seller/settings/security
/seller/settings/privacy
/seller/settings/team
/seller/settings/couriers
/seller/settings/pickup-addresses
/seller/settings/webhooks
/seller/settings/audit-logs
🛠️ Tools & Communication
/seller/tools/pincode-checker
/seller/tools/bulk-address-validation
/seller/communication/rules
/seller/communication/templates
🛡️ Other
/seller/kyc
/seller/support
/seller/security/fraud