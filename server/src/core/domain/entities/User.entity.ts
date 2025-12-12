export interface IUserEntity {
    id: string;
    email: string;
    name: string;
    phone?: string;
    passwordHash: string;
    role: 'user' | 'admin';
    companyId?: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class UserEntity implements IUserEntity {
    constructor(
        public id: string,
        public email: string,
        public name: string,
        public passwordHash: string,
        public role: 'user' | 'admin' = 'user',
        public phone?: string,
        public companyId?: string,
        public isEmailVerified: boolean = false,
        public isPhoneVerified: boolean = false,
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date()
    ) { }

    // Domain methods
    verifyEmail(): void {
        this.isEmailVerified = true;
        this.updatedAt = new Date();
    }

    verifyPhone(): void {
        this.isPhoneVerified = true;
        this.updatedAt = new Date();
    }

    updateProfile(name: string, phone?: string): void {
        this.name = name;
        if (phone) this.phone = phone;
        this.updatedAt = new Date();
    }

    isAdmin(): boolean {
        return this.role === 'admin';
    }
}
