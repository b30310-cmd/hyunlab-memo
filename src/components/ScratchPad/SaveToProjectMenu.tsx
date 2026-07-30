import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useMemoStore } from '@/store/useMemoStore'
import { MenuItem, MenuLabel, ICON } from '@/components/ui/Button'
import { BRAND_ACCENT } from '@/lib/constants'

// ============================================================
// 스크래치패드 저장 — 프로젝트 선택 (필수)
//  '새 메모로 저장(프로젝트 없이)'은 없앴으므로, 프로젝트가 하나도 없어도
//  여기서 바로 새 프로젝트를 만들면서 저장할 수 있어야 막히지 않습니다.
// ============================================================

const PROJECT_COLORS = [BRAND_ACCENT, '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export function SaveToProjectMenu({ onSave }: { onSave: (projectId: string) => void }) {
  const projects = useMemoStore((s) => s.projects)
  const addProject = useMemoStore((s) => s.addProject)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const createAndSave = () => {
    const clean = name.trim()
    if (!clean) return
    const project = addProject(clean, PROJECT_COLORS[projects.length % PROJECT_COLORS.length])
    onSave(project.id)
  }

  return (
    <div className="w-52">
      <MenuLabel>프로젝트 선택</MenuLabel>

      {projects.length === 0 && !creating && (
        <p className="px-2 pb-2 text-xs leading-relaxed text-faint">
          아직 프로젝트가 없습니다.
          <br />
          아래에서 새로 만들면서 바로 저장하세요.
        </p>
      )}

      {projects.map((p) => (
        <MenuItem
          key={p.id}
          icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />}
          onClick={() => onSave(p.id)}
        >
          {p.name}
        </MenuItem>
      ))}

      {creating ? (
        <div className="flex items-center gap-1 px-2 py-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createAndSave()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="새 프로젝트 이름"
            className="ui-input !h-[var(--h-sm)] !text-sm"
          />
          <button
            onClick={createAndSave}
            title="만들면서 저장"
            className="ui-icon-btn h-[var(--h-sm)] w-[var(--h-sm)] shrink-0"
          >
            <Plus size={ICON.sm} />
          </button>
        </div>
      ) : (
        <MenuItem icon={<Plus size={ICON.md} />} onClick={() => setCreating(true)}>
          새 프로젝트 만들면서 저장
        </MenuItem>
      )}
    </div>
  )
}
