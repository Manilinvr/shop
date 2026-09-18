/* ==========================================================================
   MANILI — ЗАГРУЗКА ИЗОБРАЖЕНИЙ (ТЗ §26, §27)

   Перетаскивание или выбор файла, порядок кадров, удаление.
   Компонент не знает про Appwrite: он работает через backend.storage,
   поэтому в демо-режиме фото остаётся в браузере, а после подключения
   Storage — уходит в облако. Код при этом не меняется.
   ========================================================================== */

import { useRef, useState } from 'react'
import { Media } from '@/components/media/Media'
import {
  Button,
  IconArrowLeft,
  IconArrowRight,
  IconButton,
  IconPlus,
  IconTrash,
  Input,
  showToast,
} from '@/components/ui'
import { backend, toUserMessage } from '@/repositories'
import { cx } from '@/lib/utils'
import './image-uploader.css'

export interface ImageUploaderProps {
  /** Текущие ссылки на изображения. */
  value: string[]
  onChange: (urls: string[]) => void
  /** Сколько кадров максимум. */
  max?: number
  /** Подсказка под областью загрузки. */
  hint?: string
}

export function ImageUploader({ value, onChange, max = 8, hint }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [manualUrl, setManualUrl] = useState('')

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, max - value.length)
    if (list.length === 0) {
      showToast(`Больше ${max} изображений добавить нельзя.`, { tone: 'error' })
      return
    }

    setUploading(true)
    setProgress(0)
    const uploaded: string[] = []

    try {
      for (const file of list) {
        const result = await backend.storage.upload(file, setProgress)
        uploaded.push(result.url)
      }
      onChange([...value, ...uploaded])
      showToast(
        uploaded.length === 1 ? 'Изображение загружено.' : `Загружено изображений: ${uploaded.length}.`,
        { tone: 'success' },
      )
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
      // Уже загруженные кадры не теряем.
      if (uploaded.length > 0) onChange([...value, ...uploaded])
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="uploader">
      {value.length > 0 && (
        <div className="uploader__grid">
          {value.map((url, index) => (
            <div key={`${url}-${index}`} className="uploader__item">
              <Media src={url} alt="" ratio="3 / 4" rounded="md" sizes="140px" />

              {index === 0 && <span className="uploader__main">Главное</span>}

              <div className="uploader__tools">
                <IconButton
                  label="Левее"
                  size="sm"
                  tone="filled"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <IconArrowLeft size={14} />
                </IconButton>
                <IconButton
                  label="Правее"
                  size="sm"
                  tone="filled"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <IconArrowRight size={14} />
                </IconButton>
                <IconButton label="Удалить" size="sm" tone="filled" onClick={() => remove(index)}>
                  <IconTrash size={14} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <div
          className={cx('uploader__drop', dragOver && 'uploader__drop--over')}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragOver(false)
            if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files?.length) void handleFiles(event.target.files)
            }}
          />

          {uploading ? (
            <>
              <p className="uploader__drop-title">Загружаем… {progress}%</p>
              <div className="uploader__bar">
                <div className="uploader__bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <>
              <span className="uploader__drop-icon">
                <IconPlus size={20} />
              </span>
              <p className="uploader__drop-title">Перетащите фото или нажмите</p>
              <p className="uploader__drop-hint">
                {hint ?? 'JPG, PNG, WebP до 8 МБ. Первое изображение — главное в карточке.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Запасной путь: фото уже лежит где-то на хостинге. */}
      <div className="uploader__manual">
        <Input
          label="Или вставьте ссылку на изображение"
          placeholder="https://… либо placeholder:hoodie/1"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && manualUrl.trim()) {
              event.preventDefault()
              onChange([...value, manualUrl.trim()])
              setManualUrl('')
            }
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={!manualUrl.trim() || value.length >= max}
          onClick={() => {
            onChange([...value, manualUrl.trim()])
            setManualUrl('')
          }}
        >
          Добавить
        </Button>
      </div>
    </div>
  )
}
