---
name: Shipcrowd-wizard-implementation
description: Implements multi-step wizard flows for Shipcrowd (E-Commerce integrations, Bulk operations, Onboarding, etc.). Use when building step-by-step guided experiences with form validation, progress tracking, and state management across steps.
---

# Shipcrowd Wizard Implementation Skill

This skill guides implementation of multi-step wizard flows (E-Commerce integration setup, Bulk operation wizards, Onboarding flows, etc.) following established patterns in the Shipcrowd codebase.

## When to Use This Skill

Use this skill when implementing:
- E-Commerce integration wizards (Shopify, WooCommerce, Amazon, Flipkart)
- Bulk operation wizards (Bulk create shipments, Bulk upload)
- Multi-step forms (KYC verification, Company setup)
- Guided setup flows (Courier integration, Rate configuration)

**DO NOT use this skill for:**
- Simple single-step forms (use Shipcrowd-feature-implementation skill)
- Basic modals without steps

## Architecture Pattern

### Wizard State Management

```typescript
interface WizardState {
  currentStep: number;
  totalSteps: number;
  data: Record<string, any>;
  errors: Record<string, any>;
  canProgress: boolean;
}
```

### Directory Structure

```
src/features/integrations/
├── components/
│   ├── ShopifyIntegrationWizard.tsx       # Main wizard container
│   ├── steps/
│   │   ├── Step1Authentication.tsx        # Individual step components
│   │   ├── Step2StoreSelection.tsx
│   │   ├── Step3Mapping.tsx
│   │   ├── Step4Confirmation.tsx
│   │   └── Step5Success.tsx
│   └── WizardLayout.tsx                   # Reusable wizard shell
```

## Implementation Guide

### Phase 1: Wizard Container Component

**Pattern** (`/src/features/[domain]/components/[Feature]Wizard.tsx`):

```typescript
'use client';

import React, { useState } from 'react';
import { WizardLayout } from '@/src/features/shared/components/WizardLayout';
import { Step1Authentication } from './steps/Step1Authentication';
import { Step2StoreSelection } from './steps/Step2StoreSelection';
import { Step3Mapping } from './steps/Step3Mapping';
import { Step4Confirmation } from './steps/Step4Confirmation';
import { Step5Success } from './steps/Step5Success';
import { toast } from 'sonner';

interface WizardData {
  // Step 1 data
  apiKey?: string;
  apiSecret?: string;
  storeDomain?: string;

  // Step 2 data
  selectedStore?: string;

  // Step 3 data
  fieldMappings?: Record<string, string>;

  // Step 4 data
  confirmSync?: boolean;
}

interface ShopifyIntegrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShopifyIntegrationWizard({ isOpen, onClose }: ShopifyIntegrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [stepErrors, setStepErrors] = useState<Record<number, Record<string, string>>>({});

  const totalSteps = 5;

  const steps = [
    { id: 1, title: 'Authentication', description: 'Connect your Shopify store' },
    { id: 2, title: 'Store Selection', description: 'Choose stores to sync' },
    { id: 3, title: 'Field Mapping', description: 'Map order fields' },
    { id: 4, title: 'Confirmation', description: 'Review and confirm' },
    { id: 5, title: 'Complete', description: 'Integration ready' },
  ];

  const updateStepData = (stepData: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!wizardData.apiKey?.trim()) {
        errors.apiKey = 'API Key is required';
      }
      if (!wizardData.apiSecret?.trim()) {
        errors.apiSecret = 'API Secret is required';
      }
      if (!wizardData.storeDomain?.trim()) {
        errors.storeDomain = 'Store domain is required';
      }
    }

    if (step === 2) {
      if (!wizardData.selectedStore) {
        errors.selectedStore = 'Please select at least one store';
      }
    }

    if (step === 3) {
      if (!wizardData.fieldMappings || Object.keys(wizardData.fieldMappings).length === 0) {
        errors.fieldMappings = 'Please map required fields';
      }
    }

    if (step === 4) {
      if (!wizardData.confirmSync) {
        errors.confirmSync = 'Please confirm to proceed';
      }
    }

    setStepErrors(prev => ({ ...prev, [step]: errors }));
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fix errors before proceeding');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    try {
      // Final API call to save integration
      // await createIntegration(wizardData);

      toast.success('Integration setup complete!');
      onClose();
    } catch (error) {
      toast.error('Failed to complete integration');
    }
  };

  const renderStep = () => {
    const stepProps = {
      data: wizardData,
      errors: stepErrors[currentStep] || {},
      onUpdate: updateStepData,
    };

    switch (currentStep) {
      case 1:
        return <Step1Authentication {...stepProps} />;
      case 2:
        return <Step2StoreSelection {...stepProps} />;
      case 3:
        return <Step3Mapping {...stepProps} />;
      case 4:
        return <Step4Confirmation {...stepProps} />;
      case 5:
        return <Step5Success {...stepProps} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <WizardLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Shopify Integration Setup"
      currentStep={currentStep}
      totalSteps={totalSteps}
      steps={steps}
      onNext={handleNext}
      onBack={handleBack}
      onFinish={handleFinish}
      canGoBack={currentStep > 1}
      canGoNext={currentStep < totalSteps}
      isLastStep={currentStep === totalSteps}
    >
      {renderStep()}
    </WizardLayout>
  );
}
```

