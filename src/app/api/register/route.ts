import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 1. Input Validation
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    if (typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json({ message: 'Invalid email format.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    // Optional: Validate name if it's provided and has constraints
    if (name && typeof name !== 'string') {
        return NextResponse.json({ message: 'Invalid name format.' }, { status: 400 });
    }


    // 2. Check for Existing User
    // It's important to handle potential errors during database operations.
    let existingUser;
    try {
        existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }, // Store and check emails in lowercase for case-insensitivity
        });
    } catch (dbError) {
        console.error('Database error checking for existing user:', dbError);
        return NextResponse.json({ message: 'Error checking user existence.' }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 }); // 409 Conflict
    }

    // 3. Hash Password
    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 10); // Salt rounds: 10
    } catch (hashError) {
        console.error('Password hashing error:', hashError);
        return NextResponse.json({ message: 'Error processing password.' }, { status: 500 });
    }


    // 4. Create User
    let newUser;
    try {
        newUser = await prisma.user.create({
            data: {
              email: email.toLowerCase(), // Store email in lowercase
              hashedPassword: hashedPassword,
              name: name || null, // Handle optional name, ensuring it's null if empty/not provided
            },
        });
    } catch (dbError: any) {
        console.error('Database error creating user:', dbError);
        // Check for Prisma's unique constraint violation specifically on email
        if (dbError.code === 'P2002' && dbError.meta?.target?.includes('email')) {
             return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Error creating user.' }, { status: 500 });
    }


    // 5. Return Success Response (omitting hashedPassword)
    const { hashedPassword: _, ...userWithoutPassword } = newUser;
    return NextResponse.json({ user: userWithoutPassword, message: 'User created successfully.' }, { status: 201 });

  } catch (error: any) { // General error catch for issues like request.json() failing
    console.error('Registration endpoint error:', error);
    // Check if the error is due to invalid JSON in the request body
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'An unexpected error occurred on the server.' }, { status: 500 });
  }
}
