/* ==========================================================================
   MANILI — ПЕРЕХВАТ ОШИБОК РЕНДЕРА (ТЗ §41)

   Без этого любая ошибка в компоненте роняет всё приложение в белый экран,
   и покупатель просто уходит. Здесь он видит понятное сообщение и кнопки,
   которыми можно выбраться, а техническая деталь остаётся в консоли.

   Класс, а не хук: перехват ошибок рендера в React возможен только
   через componentDidCatch.
   ========================================================================== */

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import './error-boundary.css'

interface Props {
  children: ReactNode
  /** Сбрасывать состояние при смене — например, при переходе на другую страницу. */
  resetKey?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Технические детали — в консоль и в мониторинг, но не на экран покупателю.
    console.error('[MANILI] Ошибка рендера:', error, info.componentStack)
  }

  componentDidUpdate(prevProps: Props) {
    // Перешли на другую страницу — даём приложению шанс отрисоваться заново.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="errbox" role="alert">
        <div className="errbox__inner">
          <p className="errbox__eyebrow">Что-то пошло не так</p>
          <h1 className="errbox__title">Страница не открылась</h1>
          <p className="errbox__text">
            Мы уже знаем о проблеме. Попробуйте обновить страницу — если не поможет,
            вернитесь на главную или напишите нам, поможем вручную.
          </p>

          <div className="errbox__actions">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => window.location.reload()}
            >
              Обновить страницу
            </button>
            <a href="/" className="btn btn--secondary btn--lg">
              На главную
            </a>
          </div>
        </div>
      </div>
    )
  }
}