**Wizard Container Rules:**
- ✅ **ALWAYS** validate current step before allowing progression
- ✅ **ALWAYS** store step data in centralized state
- ✅ **ALWAYS** track errors per step (not globally)
- ✅ **ALWAYS** provide step titles and descriptions
- ✅ **ALWAYS** disable "Next" when validation fails
- ✅ **ALWAYS** allow going back to previous steps
- ❌ **NEVER** allow skipping required steps
- ❌ **NEVER** lose data when going back

### Phase 2: Reusable Wizard Layout

**Pattern** (`/src/features/shared/components/WizardLayout.tsx`):

```typescript
'use client';

import React from 'react';
import { Button } from '@/src/components/ui/button';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface WizardLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentStep: number;
  totalSteps: number;
  steps: Step[];
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  children: React.ReactNode;
}

export function WizardLayout({
  isOpen,
  onClose,
  title,
  currentStep,
  totalSteps,
  steps,
  onNext,
  onBack,
  onFinish,
  canGoBack,
  canGoNext,
  isLastStep,
  children,
}: WizardLayoutProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition-colors ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t">
          <div>
            {canGoBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>

            {!isLastStep ? (
              <Button onClick={onNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={onFinish} className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-2" />
                Complete Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Wizard Layout Rules:**
- ✅ **ALWAYS** show visual progress (step circles + connector lines)
- ✅ **ALWAYS** highlight current step
- ✅ **ALWAYS** show completed steps (green checkmark)
- ✅ **ALWAYS** provide Back/Next/Finish buttons
- ✅ **ALWAYS** disable buttons based on state
- ✅ **ALWAYS** make content area scrollable
- ✅ **ALWAYS** show step titles and descriptions

### Phase 3: Individual Step Components

**Pattern** (`/src/features/[domain]/components/steps/Step1Authentication.tsx`):

```typescript
'use client';

import React from 'react';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { ExternalLink, HelpCircle } from 'lucide-react';

interface Step1AuthenticationProps {
  data: {
    apiKey?: string;
    apiSecret?: string;
    storeDomain?: string;
  };
  errors: Record<string, string>;
  onUpdate: (data: any) => void;
}

