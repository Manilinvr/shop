import { useEffect } from 'react'

let lockCount = 0

/** Блокирует прокрутку body, пока открыт drawer/модалка. Вложенность учитывается. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    lockCount += 1
    const { body } = document
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    body.dataset.scrollLocked = 'true'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      lockCount -= 1
      if (lockCount === 0) {
        delete body.dataset.scrollLocked
        body.style.paddingRight = ''
      }
    }
  }, [active])
}
