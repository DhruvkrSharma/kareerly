import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/auth/login', '/auth/callback', '/auth/update-password', '/api']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/api')) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isE2E =
    process.env.NODE_ENV !== 'production' &&
    request.cookies.has('e2e-bypass')

  if (!user && !isE2E && !PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && path.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  if (user && !isE2E && !PUBLIC_PATHS.some(p => path.startsWith(p))) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', user.id)
        .maybeSingle()

      const isCompleted = profile?.profile_completed === true

      if (!isCompleted && !path.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      if (isCompleted && path.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/feed', request.url))
      }
    } catch (e) {
      console.error('Middleware database check failed:', e)
      if (!path.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
