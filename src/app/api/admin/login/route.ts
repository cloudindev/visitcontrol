/**
 * @file route.ts
 * @description Route Handler para el inicio de sesión del administrador.
 *
 * POST /api/admin/login
 * Body: { username, password }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_USERNAME, ADMIN_PASSWORD, generarTokenSesion } from '@/lib/admin-auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'El usuario y la contraseña son obligatorios' },
        { status: 400 }
      );
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generar token de sesión firmado
    const token = generarTokenSesion();

    // Establecer la cookie HttpOnly segura
    const cookieStore = await cookies();
    cookieStore.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 día
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[POST /api/admin/login] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
