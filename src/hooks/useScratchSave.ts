import type { RefObject } from 'react'
import { useMemoStore } from '@/store/useMemoStore'
import { useScratchStore } from '@/store/useScratchStore'

// ============================================================
// 스크래치패드 초안을 실제 메모로 저장하는 공용 로직.
//  메인 화면 스크래치패드와 팝업 스크래치 창이 함께 씁니다.
// ============================================================

export function useScratchSave(draftId: string, editorRef: RefObject<HTMLDivElement>) {
  const scratch = useScratchStore((s) => s.getDraft(draftId))
  const resetDraft = useScratchStore((s) => s.resetDraft)
  const removeDraft = useScratchStore((s) => s.removeDraft)
  const design = useMemoStore((s) => s.getDesign(draftId))
  const drawing = useMemoStore((s) => s.getDrawing(draftId))
  const addMemo = useMemoStore((s) => s.addMemo)
  const updateMemo = useMemoStore((s) => s.updateMemo)
  const setStrokes = useMemoStore((s) => s.setStrokes)
  const select = useMemoStore((s) => s.select)

  /**
   * 실제 메모를 만들고 초안 내용을 옮깁니다.
   * @param keepDraftSlot 메인 화면처럼 이 id를 계속 재사용해야 하면 true(초안을 지우지 않고 비웁니다).
   *                      팝업처럼 저장 후 슬롯 자체가 필요 없어지면 false(초안을 완전히 지웁니다).
   */
  const saveAs = (projectId: string | null, keepDraftSlot: boolean) => {
    const content = editorRef.current?.innerHTML ?? scratch.content
    const memo = addMemo(projectId, design)
    updateMemo(memo.id, {
      title: scratch.title,
      content,
      label: scratch.label,
      tags: scratch.tags,
      reminder: scratch.reminder,
    })
    if (drawing.strokes.length > 0) setStrokes(memo.id, drawing.strokes)
    select(memo.id)
    setStrokes(draftId, [])
    if (keepDraftSlot) resetDraft(draftId)
    else removeDraft(draftId)
    return memo
  }

  return { scratch, design, drawing, saveAs }
}
