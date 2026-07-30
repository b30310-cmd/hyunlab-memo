import { Check } from 'lucide-react'
import { MenuItem, MenuLabel, ICON } from './Button'

// ============================================================
// 프로젝트 선택 — 메모 편집 화면(메인 에디터·팝업)에서 바로 프로젝트를 바꿀 때 씁니다.
//  '미분류'는 목록에 없습니다 — 이제 왼쪽 목록은 프로젝트가 있는 메모만 보여주므로,
//  여기서 미분류로 옮기면 그 메모가 목록에서 사라진 것처럼 보여 혼란을 줄 수 있습니다.
// ============================================================

interface Project {
  id: string
  name: string
  color: string
}

export function ProjectPicker({
  projects, value, onChange,
}: {
  projects: Project[]
  value: string | null
  onChange: (projectId: string) => void
}) {
  return (
    <div className="w-48">
      <MenuLabel>프로젝트로 이동</MenuLabel>
      {projects.length === 0 ? (
        <p className="px-2 py-3 text-xs leading-relaxed text-faint">
          아직 프로젝트가 없습니다.
          <br />
          왼쪽 목록 위 ＋ 버튼으로 만들어 보세요.
        </p>
      ) : (
        projects.map((p) => (
          <MenuItem
            key={p.id}
            icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />}
            trailing={value === p.id ? <Check size={ICON.sm} className="text-accent" /> : undefined}
            onClick={() => onChange(p.id)}
          >
            {p.name}
          </MenuItem>
        ))
      )}
    </div>
  )
}
