import { useState } from 'react'

// ============================================================
// "최근 사용 / 즐겨찾기" 공용 훅
//  글꼴·이모지·특수 이모티콘처럼 "클릭해서 삽입·적용하는 항목 모음"을
//  다루는 피커라면 전부 이 훅 하나로 최근 사용·즐겨찾기를 관리합니다.
//  나중에 새 피커(예: 스티커, GIF 등)를 추가할 때도 이 훅만 재사용하면
//  저장 방식이 자동으로 통일됩니다.
// ============================================================

function loadList(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}
const saveList = (key: string, list: string[]) => localStorage.setItem(key, JSON.stringify(list))

export function useRecentFavorite(namespace: string, recentLimit = 12) {
  const recentKey = `hyunlab-memo:recent-${namespace}`
  const favKey = `hyunlab-memo:fav-${namespace}`

  const [recent, setRecent] = useState<string[]>(() => loadList(recentKey))
  const [favorites, setFavorites] = useState<string[]>(() => loadList(favKey))

  /** 항목을 사용했을 때 호출 — 최근 사용 목록 맨 앞으로 올립니다. */
  const markUsed = (key: string) => {
    const next = [key, ...recent.filter((k) => k !== key)].slice(0, recentLimit)
    setRecent(next)
    saveList(recentKey, next)
  }

  const toggleFavorite = (key: string) => {
    const next = favorites.includes(key) ? favorites.filter((k) => k !== key) : [...favorites, key]
    setFavorites(next)
    saveList(favKey, next)
  }

  return { recent, favorites, markUsed, toggleFavorite }
}
