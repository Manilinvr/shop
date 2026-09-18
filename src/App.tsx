import { useEffect } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { routes } from './routes'
import { useAuth } from './store/auth'
import { backendReady } from './repositories'

const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || undefined,
})

export default function App() {
  const init = useAuth((state) => state.init)

  useEffect(() => {
    // Дожидаемся выбранного backend, затем восстанавливаем сессию.
    void backendReady.then(() => init())
  }, [init])

  return <RouterProvider router={router} />
}
