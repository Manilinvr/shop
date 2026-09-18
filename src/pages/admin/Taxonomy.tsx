/* ==========================================================================
   MANILI — КАТЕГОРИИ И КОЛЛЕКЦИИ (ТЗ §26, §27)
   ========================================================================== */

import { useState } from 'react'
import {
  Badge,
  Button,
  IconButton,
  IconEdit,
  IconPlus,
  IconTrash,
  Input,
  Modal,
  Select,
  Spinner,
  Tabs,
  Textarea,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { PUBLISH_STATUSES } from '@/domain/types'
import type { Category, Collection, PublishStatus } from '@/domain/types'
import { slugify } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import './admin.css'
import '../checkout.css'

const STATUS_LABELS: Record<PublishStatus, string> = {
  DRAFT: 'Черновик', PUBLISHED: 'Опубликована', HIDDEN: 'Скрыта', ARCHIVED: 'Архив',
}

export default function Taxonomy() {
  const [tab, setTab] = useState<'categories' | 'collections'>('categories')

  const categories = useAsync(() => backend.catalog.listCategories(), [])
  const collections = useAsync(() => backend.catalog.listCollections(), [])

  const [catModal, setCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState({ title: '', slug: '', description: '', sortOrder: '1' })

  const [colModal, setColModal] = useState(false)
  const [editingCol, setEditingCol] = useState<Collection | null>(null)
  const [colForm, setColForm] = useState({
    title: '', slug: '', description: '', status: 'PUBLISHED' as PublishStatus, sortOrder: '1',
  })

  const [saving, setSaving] = useState(false)

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!catForm.title.trim()) {
      showToast('Укажите название.', { tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: catForm.title,
        slug: catForm.slug || slugify(catForm.title),
        description: catForm.description || null,
        image: editingCat?.image ?? null,
        sortOrder: Number(catForm.sortOrder) || 1,
        isActive: true,
      }
      if (editingCat) await backend.catalogAdmin.updateCategory(editingCat.id, payload)
      else await backend.catalogAdmin.createCategory(payload)
      setCatModal(false)
      categories.reload()
      showToast(editingCat ? 'Категория обновлена.' : 'Категория создана.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveCollection = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!colForm.title.trim()) {
      showToast('Укажите название.', { tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: colForm.title,
        slug: colForm.slug || slugify(colForm.title),
        description: colForm.description || null,
        cover: editingCol?.cover ?? null,
        banner: editingCol?.banner ?? null,
        releaseDate: editingCol?.releaseDate ?? new Date().toISOString(),
        status: colForm.status,
        sortOrder: Number(colForm.sortOrder) || 1,
      }
      if (editingCol) await backend.catalogAdmin.updateCollection(editingCol.id, payload)
      else await backend.catalogAdmin.createCollection(payload)
      setColModal(false)
      collections.reload()
      showToast(editingCol ? 'Коллекция обновлена.' : 'Коллекция создана.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Категории и коллекции</h1>
          <p className="admin-head__sub">Структура каталога и подборки товаров</p>
        </div>
        <div className="admin-head__actions">
          {tab === 'categories' ? (
            <Button
              size="sm"
              iconLeft={<IconPlus size={15} />}
              onClick={() => {
                setEditingCat(null)
                setCatForm({ title: '', slug: '', description: '', sortOrder: String((categories.data?.length ?? 0) + 1) })
                setCatModal(true)
              }}
            >
              Новая категория
            </Button>
          ) : (
            <Button
              size="sm"
              iconLeft={<IconPlus size={15} />}
              onClick={() => {
                setEditingCol(null)
                setColForm({
                  title: '', slug: '', description: '',
                  status: 'PUBLISHED', sortOrder: String((collections.data?.length ?? 0) + 1),
                })
                setColModal(true)
              }}
            >
              Новая коллекция
            </Button>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { value: 'categories', label: 'Категории' },
          { value: 'collections', label: 'Коллекции' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 20 }}>
        {tab === 'categories' && (
          <div className="table-wrap">
            {categories.loading && <Spinner center />}
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Порядок</th>
                    <th>Название</th>
                    <th>Slug</th>
                    <th className="td--wrap">Описание</th>
                    <th style={{ textAlign: 'right' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {(categories.data ?? []).map((category) => (
                    <tr key={category.id}>
                      <td className="td--mono">{category.sortOrder}</td>
                      <td className="td--strong" style={{ color: 'var(--c-cream-100)' }}>
                        {category.title}
                      </td>
                      <td className="td--mono">/{category.slug}</td>
                      <td className="td--wrap">{category.description ?? '—'}</td>
                      <td>
                        <div className="table__actions">
                          <IconButton
                            label="Изменить"
                            size="sm"
                            onClick={() => {
                              setEditingCat(category)
                              setCatForm({
                                title: category.title,
                                slug: category.slug,
                                description: category.description ?? '',
                                sortOrder: String(category.sortOrder),
                              })
                              setCatModal(true)
                            }}
                          >
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton
                            label="Удалить"
                            size="sm"
                            onClick={async () => {
                              await backend.catalogAdmin.deleteCategory(category.id)
                              categories.reload()
                              showToast('Категория удалена.')
                            }}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'collections' && (
          <div className="table-wrap">
            {collections.loading && <Spinner center />}
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Порядок</th>
                    <th>Название</th>
                    <th>Slug</th>
                    <th>Статус</th>
                    <th className="td--wrap">Описание</th>
                    <th style={{ textAlign: 'right' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {(collections.data ?? []).map((collection) => (
                    <tr key={collection.id}>
                      <td className="td--mono">{collection.sortOrder}</td>
                      <td className="td--strong" style={{ color: 'var(--c-cream-100)' }}>
                        {collection.title}
                      </td>
                      <td className="td--mono">/{collection.slug}</td>
                      <td>
                        <Badge tone={collection.status === 'PUBLISHED' ? 'success' : 'outline'}>
                          {STATUS_LABELS[collection.status]}
                        </Badge>
                      </td>
                      <td className="td--wrap">{collection.description ?? '—'}</td>
                      <td>
                        <div className="table__actions">
                          <IconButton
                            label="Изменить"
                            size="sm"
                            onClick={() => {
                              setEditingCol(collection)
                              setColForm({
                                title: collection.title,
                                slug: collection.slug,
                                description: collection.description ?? '',
                                status: collection.status,
                                sortOrder: String(collection.sortOrder),
                              })
                              setColModal(true)
                            }}
                          >
                            <IconEdit size={16} />
                          </IconButton>
                          <IconButton
                            label="Удалить"
                            size="sm"
                            onClick={async () => {
                              await backend.catalogAdmin.deleteCollection(collection.id)
                              collections.reload()
                              showToast('Коллекция удалена.')
                            }}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={catModal}
        onClose={() => setCatModal(false)}
        title={editingCat ? 'Изменить категорию' : 'Новая категория'}
      >
        <form onSubmit={saveCategory} className="checkout-block">
          <Input
            label="Название"
            value={catForm.title}
            onChange={(event) => setCatForm({ ...catForm, title: event.target.value })}
          />
          <Input
            label="Slug"
            value={catForm.slug}
            placeholder={slugify(catForm.title)}
            onChange={(event) => setCatForm({ ...catForm, slug: event.target.value })}
          />
          <Textarea
            label="Описание"
            value={catForm.description}
            onChange={(event) => setCatForm({ ...catForm, description: event.target.value })}
          />
          <Input
            label="Порядок"
            type="number"
            value={catForm.sortOrder}
            onChange={(event) => setCatForm({ ...catForm, sortOrder: event.target.value })}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="submit" loading={saving}>Сохранить</Button>
            <Button type="button" variant="ghost" onClick={() => setCatModal(false)}>Отмена</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={colModal}
        onClose={() => setColModal(false)}
        title={editingCol ? 'Изменить коллекцию' : 'Новая коллекция'}
      >
        <form onSubmit={saveCollection} className="checkout-block">
          <Input
            label="Название"
            value={colForm.title}
            onChange={(event) => setColForm({ ...colForm, title: event.target.value })}
          />
          <Input
            label="Slug"
            value={colForm.slug}
            placeholder={slugify(colForm.title)}
            onChange={(event) => setColForm({ ...colForm, slug: event.target.value })}
          />
          <Textarea
            label="Описание"
            value={colForm.description}
            onChange={(event) => setColForm({ ...colForm, description: event.target.value })}
          />
          <Select
            label="Статус"
            value={colForm.status}
            onChange={(event) => setColForm({ ...colForm, status: event.target.value as PublishStatus })}
          >
            {PUBLISH_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </Select>
          <Input
            label="Порядок"
            type="number"
            value={colForm.sortOrder}
            onChange={(event) => setColForm({ ...colForm, sortOrder: event.target.value })}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="submit" loading={saving}>Сохранить</Button>
            <Button type="button" variant="ghost" onClick={() => setColModal(false)}>Отмена</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
