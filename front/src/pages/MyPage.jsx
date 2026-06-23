import { useState, useEffect } from 'react'
import { getMyPage, updateMe, toggleLike } from '../api/services'
import { useAuth } from '../App'

const PREF_LIST    = ['한식', '일식', '중식', '양식', '분식', '치킨', '피자', '카페', '채식', '해산물']
const DISLIKE_LIST = ['오이', '고수', '파', '마늘', '쑥갓', '가지', '당근', '콩']

export default function MyPage() {
  const { user: authUser, login: ctxLogin } = useAuth()

  const [data,    setData]    = useState(null)
  const [tab,     setTab]     = useState('activity')  // activity | wishlist
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState({})
  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState('')

  useEffect(() => {
    getMyPage()
      .then((d) => {
        setData(d)
        setForm({
          nickname:    d.user.nickname,
          allergies:   d.user.allergies ?? '',
          preferences: d.user.preferences?.likes    ?? [],
          dislikes:    d.user.preferences?.dislikes ?? [],
        })
      })
      .catch(() => {})
  }, [])

  const toggleChip = (val, key) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val],
    }))

  const handleSave = async () => {
    setSaving(true)
    setSaveErr('')
    try {
      const updated = await updateMe(form)
      setData((d) => ({ ...d, user: updated }))
      ctxLogin(updated)
      setEditing(false)
    } catch (err) {
      setSaveErr(err.response?.data?.message ?? '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleLike = async (logId) => {
    const res = await toggleLike(logId)
    setData((d) => ({
      ...d,
      rec_logs: d.rec_logs.map((r) =>
        r.log_id === logId ? { ...r, is_liked: res.liked } : r,
      ),
    }))
  }

  if (!data) return (
    <div className="flex justify-center items-center min-h-[60vh] text-gray-400 text-sm">
      로딩 중...
    </div>
  )

  const { user, my_parties, rec_logs } = data
  const likedLogs = rec_logs.filter((r) => r.is_liked)
  const mannerPct = Math.min((user.manner_score / 50) * 100, 100)
  const R    = 36
  const circ = 2 * Math.PI * R

  const chipCls = (active, color = 'gray') =>
    `px-3 py-1 rounded-full border text-sm font-semibold transition-colors cursor-pointer ${
      active
        ? color === 'red'
          ? 'bg-red-500 text-white border-red-500'
          : 'bg-gray-900 text-white border-gray-900'
        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
    }`

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-black">마이 메이지</h1>

      {/* ── 히어로 배너 ── */}
      <div className="bg-gray-900 text-white rounded-2xl p-6 flex items-start gap-5 flex-wrap">
        {/* 아바타 */}
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black flex-shrink-0">
          {user.nickname?.[0]}
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">MY PAGE</p>
          <h2 className="text-lg font-black mb-1">나의 메뉴 취향과 활동을 한눈에 확인하세요.</h2>
          <p className="text-sm text-white/50 mb-3">
            찜한 메뉴, 프로필, 추천 기록, 매칭 내역을 관리하는 마이페이지입니다.
          </p>
          <button
            onClick={() => { setEditing((e) => !e); setSaveErr('') }}
            className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            {editing ? '취소' : '프로필 수정 →'}
          </button>
        </div>

        {/* 매너온도 게이지 */}
        <div className="flex flex-col items-center flex-shrink-0">
          <svg width="90" height="90" viewBox="0 0 90 90" aria-label={`매너온도 ${user.manner_score}°C`}>
            <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
            <circle
              cx="45" cy="45" r={R} fill="none"
              stroke="#F6AD55" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - mannerPct / 100)}
              transform="rotate(-90 45 45)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
            <text x="45" y="44" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="16" fontWeight="800">
              {user.manner_score}
            </text>
            <text x="45" y="60" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="10">°C</text>
          </svg>
          <p className="text-[11px] text-white/40 mt-1">매너온도</p>
        </div>
      </div>

      {/* ── 통계 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['찜한 메뉴', `${likedLogs.length}개`],
          ['추천 활동', `${rec_logs.length}회`],
          ['매칭 기록', `${my_parties.length}건`],
          ['매너점수',  `${user.manner_score}°`],
        ].map(([label, val]) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-black">{val}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── 프로필 편집 ── */}
      {editing && (
        <div className="card p-6 space-y-5">
          <h3 className="font-bold">✏️ 프로필 수정</h3>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">닉네임</label>
            <input className="input" value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              알러지 / 제외 재료 <span className="text-gray-400 font-normal">(쉼표로 구분)</span>
            </label>
            <input className="input" placeholder="오이, 갑각류, 땅콩..."
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">좋아하는 음식</p>
            <div className="flex flex-wrap gap-2">
              {PREF_LIST.map((p) => (
                <button key={p} type="button" onClick={() => toggleChip(p, 'preferences')}
                  className={chipCls(form.preferences.includes(p))}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">싫어하는 음식</p>
            <div className="flex flex-wrap gap-2">
              {DISLIKE_LIST.map((d) => (
                <button key={d} type="button" onClick={() => toggleChip(d, 'dislikes')}
                  className={chipCls(form.dislikes.includes(d), 'red')}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {saveErr && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{saveErr}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={() => { setEditing(false); setSaveErr('') }} className="btn-secondary">
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 프로필 정보 + 내 파티 ── */}
      {!editing && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-bold mb-4">프로필</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="text-gray-400 w-20 flex-shrink-0">닉네임</dt>
                <dd className="font-semibold">{user.nickname}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-gray-400 w-20 flex-shrink-0">이메일</dt>
                <dd className="truncate">{user.email}</dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1.5">선호 메뉴</dt>
                <dd className="flex flex-wrap gap-1">
                  {(user.preferences?.likes ?? []).length > 0
                    ? (user.preferences.likes).map((p) => <span key={p} className="badge badge-info">{p}</span>)
                    : <span className="text-gray-300 text-xs">없음</span>
                  }
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1.5">알러지</dt>
                <dd className="flex flex-wrap gap-1">
                  {(user.allergies ?? '').split(',').filter(Boolean).length > 0
                    ? (user.allergies).split(',').filter(Boolean).map((a) => <span key={a} className="badge badge-warning">{a.trim()}</span>)
                    : <span className="text-gray-300 text-xs">없음</span>
                  }
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="font-bold mb-4">내 파티</h3>
            {my_parties.length === 0 ? (
              <p className="text-gray-400 text-sm">참여한 파티가 없습니다</p>
            ) : (
              <div className="space-y-2.5">
                {my_parties.map((p) => (
                  <div key={p.party_id} className="flex items-center gap-2 text-sm border-b border-gray-50 pb-2">
                    <span className={`badge ${p.status === 'RECRUITING' ? 'badge-success' : 'badge-muted'}`}>
                      {p.status === 'RECRUITING' ? '모집중' : p.status}
                    </span>
                    <span className="font-semibold truncate flex-1">{p.title}</span>
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      {p.member_count}/{p.max_people}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 탭: 활동내역 / 찜목록 ── */}
      <div>
        <div className="flex gap-0 border-b border-gray-200 mb-5">
          {[['activity', '활동 내역'], ['wishlist', '찜 목록']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors
                ${tab === key
                  ? 'border-red-500 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 활동 내역 */}
        {tab === 'activity' && (
          <div className="grid md:grid-cols-3 gap-3">
            {rec_logs.length === 0 ? (
              <p className="text-gray-400 text-sm col-span-full">활동 내역이 없습니다</p>
            ) : (
              rec_logs.map((log) => (
                <div key={log.log_id} className="card p-4 flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-xl flex-shrink-0">
                    🤖
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-400">AI 추천</p>
                    <p className="font-semibold text-sm truncate">{log.restaurant?.name ?? '식당'}</p>
                    <p className="text-xs text-gray-400">{log.restaurant?.category}</p>
                  </div>
                  <button
                    onClick={() => handleLike(log.log_id)}
                    className={`text-xl flex-shrink-0 transition-transform hover:scale-110 ${
                      log.is_liked ? 'text-red-500' : 'text-gray-200 hover:text-gray-400'
                    }`}
                    aria-label={log.is_liked ? '찜 취소' : '찜하기'}
                  >
                    ❤️
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 찜 목록 */}
        {tab === 'wishlist' && (
          <div className="grid md:grid-cols-3 gap-3">
            {likedLogs.length === 0 ? (
              <p className="text-gray-400 text-sm col-span-full">찜한 항목이 없습니다</p>
            ) : (
              likedLogs.map((log) => (
                <div key={log.log_id} className="card p-4 flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">🍴</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{log.restaurant?.name}</p>
                    <p className="text-xs text-gray-400">{log.restaurant?.category}</p>
                  </div>
                  <button onClick={() => handleLike(log.log_id)}
                    className="text-red-500 text-xl ml-auto flex-shrink-0 hover:scale-110 transition-transform">
                    ❤️
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
