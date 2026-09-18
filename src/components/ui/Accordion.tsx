import { useState } from 'react'
import type { ReactNode } from 'react'
import { IconPlus } from './Icons'
import './ui.css'

export interface AccordionItem {
  id: string
  title: string
  content: ReactNode
}

export function Accordion({
  items,
  defaultOpenId,
}: {
  items: AccordionItem[]
  defaultOpenId?: string
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null)

  return (
    <div className="accordion">
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <div key={item.id} className="accordion__item">
            <button
              type="button"
              className="accordion__trigger"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              {item.title}
              <IconPlus size={16} className="accordion__icon" />
            </button>
            <div className="accordion__panel" data-open={isOpen ? 'true' : 'false'}>
              <div>
                <div className="accordion__content">{item.content}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
