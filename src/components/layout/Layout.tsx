/* ==========================================================================
   MANILI — КАРКАС САЙТА
   ========================================================================== */

import { Suspense, useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { CartDrawer } from '@/components/shop/CartDrawer'
import { Spinner, ToastHost } from '@/components/ui'
import { Footer } from './Footer'
import { Header } from './Header'
import { GrainLayer } from './GrainLayer'
import { CookieConsent } from './CookieConsent'

export function Layout() {
  const location = useLocation()

  /** У админки собственная навигация: витринная шапка и подвал там мешают. */
  const isAdmin = location.pathname.startsWith('/admin')

  // Возвращаем фокус в начало страницы при переходе — иначе скринридер
  // остаётся на старом месте.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <>
      {!isAdmin && <GrainLayer />}
      <a href="#main" className="visually-hidden">
        Перейти к содержимому
      </a>
      {!isAdmin && <Header />}
      <main
        id="main"
        tabIndex={-1}
        style={{ flex: 1, outline: 'none' }}
        className="page-enter"
        key={location.pathname}
      >
        <Suspense fallback={<Spinner center />}>
          <Outlet />
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <CartDrawer />}
      <ToastHost />
      {!isAdmin && <CookieConsent />}
      <ScrollRestoration />
    </>
  )
}
