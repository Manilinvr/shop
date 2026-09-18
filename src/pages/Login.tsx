/* ==========================================================================
   MANILI — ВХОД И РЕГИСТРАЦИЯ (ТЗ §6)

   Приоритетный способ для РФ — телефон + SMS. Email с паролем — запасной.
   Архитектура расширяемая: добавление VK/Telegram OAuth не затронет UI,
   достаточно нового метода в AuthRepository.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import {
  Button,
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  Input,
  Tabs,
  showToast,
} from '@/components/ui'
import { useSeo } from '@/hooks/useSeo'
import { config } from '@/api/config'
import { formatPhone, isValidEmail, isValidPhone, normalizePhone } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import { loginAsDemoAdmin } from '@/repositories/mock'
import { useAuth } from '@/store/auth'
import './auth.css'

type Mode = 'phone' | 'email'
type EmailMode = 'login' | 'register' | 'recovery'

export default function Login() {
  useSeo({ title: 'Вход', canonical: '/login', noIndex: true })

  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuth((state) => state.user)
  const setUser = useAuth((state) => state.setUser)
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/account'

  const [mode, setMode] = useState<Mode>('phone')
  const [emailMode, setEmailMode] = useState<EmailMode>('login')
  const [loading, setLoading] = useState(false)

  // Телефон + SMS
  const [phone, setPhone] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState(['', '', '', ''])
  const [resendIn, setResendIn] = useState(0)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  // Email
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  if (user) return <Navigate to={redirectTo} replace />

  const requestCode = async () => {
    if (!isValidPhone(phone)) {
      showToast('Проверьте номер телефона.', { tone: 'error' })
      return
    }
    setLoading(true)
    try {
      const result = await backend.auth.requestPhoneCode(normalizePhone(phone))
      setCodeSent(true)
      setResendIn(result.retryAfterSec)
      setTimeout(() => codeRefs.current[0]?.focus(), 80)
      showToast('Код отправлен в SMS.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (value?: string) => {
    const fullCode = value ?? code.join('')
    if (fullCode.length !== 4) return
    setLoading(true)
    try {
      const session = await backend.auth.verifyPhoneCode(normalizePhone(phone), fullCode)
      setUser(session.user)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
      setCode(['', '', '', ''])
      codeRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidEmail(form.email)) {
      showToast('Проверьте адрес почты.', { tone: 'error' })
      return
    }

    setLoading(true)
    try {
      if (emailMode === 'recovery') {
        await backend.auth.requestPasswordRecovery(form.email)
        showToast('Если аккаунт существует, письмо со ссылкой уже отправлено.', { tone: 'success' })
        setEmailMode('login')
        return
      }

      if (form.password.length < 6) {
        showToast('Пароль должен быть не короче 6 символов.', { tone: 'error' })
        return
      }

      const session =
        emailMode === 'register'
          ? await backend.auth.registerWithEmail({
              email: form.email,
              password: form.password,
              firstName: form.firstName,
              lastName: form.lastName,
            })
          : await backend.auth.loginWithEmail(form.email, form.password)

      setUser(session.user)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCodeInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[index] = digit
    setCode(next)
    if (digit && index < 3) codeRefs.current[index + 1]?.focus()
    if (next.every((d) => d !== '')) void verifyCode(next.join(''))
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div style={{ marginBottom: 'var(--s-6)', textAlign: 'center' }}>
          <Link to="/" aria-label="MANILI — на главную">
            <Logo size={30} />
          </Link>
        </div>

        {!codeSent && (
          <Tabs
            tabs={[
              { value: 'phone', label: 'По телефону' },
              { value: 'email', label: 'По email' },
            ]}
            value={mode}
            onChange={setMode}
            className="auth__tabs"
          />
        )}

        {mode === 'phone' && !codeSent && (
          <div style={{ marginTop: 'var(--s-6)' }}>
            <h1 className="auth__title">Вход по телефону</h1>
            <p className="auth__lead">Отправим код подтверждения в SMS — пароль не нужен.</p>
            <div className="auth__form">
              <Input
                label="Телефон"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 999 123-45-67"
                value={phone}
                onChange={(event) => setPhone(formatPhone(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void requestCode()
                }}
              />
              <Button size="lg" block loading={loading} onClick={() => void requestCode()}>
                Получить код
              </Button>
            </div>
          </div>
        )}

        {mode === 'phone' && codeSent && (
          <div style={{ marginTop: 'var(--s-6)' }}>
            <h1 className="auth__title">Введите код</h1>
            <p className="auth__lead">Отправили 4 цифры на {phone}</p>

            <div className="code-inputs">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { codeRefs.current[index] = el }}
                  className="code-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  aria-label={`Цифра ${index + 1}`}
                  onChange={(event) => handleCodeInput(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && !code[index] && index > 0) {
                      codeRefs.current[index - 1]?.focus()
                    }
                  }}
                />
              ))}
            </div>

            <div style={{ marginTop: 'var(--s-5)', display: 'grid', gap: 10 }}>
              <Button size="lg" block loading={loading} onClick={() => void verifyCode()}>
                Войти
              </Button>
              <Button
                variant="ghost"
                size="sm"
                block
                disabled={resendIn > 0}
                onClick={() => void requestCode()}
              >
                {resendIn > 0 ? `Отправить снова через ${resendIn} с` : 'Отправить код снова'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                block
                iconLeft={<IconArrowLeft size={15} />}
                onClick={() => {
                  setCodeSent(false)
                  setCode(['', '', '', ''])
                }}
              >
                Изменить номер
              </Button>
            </div>

            {config.backend === 'mock' && (
              <div className="auth__demo">
                <p className="auth__demo-text">
                  Демо-режим: SMS-провайдер не подключён. Код подтверждения — <strong>0000</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={submitEmail} style={{ marginTop: 'var(--s-6)' }}>
            <h1 className="auth__title">
              {emailMode === 'register'
                ? 'Регистрация'
                : emailMode === 'recovery'
                  ? 'Восстановление пароля'
                  : 'Вход'}
            </h1>
            <p className="auth__lead">
              {emailMode === 'register'
                ? 'Заказы, избранное и адреса будут сохраняться в аккаунте.'
                : emailMode === 'recovery'
                  ? 'Пришлём ссылку для смены пароля на указанную почту.'
                  : 'Войдите, чтобы видеть свои заказы и избранное.'}
            </p>

            <div className="auth__form">
              {emailMode === 'register' && (
                <div className="form-row form-row--2" style={{ display: 'grid', gap: 'var(--s-4)' }}>
                  <Input
                    label="Имя"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                  />
                  <Input
                    label="Фамилия"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                  />
                </div>
              )}

              <Input
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />

              {emailMode !== 'recovery' && (
                <Input
                  label="Пароль"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={emailMode === 'register' ? 'new-password' : 'current-password'}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      style={{ color: 'var(--c-text-muted)', display: 'grid', placeItems: 'center' }}
                    >
                      {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  }
                />
              )}

              <Button type="submit" size="lg" block loading={loading}>
                {emailMode === 'register'
                  ? 'Создать аккаунт'
                  : emailMode === 'recovery'
                    ? 'Отправить ссылку'
                    : 'Войти'}
              </Button>
            </div>

            <div className="auth__switch">
              {emailMode === 'login' && (
                <>
                  <button type="button" onClick={() => setEmailMode('register')}>
                    Создать аккаунт
                  </button>
                  {' · '}
                  <button type="button" onClick={() => setEmailMode('recovery')}>
                    Забыли пароль?
                  </button>
                </>
              )}
              {emailMode !== 'login' && (
                <button type="button" onClick={() => setEmailMode('login')}>
                  Вернуться ко входу
                </button>
              )}
            </div>
          </form>
        )}

        {config.backend === 'mock' && (
          <div className="auth__demo">
            <p className="auth__demo-text">
              Backend ещё не подключён. Чтобы посмотреть админ-панель, войдите
              демо-администратором.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const admin = await loginAsDemoAdmin()
                setUser(admin)
                navigate('/admin', { replace: true })
              }}
            >
              Войти как владелец (демо)
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
