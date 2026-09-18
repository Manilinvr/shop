/* ==========================================================================
   MANILI — МАРШРУТЫ (ТЗ §29)

   Человекочитаемые URL: /shop, /shop/hoodies, /product/manili-hoodie,
   /collections/basic. Страницы грузятся отдельными чанками (ТЗ §30).
   ========================================================================== */

import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { AdminGuard, AuthGuard } from '@/components/layout/Guards'

const Home = lazy(() => import('@/pages/Home'))
const Shop = lazy(() => import('@/pages/Shop'))
const ProductPage = lazy(() => import('@/pages/Product'))
const Collections = lazy(() => import('@/pages/Collections'))
const CollectionPage = lazy(() => import('@/pages/Collection'))
const Favorites = lazy(() => import('@/pages/Favorites'))
const Cart = lazy(() => import('@/pages/Cart'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const OrderSuccess = lazy(() => import('@/pages/OrderSuccess'))
const OrderLookup = lazy(() => import('@/pages/OrderLookup'))
const Login = lazy(() => import('@/pages/Login'))
const Account = lazy(() => import('@/pages/account/Account'))
const AccountProfile = lazy(() => import('@/pages/account/Profile'))
const AccountOrders = lazy(() => import('@/pages/account/Orders'))
const AccountOrderDetails = lazy(() => import('@/pages/account/OrderDetails'))
const AccountAddresses = lazy(() => import('@/pages/account/Addresses'))
const AccountSettings = lazy(() => import('@/pages/account/Settings'))
const About = lazy(() => import('@/pages/About'))
const Contacts = lazy(() => import('@/pages/Contacts'))
const Lookbook = lazy(() => import('@/pages/Lookbook'))
const InfoPage = lazy(() => import('@/pages/InfoPage'))
const LegalPage = lazy(() => import('@/pages/LegalPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminOrders = lazy(() => import('@/pages/admin/Orders'))
const AdminOrderCard = lazy(() => import('@/pages/admin/OrderCard'))
const AdminProducts = lazy(() => import('@/pages/admin/Products'))
const AdminProductEdit = lazy(() => import('@/pages/admin/ProductEdit'))
const AdminTaxonomy = lazy(() => import('@/pages/admin/Taxonomy'))
const AdminCustomers = lazy(() => import('@/pages/admin/Customers'))
const AdminPromocodes = lazy(() => import('@/pages/admin/Promocodes'))
const AdminContent = lazy(() => import('@/pages/admin/Content'))
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))
const AdminAudit = lazy(() => import('@/pages/admin/Audit'))

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },

      { path: 'shop', element: <Shop /> },
      { path: 'shop/:categorySlug', element: <Shop /> },
      { path: 'product/:slug', element: <ProductPage /> },
      { path: 'collections', element: <Collections /> },
      { path: 'collections/:slug', element: <CollectionPage /> },

      { path: 'favorites', element: <Favorites /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'checkout/success/:orderId', element: <OrderSuccess /> },
      { path: 'order-lookup', element: <OrderLookup /> },

      { path: 'login', element: <Login /> },

      {
        path: 'account',
        element: (
          <AuthGuard>
            <Account />
          </AuthGuard>
        ),
        children: [
          { index: true, element: <AccountProfile /> },
          { path: 'orders', element: <AccountOrders /> },
          { path: 'orders/:orderId', element: <AccountOrderDetails /> },
          { path: 'addresses', element: <AccountAddresses /> },
          { path: 'settings', element: <AccountSettings /> },
        ],
      },

      { path: 'about', element: <About /> },
      { path: 'contacts', element: <Contacts /> },
      { path: 'lookbook', element: <Lookbook /> },
      { path: 'delivery', element: <InfoPage page="delivery" /> },
      { path: 'returns', element: <InfoPage page="returns" /> },
      { path: 'sizes', element: <InfoPage page="sizes" /> },
      { path: 'legal/:doc', element: <LegalPage /> },

      {
        path: 'admin',
        element: (
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'orders', element: <AdminOrders /> },
          { path: 'orders/:orderId', element: <AdminOrderCard /> },
          { path: 'products', element: <AdminProducts /> },
          { path: 'products/:productId', element: <AdminProductEdit /> },
          { path: 'taxonomy', element: <AdminTaxonomy /> },
          { path: 'customers', element: <AdminCustomers /> },
          { path: 'promocodes', element: <AdminPromocodes /> },
          { path: 'content', element: <AdminContent /> },
          { path: 'analytics', element: <AdminAnalytics /> },
          { path: 'settings', element: <AdminSettings /> },
          { path: 'audit', element: <AdminAudit /> },
        ],
      },

      { path: '*', element: <NotFound /> },
    ],
  },
]
