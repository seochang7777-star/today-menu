// front/src/components/PartyNotification.jsx
// 파티 알림 — 참여자 생겼을 때 + 시간 임박 알림
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { getMyPage } from '../api/services'

export default function PartyNotification() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [show, setShow] = useState(false)
  const prevPartiesRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (!user) return
    checkNotifications()
    // 1분마다 체크
    timerRef.current = setInterval(checkNotifications, 60000)
    return () => clearInterval(timerRef.current)
  }, [user])

  const checkNotifications = async () => {
    if (!user) return
    try {
      const data = await getMyPage()
      const parties = data.my_parties ?? []
      const newNotes = []

      parties.forEach(party => {
        // 이전 상태와 비교
        const prev = prevPartiesRef.current.find(p => p.party_id === party.party_id)

        // 1. 새 참여자 알림
        if (prev && party.member_count > prev.member_count) {
          newNotes.push({
            id: `join-${party.party_id}-${Date.now()}`,
            type: 'join',
            message: `"${party.title}" 파티에 새 참여자가 생겼습니다!`,
            party_id: party.party_id,
            time: new Date(),
          })
        }

        // 2. 시간 임박 알림 — 10분 전, 5분 전 각 1번씩
        if (party.meeting_time) {
          const meetingTime = new Date(party.meeting_time)
          const now = new Date()
          const diffMin = (meetingTime - now) / 60000

          // 10분 전 알림 (9~11분 사이)
          if (diffMin > 9 && diffMin <= 11) {
            const alreadyNotified = notifications.find(n => n.id === `soon10-${party.party_id}`)
            if (!alreadyNotified) {
              newNotes.push({
                id: `soon10-${party.party_id}`,
                type: 'soon',
                message: `"${party.title}" 파티가 10분 후 시작됩니다! ⏰`,
                party_id: party.party_id,
                time: new Date(),
              })
            }
          }

          // 5분 전 알림 (4~6분 사이)
          if (diffMin > 4 && diffMin <= 6) {
            const alreadyNotified = notifications.find(n => n.id === `soon5-${party.party_id}`)
            if (!alreadyNotified) {
              newNotes.push({
                id: `soon5-${party.party_id}`,
                type: 'soon',
                message: `"${party.title}" 파티가 5분 후 시작됩니다! 🍽️`,
                party_id: party.party_id,
                time: new Date(),
              })
            }
          }
        }
      })

      prevPartiesRef.current = parties

      if (newNotes.length > 0) {
        setNotifications(prev => [...newNotes, ...prev].slice(0, 10))
        // 브라우저 알림
        newNotes.forEach(n => showBrowserNotification(n.message))
      }
    } catch {}
  }

  const showBrowserNotification = (message) => {
    if (!("Notification" in window)) return
    if (Notification.permission === "granted") {
      new Notification("🍽️ 오늘 뭐먹지?", { body: message, icon: "/img/icon/logo.png" })
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          new Notification("🍽️ 오늘 뭐먹지?", { body: message, icon: "/img/icon/logo.png" })
        }
      })
    }
  }

  const unreadCount = notifications.length

  if (!user) return null

  return (
    <div style={{ position: 'relative' }}>
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setShow(!show)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          position: 'relative', padding: '4px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}
      >
        <div style={{ position: 'relative' }}>
          <img src="/img/icon/alarm.png" alt="알림" style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 0, right: 0,
              background: 'var(--color-danger)', color: '#fff',
              borderRadius: '50%', width: 16, height: 16,
              fontSize: '.65rem', fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </div>
        <span style={{ whiteSpace: 'nowrap', fontSize: '0.65rem', fontWeight: 800, lineHeight: 1, color: '#7D6A63' }}>
          파티알림
        </span>
      </button>

      {/* 알림 드롭다운 */}
      {show && (
        <>
          <div onClick={() => setShow(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: 'var(--bg-white)', border: '1px solid var(--border-color)',
            borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            width: 320, maxHeight: 400, overflowY: 'auto', zIndex: 99,
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 900, fontSize: '.92rem', display: 'flex', alignItems: 'center', gap: 6 }}><img src="/img/icon/alarm.png" alt="알림" style={{ width: 16, height: 16 }} />파티 알림</span>
              {notifications.length > 0 && (
                <button onClick={() => setNotifications([])}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  전체 지우기
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '.88rem' }}>
                새 알림이 없습니다.
              </div>
            ) : (
              notifications.map(n => (
                <Link key={n.id} to={`/party/${n.party_id}`}
                  onClick={() => setShow(false)}
                  style={{ display: 'block', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textDecoration: 'none', background: 'var(--bg-white)' }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.1rem' }}>{n.type === 'join' ? '👋' : '⏰'}</span>
                    <div>
                      <div style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                        {n.time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
