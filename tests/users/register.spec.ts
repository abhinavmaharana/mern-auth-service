import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/entity/User';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/config/data-source';
import { Roles } from '../../src/constants';

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
            expect(users[0].password).toBe(userData.password);
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
    });
    describe('Fields are missing', () => {});
});
