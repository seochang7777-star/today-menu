import math
from functools import wraps
from flask import session, flash, redirect, url_for

# ── 로그인 데코레이터 ─────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            flash('로그인이 필요합니다.', 'warning')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated

# ── 거리 계산 ─────────────────────────────────────────────────────────────────
def haversine(la1, lo1, la2, lo2):
    R = 6371000
    dL = math.radians(la2 - la1)
    dO = math.radians(lo2 - lo1)
    a  = math.sin(dL/2)**2 + math.cos(math.radians(la1))*math.cos(math.radians(la2))*math.sin(dO/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))