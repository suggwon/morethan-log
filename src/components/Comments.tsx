// src/components/Comments.tsx
'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef } from 'react'
import { useTheme } from '@emotion/react'

const ReactCusdis = dynamic(
  () => import('react-cusdis').then((m) => m.ReactCusdis),
  { ssr: false }
)

type Props = { postId: string; title: string; url: string }

export default function Comments({ postId, title, url }: Props) {
  const appId = process.env.NEXT_PUBLIC_CUSDIS_APP_ID!
  const wrapRef = useRef<HTMLDivElement>(null)

  // 현재 사이트 테마(light/dark)
  const theme = useTheme()
  const scheme: 'light' | 'dark' = theme.scheme === 'dark' ? 'dark' : 'light'

  // 테마/포스트가 바뀌면 위젯을 강제 리마운트하기 위한 키
  const cusdisKey = useMemo(() => `${postId}-${scheme}`, [postId, scheme])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    // Cusdis가 로드되며 iframe이 생길 때까지 대기
    const tick = setInterval(() => {
      const iframe = wrap.querySelector<HTMLIFrameElement>('iframe')
      const body = iframe?.contentWindow?.document?.body
      if (iframe && body) {
        clearInterval(tick)

        // 높이 자동 조정: 내부 DOM 변경 시마다 실측 scrollHeight로 갱신
        const applyHeight = () => {
          try {
            const h = body.scrollHeight
            if (h) iframe.style.height = `${h}px`
          } catch { /* 접근 실패 시 무시 */ }
        }

        // 초기 1회 적용 + 변경 감지 시작
        applyHeight()
        const observer = new MutationObserver(applyHeight)
        observer.observe(body, { childList: true, subtree: true })

        // 클린업
        const cleanup = () => observer.disconnect()
        // useEffect cleanup에서 호출되도록 반환
        ;(cleanup as any).isCleanup = true
        return cleanup
      }
    }, 200)

    return () => clearInterval(tick)
    // 테마/포스트가 바뀌면 재실행하여 새 iframe에 옵저버 재부착
  }, [cusdisKey])

  return (
    <section
      ref={wrapRef}
      aria-label="댓글"
      style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
    >
      <ReactCusdis
        key={cusdisKey}              // ✅ 테마/포스트 변경 시 강제 리마운트
        lang="ko"
        attrs={{
          host: 'https://cusdis.com',
          appId,
          pageId: postId,
          pageTitle: title,
          pageUrl: url,
          theme: scheme,            // ✅ 현재 사이트 테마 전달
        }}
        style={{ width: '100%' }}
      />
    </section>
  )
}
