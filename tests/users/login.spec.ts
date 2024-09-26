import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { AppDataSource } from '../../src/config/data-source';
import app from '../../src/app';
import { isJwt } from '../utils';
import { User } from '../../src/entity/User';
import { Roles } from '../../src/constants';

describe('POST /auth/login', () => {
    let connection: DataSource;

    beforeAll(async () => {
        connection = await AppDataSource.initialize();
    });

    beforeEach(async () => {
        await connection.dropDatabase();
        await connection.synchronize();
    });

    afterAll(async () => {
        await connection.destroy();
    });

    describe('Given all fields', () => {
        it('should return the access token and refresh token inside a cookie', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };

            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const userRepository = connection.getRepository(User);
            await userRepository.save({
                ...userData,
                password: hashedPassword,
                role: Roles.CUSTOMER,
            });

            // Act
            const response = await request(app)
                .post('/auth/login')
                .send({ email: userData.email, password: userData.password });

            // Assert
            let accessToken: string | null = null;
            let refreshToken: string | null = null;

            const cookies = response.headers['set-cookie'] || [];

            if (Array.isArray(cookies)) {
                cookies.forEach((cookie: string) => {
                    if (cookie.startsWith('accessToken=')) {
                        accessToken = cookie.split(';')[0].split('=')[1];
                    }

                    if (cookie.startsWith('refreshToken=')) {
                        refreshToken = cookie.split(';')[0].split('=')[1];
                    }
                });
            } else if (typeof cookies === 'string') {
                // If cookies is a string, handle it accordingly
                if (cookies.startsWith('accessToken=')) {
                    accessToken = cookies.split(';')[0].split('=')[1];
                }

                if (cookies.startsWith('refreshToken=')) {
                    refreshToken = cookies.split(';')[0].split('=')[1];
                }
            }

            expect(accessToken).not.toBeNull();
            expect(refreshToken).not.toBeNull();

            expect(isJwt(accessToken)).toBeTruthy();
            expect(isJwt(refreshToken)).toBeTruthy();
        });
        it('should return the 400 if email or password is wrong', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };

            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const userRepository = connection.getRepository(User);
            await userRepository.save({
                ...userData,
                password: hashedPassword,
                role: Roles.CUSTOMER,
            });

            // Act
            const response = await request(app)
                .post('/auth/login')
                .send({ email: userData.email, password: 'wrongPassword' });

            // Assert

            expect(response.statusCode).toBe(400);
        });
    });
});
