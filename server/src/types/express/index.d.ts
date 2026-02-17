import { IUser } from '../../infrastructure/database/mongoose/models/iam/users/user.model';

declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: string;
                role: 'super_admin' | 'admin' | 'seller' | 'staff';
                companyId?: string;
                isEmailVerified?: boolean;
                kycStatus?: {
                    isComplete: boolean;
                    state?: string;
                    lastUpdated?: Date;
                };
                teamRole?:
                    | 'owner'
                    | 'admin'
                    | 'manager'
                    | 'member'
                    | 'viewer'
                    | 'warehouse_manager'
                    | 'inventory_manager'
                    | 'picker'
                    | 'packer';
                teamStatus?: 'active' | 'invited' | 'suspended';
            };
        }
    }
}

export {};
