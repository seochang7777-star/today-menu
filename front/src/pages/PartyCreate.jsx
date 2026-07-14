import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { createParty, getRestaurants } from '../api/services'

const TIME_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const TIME_HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const TIME_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

export default function PartyCreate() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const [searchParams] = useSearchParams()

  // MenuDetail navigate('/party/create', { state: { restaurant: rest } }) 로 전달
  const preselected = location.state?.restaurant ?? null

  const [restaurants, setRestaurants] = useState([])
  const [form, setForm] = useState({
    title:         '',
    restaurant_id: preselected?.restaurant_id ?? preselected?.id ?? searchParams.get('rest') ?? '',
    meeting_time:  '',
    max_people:    4,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRestaurants({ cat: '전체', page: 1 })
      .then((d) => setRestaurants(d.items ?? []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.restaurant_id) {
      alert('식당을 선택해주세요.')
      return
    }
    if (!form.meeting_time) {
      alert('약속 일시를 선택해주세요.')
      return
    }

    if (new Date(form.meeting_time) <= new Date()) {
      alert('약속 일시는 현재 시간 이후로 설정해주세요.')

      return
    }
    setLoading(true)
    try {
      const data = await createParty({
        ...form,
        restaurant_id: Number(form.restaurant_id),
        max_people:    Number(form.max_people),
      })
      navigate(`/party/${data.party_id}`)
    } catch (err) {
      alert(err.response?.data?.message ?? '파티 생성에 실패했습니다.')
    } finally { setLoading(false) }
  }

  const getNowISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [meetingDate = '', meetingTime = ''] = form.meeting_time.split('T')
  const [meetingHour = '', meetingMinute = ''] = meetingTime.split(':')
  const meetingHourNumber = Number(meetingHour || 12)
  const meetingPeriod = meetingHourNumber >= 12 ? 'PM' : 'AM'
  const meetingHour12 = String(meetingHourNumber % 12 || 12).padStart(2, '0')
  const todayISO = getNowISO().slice(0, 10)
  const getNextSelectableTime = () => {
    const now = new Date()
    now.setSeconds(0, 0)
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5)
    const offset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16)
    return {
      date: localISOTime.slice(0, 10),
      hour: localISOTime.slice(11, 13),
      minute: localISOTime.slice(14, 16),
    }
  }

  const isPastMeetingTime = (date, hour, minute) => {
    if (!date || !hour || !minute) return false
    return new Date(`${date}T${hour}:${minute}`) < new Date()
  }

  const isHourDisabled = (hour) => {
    const date = meetingDate || todayISO
    if (date !== todayISO) return false
    return TIME_MINUTES.every((minute) => isPastMeetingTime(date, hour, minute))
  }

  const isMinuteDisabled = (minute, hour = meetingHour || '12') => {
    const date = meetingDate || todayISO
    if (date !== todayISO) return false
    return isPastMeetingTime(date, hour, minute)
  }

  const setMeetingDate = (date) => {
    const time = meetingTime || '12:00'
    const nextTime = `${date}T${time}`
    if (date === todayISO && new Date(nextTime) < new Date()) {
      const next = getNextSelectableTime()
      setForm({ ...form, meeting_time: `${next.date}T${next.hour}:${next.minute}` })
      return
    }
    setForm({ ...form, meeting_time: date ? nextTime : '' })
  }

  // 날짜 input은 기본적으로 달력 아이콘을 눌러야만 피커가 열리는데,
  // 창 어디를 눌러도 열리도록 showPicker()를 강제로 호출한다.
  const openDatePicker = (e) => {
    try {
      e.currentTarget.showPicker?.()
    } catch (err) {
      // showPicker 미지원 브라우저는 기본 동작(포커스)으로 자연스럽게 폴백
    }
  }

  const setMeetingTimePart = (nextHour = meetingHour || '12', nextMinute = meetingMinute || '00') => {
    const date = meetingDate || todayISO
    if (isPastMeetingTime(date, nextHour, nextMinute)) {
      const next = getNextSelectableTime()
      setForm({ ...form, meeting_time: `${next.date}T${next.hour}:${next.minute}` })
      return
    }
    setForm({ ...form, meeting_time: `${date}T${nextHour}:${nextMinute}` })
  }

  const setMeetingTime12Part = (
    nextPeriod = meetingPeriod,
    nextHour12 = meetingHour12,
    nextMinute = meetingMinute || '00'
  ) => {
    const hourNumber = Number(nextHour12)
    const hour24 = nextPeriod === 'PM'
      ? (hourNumber === 12 ? 12 : hourNumber + 12)
      : (hourNumber === 12 ? 0 : hourNumber)
    setMeetingTimePart(String(hour24).padStart(2, '0'), nextMinute)
  }

  // 선택한 식당명 표시
  const selectedName = preselected?.name ||
    restaurants.find(r => String(r.restaurant_id ?? r.id) === String(form.restaurant_id))?.name ||
    '선택된 식당 없음'

  return (
    <div className="mx-auto flex w-full max-w-[1110px] justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => navigate('/party')}
          className="ml-39 absolute left-0 top-0 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f0ded4] bg-white shadow-sm transition hover:-translate-x-0.5 hover:shadow-md sm:left-2 max-[540px]:ml-0 max-[540px]:left-0 max-[540px]:top-0"
          aria-label="목록으로 이동"
        >
          <img
            src="/img/icon/arrow_left.png"
            alt="목록으로"
            className="h-9 w-9 object-contain"
          />
        </button>

        <div className="mb-7 text-center">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FFF5F5] shadow-sm">
              <img
                src="/img/icon/logo.png"
                alt="오늘 뭐먹지 로고"
                className="h-8 w-8 object-contain"
              />
            </span>
            <h1 className="text-[1.65rem] font-black text-[var(--text-primary)] sm:text-[2rem]">
              밥친구 파티 만들기
            </h1>
          </div>
          <p className="mt-2 text-[0.9rem] font-semibold text-[var(--text-muted)]">
            함께 먹을 밥친구를 찾기 위한 파티를 만들어보세요!
          </p>
        </div>

        <div className="mx-auto w-full max-w-[720px] rounded-[24px] border border-[var(--border-color)] bg-white p-5 shadow-[0_18px_45px_rgba(42,29,26,0.10)] sm:p-8 lg:p-10">
          <form onSubmit={handleSubmit}>
            <div className="mb-9">
              <label className="mb-4 flex items-center gap-4 text-xl font-extrabold text-[var(--text-primary)]">
                <span className="grid h-7 w-7 shrink-0 place-items-center text-xl text-[var(--color-primary)]">
                  <img className="w-10 h-8" src='/img/icon/speech-bubble.png' alt='파티제목' />
                </span>
                <span>파티 제목 *</span>
              </label>
              <div className="pl-0 sm:pl-11">
                <input
                  type="text"
                  className="h-14 w-full rounded-2xl border border-[var(--border-color)] bg-white px-5 text-base font-semibold text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                  placeholder="예: 강남역 근처 삼겹살 같이 먹어요!"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>

            <div className="mb-9">
              <label className="mb-4 flex items-center gap-4 text-xl font-extrabold text-[var(--text-primary)]">
                <span className="grid h-7 w-7 shrink-0 place-items-center text-xl text-[var(--color-primary)]">
                  <img className="w-10 h-9" src='/img/icon/restaurant.png' alt='식당선택' />
                </span>
                <span>식당 선택 *</span>
              </label>
              <div className="pl-0 sm:pl-11">
                <div
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-white px-5 py-3 text-base font-semibold outline-none transition focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                  style={{ color: form.restaurant_id ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  <span className="min-w-0 flex-1 truncate">{selectedName}</span>
                  {!preselected && (
                    <button
                      type="button"
                      onClick={() => navigate('/menu')}
                      className="inline-flex h-9 flex-shrink-0 items-center justify-center rounded-full border border-[#FAD0D1] bg-[#FEEDEC] px-4 text-sm font-extrabold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                    >
                      식당 선택
                    </button>
                  )}
                </div>
                {!form.restaurant_id && (
                  <div className="mt-2 text-sm font-semibold text-[var(--color-danger)]">
                    메뉴 페이지에서 식당을 선택한 뒤 파티를 만들어주세요.
                  </div>
                )}
              </div>
            </div>

            <input type="hidden" value={form.restaurant_id} />

            <div className="mb-9">
              <label className="mb-4 flex items-center gap-4 text-xl font-extrabold text-[var(--text-primary)]">
                <span className="grid h-7 w-7 shrink-0 place-items-center text-xl text-[var(--color-primary)]">
                  <img className="w-10 h-8" src='/img/icon/calendar.png' alt='약속일시' />
                </span>
                <span>약속 일시 *</span>
              </label>
              <div className="w-full min-w-0 pl-0 sm:pl-11">
                <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_92px_74px_74px] gap-2 max-[540px]:hidden">
                  <input
                    type="date"
                    className="h-14 min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    value={meetingDate}
                    min={todayISO}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    onClick={openDatePicker}
                  />
                  <select
                    className="h-14 min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-2 text-center text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    value={meetingPeriod}
                    onChange={(e) => setMeetingTime12Part(e.target.value, meetingHour12, meetingMinute || '00')}
                  >
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                  <select
                    className="h-14 min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-2 text-center text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    value={meetingHour12}
                    onChange={(e) => setMeetingTime12Part(meetingPeriod, e.target.value, meetingMinute || '00')}
                  >
                    {TIME_HOURS_12.map((hour) => {
                      const hourNumber = Number(hour)
                      const hour24 = meetingPeriod === 'PM'
                        ? (hourNumber === 12 ? 12 : hourNumber + 12)
                        : (hourNumber === 12 ? 0 : hourNumber)
                      const hourValue = String(hour24).padStart(2, '0')
                      return (
                        <option key={hour} value={hour} disabled={isHourDisabled(hourValue)}>{hour}</option>
                      )
                    })}
                  </select>
                  <select
                    className="h-14 min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-2 text-center text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    value={meetingMinute}
                    onChange={(e) => setMeetingTime12Part(meetingPeriod, meetingHour12, e.target.value)}
                  >
                    <option value="" disabled>분</option>
                    {TIME_MINUTES.map((minute) => (
                      <option key={minute} value={minute} disabled={isMinuteDisabled(minute)}>{minute}</option>
                    ))}
                  </select>
                </div>
                <div className="hidden w-full min-w-0 grid-cols-[minmax(0,1fr)_74px_74px] gap-2 max-[540px]:grid">
                  <input
                    type="date"
                    className="h-14 min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    value={meetingDate}
                    min={todayISO}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    onClick={openDatePicker}
                  />
                  <select
                    className="h-14 min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-2 text-center text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    value={meetingHour}
                    onChange={(e) => setMeetingTimePart(e.target.value, meetingMinute || '00')}
                  >
                    <option value="" disabled>시</option>
                    {TIME_HOURS.map((hour) => (
                      <option key={hour} value={hour} disabled={isHourDisabled(hour)}>{hour}</option>
                    ))}
                  </select>
                  <select
                    className="h-14 min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-2 text-center text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    value={meetingMinute}
                    onChange={(e) => setMeetingTimePart(meetingHour || '12', e.target.value)}
                  >
                    <option value="" disabled>분</option>
                    {TIME_MINUTES.map((minute) => (
                      <option key={minute} value={minute} disabled={isMinuteDisabled(minute)}>{minute}</option>
                    ))}
                  </select>
                </div>
              </div>
              {form.meeting_time && new Date(form.meeting_time) <= new Date() && (
                <p className="mt-2 text-sm font-semibold text-[var(--color-danger)]">
                  약속 일시는 현재 시간 이후로 선택해주세요.
                </p>
              )}
            </div>

            <div className="mb-10">
              <label className="mb-4 flex items-center gap-4 text-xl font-extrabold text-[var(--text-primary)]">
                <span className="grid h-7 w-7 shrink-0 place-items-center text-xl text-[var(--color-primary)]">
                  <svg
                        viewBox="0 0 24 24"
                        className="h-8 w-8 fill-[#F46C6F]"
                      >
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                      </svg>
                </span>
                <span>최대 인원 *</span>
              </label>
              <div className="pl-0 sm:pl-11">
                <input
                  type="number"
                  className="h-14 w-full rounded-2xl border border-[var(--border-color)] bg-white px-5 text-base font-semibold text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                  min={2} max={10}
                  required
                  value={form.max_people}
                  onChange={(e) => setForm({ ...form, max_people: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[18px] bg-[linear-gradient(135deg,var(--color-primary),#F5535D)] px-6 py-4 text-lg font-extrabold text-white shadow-[0_12px_24px_rgba(244,108,111,0.24)] transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '생성 중...' : '파티 생성하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
