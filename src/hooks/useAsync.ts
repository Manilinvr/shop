/* ==========================================================================
   MANILI — ЗАГРУЗКА ДАННЫХ
   Минималистичная замена react-query: меньше кода в бандле (ТЗ §30),
   ровно те состояния, которые нужны интерфейсу.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toUserMessage } from '@/repositories'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { skip?: boolean } = {},
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!options.skip)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (options.skip) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    loader()
      .then((result) => {
        if (cancelled || !mounted.current) return
        setData(result)
      })
      .catch((err: unknown) => {
        if (cancelled || !mounted.current) return
        setError(toUserMessage(err))
      })
      .finally(() => {
        if (cancelled || !mounted.current) return
        setLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, options.skip])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload }
}
