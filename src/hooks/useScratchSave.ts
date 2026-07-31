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
    setStrokes(draftId, [])
    if (keepDraftSlot) {
      // 메인 화면 스크래치패드: 저장한 메모를 자동으로 열어 보여주지 않습니다.
      // 오른쪽은 계속 빈 스크래치패드로 남아 바로 다음 메모를 쓸 수 있고,
      // 방금 저장한 메모는 왼쪽 프로젝트 목록에서 직접 눌러야 열립니다.
      // (addMemo가 내부적으로 새 메모를 자동 선택하므로, 그 선택을 되돌립니다)
      select(null)
      resetDraft(draftId)
    } else {
      // 팝업(스크래치) 창: 저장하면 창 자체를 닫으므로 그대로 선택해 둡니다.
      select(memo.id)
      removeDraft(draftId)
    }
    return memo
  }

  return { scratch, design, drawing, saveAs }
}
