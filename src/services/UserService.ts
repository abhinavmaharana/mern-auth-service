import { Repository } from 'typeorm';
import { User } from '../entity/User';
import { UserData } from '../types';

export class UserService {
    constructor(private userRepository: Repository<User>) {}
    async create({
        firstName,
        lastName,
        email,
        password,
    }: UserData): Promise<User> {
        // Create a new user instance
        const user = this.userRepository.create({
            firstName,
            lastName,
            email,
            password,
        });

        // Save the user to the database
        return await this.userRepository.save(user);
    }
}
