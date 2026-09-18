/* ==========================================================================
   MANILI — ШАПКА САЙТА
   ========================================================================== */

import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import {
  Drawer,
  IconBag,
  IconButton,
  IconHeart,
  IconMenu,
  IconPackage,
  IconSearch,
  IconUser,
} from '@/components/ui'
import { useCart } from '@/store/cart'
import { useFavorites } from '@/store/favorites'
import { useAuth } from '@/store/auth'
import { SearchOverlay } from './SearchOverlay'
import './header.css'

const NAV_LINKS = [
  { to: '/shop', label: 'Магазин' },
  { to: '/collections', label: 'Коллекции' },
  { to: '/about', label: 'О нас' },
  { to: '/contacts', label: 'Контакты' },
]

const MOBILE_SUB_LINKS = [
  { to: '/shop/hoodies', label: 'Худи' },
  { to: '/shop/tshirts', label: 'Футболки' },
  { to: '/shop/caps', label: 'Кепки' },
  { to: '/shop/bags', label: 'Сумки' },
  { to: '/shop?new=1', label: 'Новинки' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const cartCount = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0))
  const openCart = useCart((state) => state.open)
  const favoritesCount = useFavorites((state) => state.ids.length)
  const user = useAuth((state) => state.user)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Закрываем меню при переходе — иначе оно «залипает» после навигации.
  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  // На внутренних страницах шапка сразу плотная: под ней контент, а не hero.
  const isHome = location.pathname === '/'

  return (
    <>
      <header className="header" data-scrolled={scrolled ? 'true' : 'false'} data-solid={!isHome ? 'true' : 'false'}>
        <div className="header__bar">
          <Link to="/" className="header__logo" aria-label="MANILI — на главную">
            <Logo size={26} />
          </Link>

          <nav className="header__nav" aria-label="Основная навигация">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className="header__link">
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="header__actions">
            <IconButton label="Поиск" onClick={() => setSearchOpen(true)}>
              <IconSearch size={19} />
            </IconButton>

            <span className="header__action-wrap">
              <IconButton label="Избранное" onClick={() => navigate('/favorites')}>
                <IconHeart size={19} />
              </IconButton>
              {favoritesCount > 0 && <span className="header__count">{favoritesCount}</span>}
            </span>

            <IconButton
              label={user ? 'Личный кабинет' : 'Войти'}
              onClick={() => navigate(user ? '/account' : '/login')}
            >
              <IconUser size={19} />
            </IconButton>

            <span className="header__action-wrap">
              <IconButton label="Корзина" onClick={openCart}>
                <IconBag size={19} />
              </IconButton>
              {cartCount > 0 && <span className="header__count">{cartCount}</span>}
            </span>

            <IconButton label="Меню" className="header__burger" onClick={() => setMenuOpen(true)}>
              <IconMenu size={21} />
            </IconButton>
          </div>
        </div>
      </header>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Меню" side="left">
        <nav className="mobile-menu__nav" aria-label="Мобильная навигация">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className="mobile-menu__link">
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="mobile-menu__section">
          <p className="eyebrow" style={{ paddingInline: 20, marginBottom: 12 }}>
            Категории
          </p>
          {MOBILE_SUB_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="mobile-menu__sub">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mobile-menu__section">
          <Link to={user ? '/account' : '/login'} className="mobile-menu__sub">
            <IconUser size={18} />
            {user ? `${user.firstName || 'Личный кабинет'}` : 'Войти или зарегистрироваться'}
          </Link>
          <Link to="/favorites" className="mobile-menu__sub">
            <IconHeart size={18} />
            Избранное{favoritesCount > 0 ? ` (${favoritesCount})` : ''}
          </Link>
          <Link to="/order-lookup" className="mobile-menu__sub">
            <IconPackage size={18} />
            Отследить заказ
          </Link>
        </div>
      </Drawer>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
