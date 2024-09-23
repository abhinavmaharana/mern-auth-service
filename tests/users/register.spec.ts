import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/entity/User';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/config/data-source';
import { Roles } from '../../src/constants';
import { isJwt } from '../utils';
import { RefreshToken } from '../../src/entity/RefreshToken';

// Define the type for the response body
interface RegisterResponse {
    id: number;
}

describe('POST /auth/register', () => {
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
        it('should return the 201 status code', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);
            // Assert
            expect(response.statusCode).toBe(201);
        });

        it('should return valid json response', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);
            // Assert
            expect(
                (response.headers as Record<string, string>)['content-type'],
            ).toEqual(expect.stringContaining('json'));
        });

        it('should persist the user in the database', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            // Act
            await request(app).post('/auth/register').send(userData);
            // Assert
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(1);
            expect(users[0].firstName).toBe(userData.firstName);
            expect(users[0].lastName).toBe(userData.lastName);
            expect(users[0].email).toBe(userData.email);
            // expect(users[0].password).toBe(userData.password);
        });

        it('should return an id of the created user', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Ensure response body is typed correctly
            const responseBody = response.body as RegisterResponse;

            // Assert
            expect(response.statusCode).toBe(201);
            expect(responseBody).toHaveProperty('id'); // Check if 'id' is present in the response

            const userRepository = connection.getRepository(User);
            const createdUser = await userRepository.findOneBy({
                email: userData.email,
            });
            expect(createdUser).not.toBeNull();
            expect(responseBody.id).toBe(createdUser?.id); // Verify that the id in the response matches the id in the database
        });
        it('should assign a customer role', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            // Act
            await request(app).post('/auth/register').send(userData);
            // Assert
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users[0]).toHaveProperty('role');
            expect(users[0].role).toBe(Roles.CUSTOMER);
        });
        it('should store the hashed password in the database', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            // Act
            await request(app).post('/auth/register').send(userData);
            // Assert
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users[0].password).not.toBe(userData.password);
            expect(users[0].password).toHaveLength(60);
            expect(users[0].password).toMatch(/^\$2b\$\d+\$/);
        });
        it('should return 400 status code if the email is already exists', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            const userRepository = connection.getRepository(User);
            await userRepository.save({ ...userData, role: Roles.CUSTOMER });
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);
            const users = await userRepository.find();
            // Assert
            expect(response.statusCode).toBe(400);
            expect(users).toHaveLength(1);
        });
        it('should return the access token and refresh token inside a cookie', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };

            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // interface Headers {
            //     ["set-cookie"]: string[];
            // }

            // Assert
            let accessToken: string | null = null;
            let refreshToken: string | null = null;

            // Safely access the "set-cookie" header
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
        it('should store the refresh token in the database', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };

            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            const refreshTokenRepo = connection.getRepository(RefreshToken);
            const tokens = await refreshTokenRepo
                .createQueryBuilder('refreshToken')
                .where('refreshToken.userId = :userId', {
                    userId: (response.body as Record<string, string>).id,
                })
                .getMany();

            expect(tokens).toHaveLength(1);
        });
    });
    describe('Fields are missing', () => {
        it('should return 400 status code if email field is missing', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: '',
                password: 'secret',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            // Assert
            expect(response.statusCode).toBe(400);
            expect(users).toHaveLength(0);
        });
        it('should return 400 status code if firstName is missing', async () => {
            // Arrange
            const userData = {
                firstName: '',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
        it('should return 400 status code if lastName is missing', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: '',
                email: 'abhinavmaharana800@gmail.com',
                password: 'secret',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });

        it('should return 400 status code if password is missing', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'abhinavmaharana800@gmail.com',
                password: '',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
    });
    describe('Fields are not in proper format', () => {
        it('should trim the email field', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: ' abhinavmaharana800@gmail.com ',
                password: 'secret',
            };
            // Act
            await request(app).post('/auth/register').send(userData);
            // Assert
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            const user = users[0];
            expect(user.email).toBe('abhinavmaharana800@gmail.com');
        });
        it('should return 400 status code if email is not a valid email', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: 'invalid-email', // Invalid email
                password: 'secret',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
        it('should return 400 status code if password length is less than 6 chars', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: ' abhinavmaharana800@gmail.com ',
                password: 'pass', // less than 8 chars
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.statusCode).toBe(400);
            const userRepository = connection.getRepository(User);
            const users = await userRepository.find();
            expect(users).toHaveLength(0);
        });
        it('shoud return an array of error messages if email is missing', async () => {
            // Arrange
            const userData = {
                firstName: 'Abhinav',
                lastName: 'Maharana',
                email: '',
                password: 'secret',
            };
            // Act
            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            // Assert
            expect(response.body).toHaveProperty('errors');
            expect(
                (response.body as Record<string, string>).errors.length,
            ).toBeGreaterThan(0);
        });
    });
});