export function Step1Authentication({ data, errors, onUpdate }: Step1AuthenticationProps) {
  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              How to get your Shopify API credentials
            </h3>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Go to your Shopify Admin panel</li>
              <li>Navigate to Apps → Develop apps → Create an app</li>
              <li>Click "Configure Admin API scopes"</li>
              <li>Select required permissions: read_orders, write_orders, read_products</li>
              <li>Click "Install app" to generate API credentials</li>
            </ol>
            <Button
              variant="link"
              className="px-0 mt-2 text-blue-600 dark:text-blue-400"
              onClick={() => window.open('https://shopify.dev/docs/apps/auth', '_blank')}
            >
              View detailed guide
              <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* API Key Field */}
      <div>
        <label className="block text-sm font-medium mb-2">
          API Key <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          value={data.apiKey || ''}
          onChange={(e) => onUpdate({ apiKey: e.target.value })}
          placeholder="Enter your Shopify API Key"
          className={errors.apiKey ? 'border-red-500' : ''}
        />
        {errors.apiKey && (
          <p className="text-red-500 text-sm mt-1">{errors.apiKey}</p>
        )}
      </div>

      {/* API Secret Field */}
      <div>
        <label className="block text-sm font-medium mb-2">
          API Secret <span className="text-red-500">*</span>
        </label>
        <Input
          type="password"
          value={data.apiSecret || ''}
          onChange={(e) => onUpdate({ apiSecret: e.target.value })}
          placeholder="Enter your Shopify API Secret"
          className={errors.apiSecret ? 'border-red-500' : ''}
        />
        {errors.apiSecret && (
          <p className="text-red-500 text-sm mt-1">{errors.apiSecret}</p>
        )}
      </div>

      {/* Store Domain Field */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Store Domain <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={data.storeDomain || ''}
            onChange={(e) => onUpdate({ storeDomain: e.target.value })}
            placeholder="your-store"
            className={errors.storeDomain ? 'border-red-500' : ''}
          />
          <span className="text-muted-foreground">.myshopify.com</span>
        </div>
        {errors.storeDomain && (
          <p className="text-red-500 text-sm mt-1">{errors.storeDomain}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Example: If your store is "mystore.myshopify.com", enter "mystore"
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Security Notice:</strong> Your API credentials are encrypted and stored securely.
          We never share your credentials with third parties.
        </p>
      </div>
    </div>
  );
}
```

**Step Component Rules:**
- ✅ **ALWAYS** provide inline help/instructions
- ✅ **ALWAYS** link to external documentation when needed
- ✅ **ALWAYS** show field-level validation errors
- ✅ **ALWAYS** use proper input types (text, password, email, etc.)
- ✅ **ALWAYS** provide placeholder examples
- ✅ **ALWAYS** show security/privacy notices where relevant
- ✅ **ALWAYS** use helper text for complex fields
- ❌ **NEVER** validate in step components (validate in container)

### Phase 4: Confirmation Step Pattern

**Pattern** (`/src/features/[domain]/components/steps/Step4Confirmation.tsx`):

```typescript
'use client';

import React from 'react';
import { Button } from '@/src/components/ui/button';
import { Check, AlertCircle } from 'lucide-react';

interface Step4ConfirmationProps {
  data: {
    apiKey?: string;
    storeDomain?: string;
    selectedStore?: string;
    fieldMappings?: Record<string, string>;
  };
  errors: Record<string, string>;
  onUpdate: (data: any) => void;
}

export function Step4Confirmation({ data, errors, onUpdate }: Step4ConfirmationProps) {
  const [confirmed, setConfirmed] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Review Your Configuration</h3>
        <p className="text-muted-foreground">
          Please review the details below before completing the integration
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-4">
        {/* Store Details */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Store Details</h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Store Domain:</dt>
              <dd className="font-medium">{data.storeDomain}.myshopify.com</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">API Key:</dt>
              <dd className="font-mono text-sm">{data.apiKey?.slice(0, 10)}***</dd>
            </div>
          </dl>
        </div>

        {/* Selected Store */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Selected Store</h4>
          <p className="text-sm">{data.selectedStore}</p>
        </div>

        {/* Field Mappings */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Field Mappings</h4>
          <dl className="space-y-2 text-sm">
            {Object.entries(data.fieldMappings || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <dt className="text-muted-foreground">{key}:</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Sync Information */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              What happens next?
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>We'll establish a secure connection to your Shopify store</li>
              <li>Initial sync will import orders from the last 30 days</li>
              <li>New orders will automatically sync every 15 minutes</li>
              <li>You'll receive a notification once the sync is complete</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Checkbox */}
      <div className="border rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
              onUpdate({ confirmSync: e.target.checked });
            }}
            className="mt-1"
          />
          <div>
            <p className="font-medium">I confirm that the above details are correct</p>
            <p className="text-sm text-muted-foreground mt-1">
              By confirming, you authorize Shipcrowd to access your Shopify store data
              according to the permissions specified above.
            </p>
          </div>
        </label>
        {errors.confirmSync && (
          <p className="text-red-500 text-sm mt-2">{errors.confirmSync}</p>
        )}
      </div>
    </div>
  );
}
```

**Confirmation Step Rules:**
- ✅ **ALWAYS** show complete summary of all collected data
- ✅ **ALWAYS** mask sensitive information (API keys, passwords)
- ✅ **ALWAYS** explain what will happen next
- ✅ **ALWAYS** require explicit confirmation
- ✅ **ALWAYS** allow going back to edit
- ✅ **ALWAYS** show security/privacy information

### Phase 5: Success Step Pattern

**Pattern** (`/src/features/[domain]/components/steps/Step5Success.tsx`):

```typescript
'use client';

import React from 'react';
import { Button } from '@/src/components/ui/button';
import { CheckCircle2, ArrowRight, Download } from 'lucide-react';
import confetti from 'canvas-confetti';

export function Step5Success() {
  React.useEffect(() => {
    // Celebrate with confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div className="text-center space-y-6 py-12">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
      </div>

      {/* Success Message */}
      <div>
        <h3 className="text-3xl font-bold mb-2">Integration Complete!</h3>
        <p className="text-muted-foreground text-lg">
          Your Shopify store has been successfully connected
        </p>
      </div>

      {/* Status Updates */}
      <div className="bg-muted/50 rounded-lg p-6 text-left max-w-md mx-auto">
        <h4 className="font-semibold mb-4">What's happening now:</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Connection Established</p>
              <p className="text-sm text-muted-foreground">Secure link to your store created</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mt-0.5" />
            <div>
              <p className="font-medium">Initial Sync in Progress</p>
              <p className="text-sm text-muted-foreground">Importing orders from last 30 days</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-muted rounded-full mt-0.5" />
            <div>
              <p className="font-medium text-muted-foreground">Webhook Setup Pending</p>
              <p className="text-sm text-muted-foreground">Will notify for new orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="border rounded-lg p-6 text-left max-w-md mx-auto">
        <h4 className="font-semibold mb-3">Next Steps:</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>You'll receive an email when the initial sync completes (5-15 minutes)</li>
          <li>New orders will automatically appear in your dashboard</li>
          <li>Configure shipping rules to automate order processing</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3 pt-4">
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download Setup Guide
        </Button>
        <Button>
          Go to Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
```

**Success Step Rules:**
- ✅ **ALWAYS** celebrate success (confetti, animations)
- ✅ **ALWAYS** clearly state what was accomplished
- ✅ **ALWAYS** show current status (in-progress tasks)
- ✅ **ALWAYS** provide next steps guidance
- ✅ **ALWAYS** offer CTA buttons (Dashboard, Download, etc.)
- ✅ **ALWAYS** set user expectations (timing, notifications)

## Advanced Wizard Patterns

### Async Step Validation

For steps that require API calls (e.g., verifying API credentials):

```typescript
const [isValidating, setIsValidating] = useState(false);

const validateStepAsync = async (step: number): Promise<boolean> => {
  if (step === 1) {
    setIsValidating(true);
    try {
      // Verify API credentials with backend
      const response = await axios.post('/api/integrations/shopify/verify', {
        apiKey: wizardData.apiKey,
        apiSecret: wizardData.apiSecret,
        storeDomain: wizardData.storeDomain,
      });

      if (!response.data.success) {
        setStepErrors(prev => ({
          ...prev,
          [step]: { api: 'Invalid API credentials' },
        }));
        return false;
      }

      return true;
    } catch (error) {
      setStepErrors(prev => ({
        ...prev,
        [step]: { api: 'Failed to verify credentials' },
      }));
      return false;
    } finally {
      setIsValidating(false);
    }
  }

  return true;
};

const handleNext = async () => {
  // Run sync validation first
  if (!validateStep(currentStep)) {
    toast.error('Please fix errors before proceeding');
    return;
  }

  // Then run async validation if needed
  const isValid = await validateStepAsync(currentStep);
  if (!isValid) {
    return;
  }

  setCurrentStep(prev => prev + 1);
};
```

### Wizard with Auto-Save

For long wizards, auto-save progress to prevent data loss:

```typescript
const [draftId, setDraftId] = useState<string | null>(null);

// Auto-save wizard data every 30 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    if (Object.keys(wizardData).length > 0) {
      try {
        const response = await axios.post('/api/wizard/drafts/save', {
          draftId,
          data: wizardData,
          step: currentStep,
        });

        if (!draftId) {
          setDraftId(response.data.draftId);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [wizardData, currentStep, draftId]);

// Load draft on mount
useEffect(() => {
  const loadDraft = async () => {
    const params = new URLSearchParams(window.location.search);
    const draftId = params.get('draft');

    if (draftId) {
      try {
        const response = await axios.get(`/api/wizard/drafts/${draftId}`);
        setWizardData(response.data.data);
        setCurrentStep(response.data.step);
        setDraftId(draftId);
        toast.success('Draft loaded');
      } catch (error) {
        toast.error('Failed to load draft');
      }
    }
  };

  loadDraft();
}, []);
```

## Quality Checklist

Before marking a wizard as complete:

- [ ] **Navigation**: Back/Next buttons work correctly
- [ ] **Validation**: Each step validates before allowing progression
- [ ] **Errors**: Inline validation errors show for each field
- [ ] **Progress**: Visual progress indicator accurate
- [ ] **State**: Data persists when navigating back/forth
- [ ] **Help**: Instructions/help text provided for complex steps
- [ ] **Security**: Sensitive data masked in confirmation step
- [ ] **Success**: Success step celebrates and guides next actions
- [ ] **Mobile**: Responsive design on mobile devices
- [ ] **Dark Mode**: All steps support dark mode
- [ ] **Accessibility**: Keyboard navigation works
- [ ] **Error Recovery**: Failed API calls handled gracefully

## Common Use Cases

### E-Commerce Integration Wizards
- Step 1: Authentication (API credentials)
- Step 2: Store/Account selection
- Step 3: Field mapping (order fields to shipment fields)
- Step 4: Sync preferences (frequency, filters)
- Step 5: Confirmation & Review
- Step 6: Success with next steps

### Bulk Operations Wizard
- Step 1: Upload file (CSV/Excel)
- Step 2: Column mapping
- Step 3: Validation & Preview
- Step 4: Confirmation
- Step 5: Processing status

### KYC/Onboarding Wizard
- Step 1: Business details
- Step 2: Document upload (GST, PAN, etc.)
- Step 3: Bank account verification
- Step 4: Review & Submit
- Step 5: Approval pending status

## Anti-Patterns to Avoid

❌ **DO NOT:**
- Allow skipping required steps
- Lose data when going back
- Validate only on final submission
- Use generic error messages
- Skip loading states during async operations
- Forget to show progress indicator
- Make steps too long (split if >10 fields)
- Auto-progress without user action

## Getting Help

Reference existing wizards:
- `/app/onboarding/page.tsx` - Onboarding wizard example
- Study the step-by-step flow
- Check validation patterns
- Review error handling

## Success Criteria

A wizard is "done" when:
- ✅ All steps navigate correctly (back/next)
- ✅ Validation prevents invalid progression
- ✅ Data persists across step navigation
- ✅ Help text provided for complex fields
- ✅ Confirmation step summarizes all data
- ✅ Success step celebrates and guides next actions
- ✅ Mobile responsive design
- ✅ Dark mode supported
- ✅ Loading states during async operations
- ✅ Error states handled gracefully
