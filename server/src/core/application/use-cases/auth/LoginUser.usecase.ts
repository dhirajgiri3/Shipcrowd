import { IUserRepository } from '../../../domain/interfaces/repositories';
import { UnauthorizedError, ValidationError } from '../../../shared/errors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface LoginUseCaseInput {
    email: string;
    password: string;
}

export interface LoginUseCaseOutput {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    token: string;
}

export class LoginUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly jwtSecret: string
    ) { }

    async execute(input: LoginUseCaseInput): Promise<LoginUseCaseOutput> {
        // Validate input
        if (!input.email || !input.password) {
            throw new ValidationError('Email and password are required');
        }

        // Find user by email
        const user = await this.userRepository.findByEmail(input.email);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
            },
            this.jwtSecret,
            { expiresIn: '7d' }
        );

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
        };
    }
}
