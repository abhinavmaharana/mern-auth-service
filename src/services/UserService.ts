import { Repository } from 'typeorm';
import { User } from '../entity/User';
import { UserData } from '../types';
import createHttpError from 'http-errors';
import logger from '../config/logger';

export class UserService {
    constructor(private userRepository: Repository<User>) {}
    async create({
        firstName,
        lastName,
        email,
        password,
    }: UserData): Promise<User> {
        try {
            // Create a new user instance
            const user = this.userRepository.create({
                firstName,
                lastName,
                email,
                password,
            });

            // Save the user to the database
            return await this.userRepository.save(user);
        } catch (err) {
            logger.error(err);
            const error = createHttpError(
                500,
                'Failed to store the data in the database',
            );
            throw error;
        }
    }
}
