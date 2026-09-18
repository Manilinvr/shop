/* ==========================================================================
   MANILI — ЛИЧНЫЙ КАБИНЕТ (ТЗ §24)
   ========================================================================== */

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Button,
  IconHeart,
  IconLogout,
  IconPackage,
  IconPin,
  IconSettings,
  IconShield,
  IconUser,
} from '@/components/ui'
import { useSeo } from '@/hooks/useSeo'
import { formatPhone } from '@/lib/utils'
import { useAuth } from '@/store/auth'
import '../auth.css'
import '../shop.css'

const LINKS = [
  { to: '/account', end: true, label: 'Мой профиль', icon: <IconUser size={17} /> },
  { to: '/account/orders', end: false, label: 'Мои заказы', icon: <IconPackage size={17} /> },
  { to: '/favorites', end: false, label: 'Избранное', icon: <IconHeart size={17} /> },
  { to: '/account/addresses', end: false, label: 'Адреса', icon: <IconPin size={17} /> },
  { to: '/account/settings', end: false, label: 'Настройки', icon: <IconSettings size={17} /> },
]

export default function Account() {
  useSeo({ title: 'Личный кабинет', canonical: '/account', noIndex: true })

  const user = useAuth((state) => state.user)
  const logout = useAuth((state) => state.logout)
  const isStaff = useAuth((state) => state.isStaff)
  const navigate = useNavigate()

  if (!user) return null

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Ваш аккаунт'

  return (
    <div className="container account">
      <aside className="account__aside">
        <div className="account__user">
          <p className="account__name">{displayName}</p>
          <p className="account__contact">
            {user.phone ? formatPhone(user.phone) : user.email}
          </p>
        </div>

        <nav className="account__nav" aria-label="Разделы кабинета">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="account__link">
              {link.icon}
              {link.label}
            </NavLink>
          ))}

          {isStaff() && (
            <NavLink to="/admin" className="account__link">
              <IconShield size={17} />
              Админ-панель
            </NavLink>
          )}
        </nav>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--c-line)' }}>
          <Button
            variant="ghost"
            size="sm"
            block
            iconLeft={<IconLogout size={16} />}
            onClick={async () => {
              await logout()
              navigate('/')
            }}
          >
            Выйти
          </Button>
        </div>
      </aside>

      <div className="account__panel">
        <Outlet />
      </div>
    </div>
  )
}
