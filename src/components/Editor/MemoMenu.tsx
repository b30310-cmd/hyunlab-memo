import { useState } from 'react'
import {
  Copy, ClipboardCopy, Image as ImageIcon, FileDown, Printer,
  Trash2, FolderInput, History, Files, Check, ChevronLeft,
} from 'lucide-react'
import type { Memo } from '@/types'
import { useMemoStore } from '@/store/useMemoStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { resolveColor } from '@/lib/constants'
import { MenuItem, MenuDivider, MenuLabel, ICON } from '@/components/ui/Button'
import * as ex from '@/lib/exporter'
import { HistoryPanel } from './HistoryPanel'

// ============================================================
// 메모 '더보기(⋯)' 메뉴 — 공통 관리 액션 세트
//  복사 · 내보내기 · 복제 · 프로젝트 이동 · 기록 복원 · 삭제
//
//  사이드바 · 메인 에디터 · 팝업 메모 세 화면 모두 이 컴포넌트를 그대로 씁니다.
//  (어느 화면에서 열어도 똑같은 메뉴가 보여야 합니다)
//
//  【이미지 계열 내보내기 제약】
//  이미지로 복사 / PNG·JPG·PDF 저장은 화면에 실제로 그려진 메모 영역을
//  캡처하는 방식이라 surfaceRef가 필요합니다. 사이드바 목록처럼
//  메모 본문이 화면에 그려져 있지 않은 곳에서는 surfaceRef를 넘기지 않으면
//  해당 항목만 비활성화되고, 나머지(복사 텍스트/복제/이동/기록/삭제)는
//  그대로 동작합니다. "되는 척"하지 않기 위한 처리입니다.
// ============================================================

interface Props {
  memo: Memo
  /** 화면에 실제로 렌더된 메모 영역. 없으면 이미지 계열 내보내기만 비활성화됩니다. */
  surfaceRef?: React.RefObject<HTMLElement>
  onDone: () => void
}

export function MemoMenu({ memo, surfaceRef, onDone }: Props) {
  const { deleteMemo, duplicateMemo, moveMemoToProject, projects } = useMemoStore()
  const design = useMemoStore((s) => s.getDesign(memo.id))
  const isDark = useSettingsStore((s) => s.theme === 'dark')
  const [view, setView] = useState<'menu' | 'project' | 'history'>('menu')
  const [busy, setBusy] = useState<string | null>(null)

  const bg = resolveColor(design.color, isDark)
  const filename = (memo.title.trim() || '메모').replace(/[\\/:*?"<>|]/g, '_')
  const canExport = !!surfaceRef

  const run = async (labelText: string, fn: () => Promise<void>) => {
    setBusy(labelText)
    try {
      await fn()
      setBusy(null)
      onDone()
    } catch (e) {
      setBusy(null)
      alert(`${labelText} 실패: ${(e as Error).message}`)
    }
  }

  const surface = () => {
    const el = surfaceRef?.current
    if (!el) throw new Error('메모 영역을 찾을 수 없습니다.')
    return el as HTMLElement
  }

  if (view === 'history') {
    return <HistoryPanel memoId={memo.id} onBack={() => setView('menu')} onDone={onDone} />
  }

  if (view === 'project') {
    return (
      <div className="w-52">
        <BackRow onClick={() => setView('menu')}>프로젝트로 이동</BackRow>
        {/*
          '미분류'로 옮기는 항목은 일부러 없앴습니다. 왼쪽 목록에는 이제
          프로젝트가 있는 메모만 보이므로, 미분류로 옮기면 목록에서 이 메모가
          사라진 것처럼 보여 혼란스러울 수 있습니다(데이터는 남아있지만).
        */}
        {projects.length === 0 && (
          <p className="px-2 py-3 text-xs leading-relaxed text-faint">
            아직 프로젝트가 없습니다.
            <br />
            왼쪽 목록 위 ＋ 버튼으로 만들어 보세요.
          </p>
        )}
        {projects.map((p) => (
          <MenuItem
            key={p.id}
            icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />}
            trailing={memo.projectId === p.id ? <Check size={ICON.sm} className="text-accent" /> : undefined}
            onClick={() => { moveMemoToProject(memo.id, p.id); onDone() }}
          >
            {p.name}
          </MenuItem>
        ))}
      </div>
    )
  }

  return (
    <div className="w-52">
      <MenuLabel>복사</MenuLabel>
      <MenuItem icon={<ClipboardCopy size={ICON.md} />} onClick={() => run('내용 복사', () => ex.copyText(memo.content))}>
        내용만 복사
      </MenuItem>
      <MenuItem icon={<Copy size={ICON.md} />} onClick={() => run('서식 복사', () => ex.copyRich(memo.content))}>
        서식 포함 복사
      </MenuItem>
      <MenuItem
        icon={<ImageIcon size={ICON.md} />}
        disabled={!canExport}
        title={canExport ? undefined : '메모를 먼저 열어야 사용할 수 있어요'}
        onClick={() => run('이미지 복사', () => ex.copyAsImage(surface(), bg))}
      >
        이미지로 복사
      </MenuItem>
      <MenuItem icon={<Files size={ICON.md} />} onClick={() => { duplicateMemo(memo.id); onDone() }}>
        메모 복제
      </MenuItem>

      <MenuDivider />
      <MenuLabel>내보내기</MenuLabel>
      <MenuItem
        icon={<FileDown size={ICON.md} />}
        disabled={!canExport}
        title={canExport ? undefined : '메모를 먼저 열어야 사용할 수 있어요'}
        onClick={() => run('PNG 저장', () => ex.saveAsPng(surface(), bg, filename))}
      >
        PNG로 저장
      </MenuItem>
      <MenuItem
        icon={<FileDown size={ICON.md} />}
        disabled={!canExport}
        title={canExport ? undefined : '메모를 먼저 열어야 사용할 수 있어요'}
        onClick={() => run('JPG 저장', () => ex.saveAsJpg(surface(), bg, filename))}
      >
        JPG로 저장
      </MenuItem>
      <MenuItem
        icon={<Printer size={ICON.md} />}
        trailing={canExport ? '인쇄창' : undefined}
        disabled={!canExport}
        title={canExport ? undefined : '메모를 먼저 열어야 사용할 수 있어요'}
        onClick={() => run('PDF 저장', () => ex.printToPdf(surface(), bg, filename))}
      >
        PDF로 저장
      </MenuItem>

      <MenuDivider />
      <MenuItem icon={<FolderInput size={ICON.md} />} trailing="›" onClick={() => setView('project')}>
        프로젝트로 이동
      </MenuItem>
      <MenuItem icon={<History size={ICON.md} />} trailing="›" onClick={() => setView('history')}>
        이전 내용 복원
      </MenuItem>
      <MenuItem
        icon={<Trash2 size={ICON.md} />}
        danger
        onClick={() => {
          if (confirm('이 메모를 삭제할까요?')) {
            deleteMemo(memo.id)
            onDone()
          }
        }}
      >
        삭제
      </MenuItem>

      {busy && <p className="px-2 py-1.5 text-xs text-faint">{busy} 중…</p>}
    </div>
  )
}

function BackRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-1 flex h-[var(--h-md)] w-full items-center gap-1.5 border-b border-line px-2 text-base font-medium text-body"
    >
      <ChevronLeft size={ICON.md} className="text-muted" />
      {children}
    </button>
  )
}
