export interface UserProfile {
    id: string;
    name: string;
    email: string;
    profile?: {
        phone?: string;
        avatar?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
        dateOfBirth?: string;
        gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
        bio?: string;
        website?: string;
        socialLinks?: {
            facebook?: string;
            twitter?: string;
            linkedin?: string;
            instagram?: string;
        };
        preferredLanguage?: string;
        preferredCurrency?: string;
        timezone?: string;
    };
    role: string;
    companyId?: string;
    company?: {
        id: string;
        name: string;
    };
}

export interface ProfileUpdatePayload {
    name?: string;
    phone?: string;
    avatar?: string;
}

export interface AddressUpdatePayload {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
}

export interface PersonalUpdatePayload {
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    bio?: string;
    website?: string;
}

export interface SocialUpdatePayload {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
}

export interface PreferencesUpdatePayload {
    preferredLanguage?: string;
    preferredCurrency?: string;
    timezone?: string;
}
