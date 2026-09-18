/* ==========================================================================
   MANILI — CMS ГЛАВНОЙ СТРАНИЦЫ (ТЗ §8)

   Владелец меняет тексты, ссылки, изображения и порядок блоков,
   не трогая код сайта.
   ========================================================================== */

import { useState } from 'react'
import {
  Badge,
  Button,
  ButtonLink,
  IconArrowUpRight,
  IconButton,
  IconChevronDown,
  IconEdit,
  IconEye,
  IconEyeOff,
  Input,
  Modal,
  Spinner,
  Textarea,
  showToast,
} from '@/components/ui'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { useAsync } from '@/hooks/useAsync'
import type { HomepageBlock, HomepageBlockType } from '@/domain/types'
import { backend, toUserMessage } from '@/repositories'
import './admin.css'
import '../checkout.css'

const BLOCK_LABELS: Record<HomepageBlockType, string> = {
  HERO: 'Первый экран',
  NEW_COLLECTION: 'Новая коллекция',
  CATEGORIES: 'Категории',
  FEATURED_PRODUCTS: 'Избранные товары',
  EDITORIAL: 'Editorial-блок',
  MEDIA: 'Видео / фото',
  STORY: 'История бренда',
  NEW_ARRIVALS: 'Новинки',
  COLLECTIONS: 'Коллекции',
  CTA: 'Призыв к действию',
  MARQUEE: 'Бегущая строка',
}

export default function Content() {
  const blocks = useAsync(() => backend.homepage.getBlocks(), [])
  const [editing, setEditing] = useState<HomepageBlock | null>(null)
  const [form, setForm] = useState({
    eyebrow: '', title: '', subtitle: '', text: '',
    ctaLabel: '', ctaHref: '', image: '', items: '',
  })
  const [saving, setSaving] = useState(false)

  const openEditor = (block: HomepageBlock) => {
    setEditing(block)
    setForm({
      eyebrow: block.data.eyebrow ?? '',
      title: block.data.title ?? '',
      subtitle: block.data.subtitle ?? '',
      text: block.data.text ?? '',
      ctaLabel: block.data.ctaLabel ?? '',
      ctaHref: block.data.ctaHref ?? '',
      image: block.data.image ?? '',
      items: (block.data.items ?? []).join(', '),
    })
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      await backend.homepage.updateBlock(editing.id, {
        data: {
          ...editing.data,
          eyebrow: form.eyebrow || undefined,
          title: form.title || undefined,
          subtitle: form.subtitle || undefined,
          text: form.text || undefined,
          ctaLabel: form.ctaLabel || undefined,
          ctaHref: form.ctaHref || undefined,
          image: form.image || undefined,
          items: form.items ? form.items.split(',').map((i) => i.trim()).filter(Boolean) : undefined,
        },
      })
      setEditing(null)
      blocks.reload()
      showToast('Блок обновлён. Изменения уже видны на главной.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const list = blocks.data ?? []
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const reordered = [...list]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    try {
      await backend.homepage.reorderBlocks(reordered.map((b) => b.id))
      blocks.reload()
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    }
  }

  const toggle = async (block: HomepageBlock) => {
    try {
      await backend.homepage.toggleBlock(block.id, !block.isEnabled)
      blocks.reload()
      showToast(block.isEnabled ? 'Блок скрыт с главной.' : 'Блок показан на главной.')
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    }
  }

  const list = blocks.data ?? []

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Главная страница</h1>
          <p className="admin-head__sub">Порядок, содержимое и видимость блоков</p>
        </div>
        <div className="admin-head__actions">
          <ButtonLink to="/" variant="secondary" size="sm" iconRight={<IconArrowUpRight size={15} />}>
            Открыть сайт
          </ButtonLink>
        </div>
      </div>

      {blocks.loading && <Spinner center />}

      <div>
        {list.map((block, index) => (
          <div key={block.id} className="cms-block" data-disabled={!block.isEnabled ? 'true' : undefined}>
            <div className="cms-block__drag">
              <IconButton
                label="Выше"
                size="sm"
                disabled={index === 0}
                onClick={() => void move(index, -1)}
              >
                <IconChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
              </IconButton>
              <IconButton
                label="Ниже"
                size="sm"
                disabled={index === list.length - 1}
                onClick={() => void move(index, 1)}
              >
                <IconChevronDown size={14} />
              </IconButton>
            </div>

            <div className="cms-block__body">
              <p className="cms-block__type">
                {index + 1}. {BLOCK_LABELS[block.type]}
              </p>
              <p className="cms-block__title">
                {block.data.title || block.data.text || '—'}
              </p>
            </div>

            {!block.isEnabled && <Badge tone="outline">Скрыт</Badge>}

            <div className="cms-block__actions">
              <IconButton
                label={block.isEnabled ? 'Скрыть блок' : 'Показать блок'}
                size="sm"
                onClick={() => void toggle(block)}
              >
                {block.isEnabled ? <IconEye size={16} /> : <IconEyeOff size={16} />}
              </IconButton>
              <IconButton label="Редактировать" size="sm" onClick={() => openEditor(block)}>
                <IconEdit size={16} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-note" style={{ marginTop: 20 }}>
        <strong>Порядок и видимость.</strong> Стрелками меняется порядок блоков на главной,
        глазом — показ и скрытие. Изменения видны сразу, публиковать отдельно не нужно.
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? BLOCK_LABELS[editing.type] : ''}
        wide
      >
        <form onSubmit={save} className="checkout-block">
          {editing?.type === 'MARQUEE' ? (
            <Textarea
              label="Фразы"
              hint="Через запятую"
              value={form.items}
              onChange={(event) => setForm({ ...form, items: event.target.value })}
            />
          ) : (
            <>
              <Input
                label="Надзаголовок"
                value={form.eyebrow}
                onChange={(event) => setForm({ ...form, eyebrow: event.target.value })}
              />
              <Input
                label="Заголовок"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <Input
                label="Подзаголовок"
                value={form.subtitle}
                onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
              />
              <Textarea
                label="Текст"
                value={form.text}
                onChange={(event) => setForm({ ...form, text: event.target.value })}
              />
              <div className="form-row form-row--2" style={{ display: 'grid', gap: 'var(--s-4)' }}>
                <Input
                  label="Текст кнопки"
                  value={form.ctaLabel}
                  onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })}
                />
                <Input
                  label="Ссылка кнопки"
                  value={form.ctaHref}
                  placeholder="/shop"
                  onChange={(event) => setForm({ ...form, ctaHref: event.target.value })}
                />
              </div>
              <div>
                <p className="review-block__title" style={{ marginBottom: 10 }}>
                  Изображение блока
                </p>
                <ImageUploader
                  value={form.image ? [form.image] : []}
                  onChange={(urls) => setForm({ ...form, image: urls[0] ?? '' })}
                  max={1}
                  hint="Один кадр. Можно загрузить файл или вставить ссылку."
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="submit" loading={saving}>Сохранить</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Отмена</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
