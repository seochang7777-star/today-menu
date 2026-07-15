// front/src/components/PartyNotification.jsx
// 파티 알림 - 참여/나가기 실시간 알림 + 시간 임박 알림
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import io from 'socket.io-client'
import { useAuth } from '../App'
import { getMyPage } from '../api/services'

export default function PartyNotification() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [show, setShow] = useState(false)
  const prevPartiesRef = useRef([])
  const timerRef = useRef(null)
  const socketRef = useRef(null)
  const notificationIdsRef = useRef(new Set())

  const headerIconLink = 'inline-flex min-w-[70px] flex-col items-center justify-center gap-[5px] border-0 bg-transparent text-[0.78rem] font-black leading-none text-[#161211]'

  const addNotifications = (notes) => {
    const filtered = notes.filter((note) => {
      if (notificationIdsRef.current.has(note.id)) return false
      notificationIdsRef.current.add(note.id)
      return true
    })

    if (filtered.length === 0) return
    setNotifications((prev) => [...filtered, ...prev].slice(0, 10))
    filtered.forEach((note) => showBrowserNotification(note.message))
  }

  const removeNotification = (id) => {
    notificationIdsRef.current.delete(id)
    setNotifications((prev) => prev.filter((note) => note.id !== id))
  }

  const clearNotifications = () => {
    notificationIdsRef.current.clear()
    setNotifications([])
  }

  const subscribePartyNotifications = async () => {
    if (!user || !socketRef.current) return
    try {
      socketRef.current.emit('subscribe_my_party_notifications', {
        user_id: user.user_id,
      })
    } catch {}
  }

  useEffect(() => {
    if (!user) return

    checkNotifications()
    timerRef.current = setInterval(checkNotifications, 60000)

    return () => clearInterval(timerRef.current)
  }, [user])

  useEffect(() => {
    if (!user) return

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })
    socketRef.current = socket

    const handlePartyMemberEvent = (type) => (data) => {
      const partyTitle = data.party_title || '파티'
      const nickname = data.nickname || '알 수 없음'
      const isMe = Number(data.user_id) === Number(user.user_id)
      const actionText = type === 'join' ? '참여했습니다' : '나갔습니다'
      const message = isMe
        ? `"${partyTitle}" 파티에 내가 ${actionText}.`
        : `"${partyTitle}" 파티에서 ${nickname}님이 ${actionText}.`
      const occurredAt = data.occurred_at || new Date().toISOString()

      addNotifications([{
        id: `${type}-${data.party_id}-${data.user_id}-${occurredAt}`,
        type,
        party_id: data.party_id,
        message,
        time: new Date(occurredAt),
      }])
    }

    const handleRefreshSubscription = () => subscribePartyNotifications()
    const handleLocalNotification = (event) => {
      if (!event.detail) return
      addNotifications([event.detail])
    }

    socket.on('connect', subscribePartyNotifications)
    socket.on('party_member_joined', handlePartyMemberEvent('join'))
    socket.on('party_member_left', handlePartyMemberEvent('leave'))
    window.addEventListener('party-membership-changed', handleRefreshSubscription)
    window.addEventListener('party-local-notification', handleLocalNotification)
    subscribePartyNotifications()

    return () => {
      window.removeEventListener('party-membership-changed', handleRefreshSubscription)
      window.removeEventListener('party-local-notification', handleLocalNotification)
      socket.off('connect', subscribePartyNotifications)
      socket.off('party_member_joined')
      socket.off('party_member_left')
      socket.disconnect()
      socketRef.current = null
    }
  }, [user])

  const checkNotifications = async () => {
    if (!user) return
    try {
      const data = await getMyPage()
      const parties = data.my_parties ?? []
      const newNotes = []

      // 첫 실행 시 기준값 저장 (알림 없이)
      if (prevPartiesRef.current.length === 0 && parties.length > 0) {
        prevPartiesRef.current = parties
        return
      }

      parties.forEach((party) => {
        if (party.meeting_time) {
          const meetingTime = new Date(party.meeting_time)
          const now = new Date()
          const diffMin = (meetingTime - now) / 60000

          // 10분 전 알림 (9~11분 사이)
          if (diffMin > 9 && diffMin <= 11) {
            const id = `soon10-${party.party_id}`
            if (!notificationIdsRef.current.has(id)) {
              newNotes.push({
                id,
                type: 'soon',
                message: `"${party.title}" 파티가 10분 후 시작됩니다! ⏰`,
                party_id: party.party_id,
                time: new Date(),
              })
            }
          }

          // 5분 전 알림 (4~6분 사이)
          if (diffMin > 4 && diffMin <= 6) {
            const id = `soon5-${party.party_id}`
            if (!notificationIdsRef.current.has(id)) {
              newNotes.push({
                id,
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
      addNotifications(newNotes)
    } catch {}
  }

  const showBrowserNotification = (message) => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification('🍽️ 오늘 뭐먹지?', { body: message, icon: '/img/icon/logo.png' })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification('🍽️ 오늘 뭐먹지?', { body: message, icon: '/img/icon/logo.png' })
        }
      })
    }
  }

  const getNotificationIcon = (type) => {
    if (type === 'join') return '👋'
    if (type === 'leave') return '🚪'
    return '⏰'
  }

  const unreadCount = notifications.length

  if (!user) return null

  return (
    <div style={{ position: 'relative' }}>
      {/* 알림 버튼 */}
      <button onClick={() => setShow(!show)} className={`${headerIconLink} group mr-1`}>
        <div style={{ position: 'relative' }}>
          <img src="/img/icon/alarm.png" className="h-[28px] w-[28px] object-contain" alt="alarm" onError={(e) => { e.target.style.display = 'none' }} />
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
        <span className="whitespace-nowrap text-[0.65rem] font-extrabold leading-none text-[#7D6A63] transition-colors group-hover:text-[var(--color-primary)]">
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
                <button onClick={clearNotifications}
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
              notifications.map((n) => (
                <div key={n.id} style={{ position: 'relative', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-white)' }}>
                  <Link to={`/party/${n.party_id}`}
                    onClick={() => setShow(false)}
                    style={{ display: 'block', padding: '12px 42px 12px 16px', textDecoration: 'none' }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1.1rem' }}>{getNotificationIcon(n.type)}</span>
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeNotification(n.id)
                    }}
                    aria-label="알림 삭제"
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 24, height: 24, borderRadius: '50%',
                      border: 'none', background: 'transparent',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: '.95rem', fontWeight: 900, lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
