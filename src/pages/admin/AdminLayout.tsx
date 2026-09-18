/* ==========================================================================
   MANILI — КАРКАС АДМИН-ПАНЕЛИ (ТЗ §39)
   ========================================================================== */

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import {
  IconArrowUpRight,
  IconBell,
  IconChart,
  IconGrid,
  IconHome,
  IconList,
  IconPackage,
  IconLogout,
  IconSettings,
  IconShield,
  IconTag,
  IconUser,
} from '@/components/ui'
import { useSeo } from '@/hooks/useSeo'
import { useAuth } from '@/store/auth'
import './admin.css'

const NAV_GROUPS = [
  {
    title: 'Продажи',
    links: [
      { to: '/admin', end: true, label: 'Дашборд', icon: <IconHome size={17} /> },
      { to: '/admin/orders', end: false, label: 'Заказы', icon: <IconPackage size={17} /> },
      { to: '/admin/customers', end: false, label: 'Клиенты', icon: <IconUser size={17} /> },
    ],
  },
  {
    title: 'Каталог',
    links: [
      { to: '/admin/products', end: false, label: 'Товары', icon: <IconGrid size={17} /> },
      { to: '/admin/taxonomy', end: false, label: 'Категории и коллекции', icon: <IconList size={17} /> },
      { to: '/admin/promocodes', end: false, label: 'Промокоды', icon: <IconTag size={17} /> },
    ],
  },
  {
    title: 'Контент и данные',
    links: [
      { to: '/admin/content', end: false, label: 'Главная страница', icon: <IconBell size={17} /> },
      { to: '/admin/analytics', end: false, label: 'Аналитика', icon: <IconChart size={17} /> },
      { to: '/admin/audit', end: false, label: 'Журнал действий', icon: <IconShield size={17} /> },
      { to: '/admin/settings', end: false, label: 'Настройки', icon: <IconSettings size={17} /> },
    ],
  },
]

const ALL_LINKS = NAV_GROUPS.flatMap((group) => group.links)

export default function AdminLayout() {
  useSeo({ title: 'Админ-панель MANILI', noIndex: true })

  const user = useAuth((state) => state.user)
  const logout = useAuth((state) => state.logout)
  const navigate = useNavigate()

  return (
    <div className="admin">
      <aside className="admin__aside">
        <Link to="/" className="admin__brand" aria-label="MANILI — на сайт">
          <Logo size={22} />
          <p className="admin__brand-sub">
            {user ? `${user.firstName} ${user.lastName}`.trim() || 'Панель управления' : 'Панель управления'}
          </p>
        </Link>

        <nav aria-label="Разделы админки">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="admin__group-title">{group.title}</p>
              <div className="admin__nav">
                {group.links.map((link) => (
                  <NavLink key={link.to} to={link.to} end={link.end} className="admin__link">
                    {link.icon}
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin__foot">
          <Link to="/" className="admin__link">
            <IconArrowUpRight size={17} />
            Перейти на сайт
          </Link>
          <button
            type="button"
            className="admin__link"
            onClick={async () => {
              await logout()
              navigate('/')
            }}
          >
            <IconLogout size={17} />
            Выйти
          </button>
        </div>
      </aside>

      <main className="admin__main">
        <nav className="admin__mobile-nav" aria-label="Разделы админки">
          {ALL_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="admin__mobile-link">
              {link.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </main>
    </div>
  )
}
