import { UserEntity } from '../../entities';

export interface IUserRepository {
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    findByPhone(phone: string): Promise<UserEntity | null>;
    create(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity>;
    update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null>;
    delete(id: string): Promise<boolean>;
    findAll(skip?: number, limit?: number): Promise<UserEntity[]>;
    count(): Promise<number>;
}
