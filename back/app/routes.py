from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
from app import db
from app.models import User, Restaurant, Party, PartyMember, ChatMessage, RecommendationLog, StatusEnum
import math

# ── 블루프린트 ────────────────────────────────────────────────────────────────
main_bp   = Blueprint('main',   __name__)
auth_bp   = Blueprint('auth',   __name__, url_prefix='/auth')
menu_bp   = Blueprint('menu',   __name__, url_prefix='/menu')
party_bp  = Blueprint('party',  __name__, url_prefix='/party')
mypage_bp = Blueprint('mypage', __name__, url_prefix='/mypage')
api_bp    = Blueprint('api',    __name__, url_prefix='/api')

CATEGORIES = ['전체','한식','일식','중식','양식','분식','치킨','피자','카페','술집']

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

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
@main_bp.route('/')
def index():
    trending     = Restaurant.query.order_by(Restaurant.avg_rating.desc()).limit(8).all()
    open_parties = Party.query.filter_by(status=StatusEnum.RECRUITING)\
                              .order_by(Party.created_at.desc()).limit(4).all()
    return render_template('main/index.html',
                           trending=trending,
                           open_parties=open_parties,
                           categories=CATEGORIES)

# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email    = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            session['user_id']  = user.user_id
            session['nickname'] = user.nickname
            session['role']     = user.role.value
            flash(f'{user.nickname}님, 환영합니다!', 'success')
            return redirect(url_for('main.index'))
        flash('이메일 또는 비밀번호가 올바르지 않습니다.', 'danger')
    return render_template('auth/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email     = request.form.get('email', '').strip()
        password  = request.form.get('password', '')
        password2 = request.form.get('password2', '')
        nickname  = request.form.get('nickname', '').strip()
        allergies = request.form.get('allergies', '')
        prefs     = request.form.getlist('preferences')

        if password != password2:
            flash('비밀번호가 일치하지 않습니다.', 'danger')
            return render_template('auth/register.html')
        if User.query.filter_by(email=email).first():
            flash('이미 사용 중인 이메일입니다.', 'danger')
            return render_template('auth/register.html')
        if User.query.filter_by(nickname=nickname).first():
            flash('이미 사용 중인 닉네임입니다.', 'danger')
            return render_template('auth/register.html')

        user = User(
            email=email,
            password=generate_password_hash(password),
            nickname=nickname,
            allergies=allergies,
            preferences={'likes': prefs, 'dislikes': []}
        )
        db.session.add(user)
        db.session.commit()
        flash('회원가입 완료! 로그인해주세요.', 'success')
        return redirect(url_for('auth.login'))
    return render_template('auth/register.html')

@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('로그아웃 되었습니다.', 'info')
    return redirect(url_for('main.index'))

# ══════════════════════════════════════════════════════════════════════════════
# MENU / RESTAURANT
# ══════════════════════════════════════════════════════════════════════════════
@menu_bp.route('/')
def index():
    cat        = request.args.get('cat', '전체')
    page       = request.args.get('page', 1, type=int)
    q          = request.args.get('q', '')
    query      = Restaurant.query
    if cat != '전체':
        query = query.filter_by(category=cat)
    if q:
        query = query.filter(Restaurant.name.ilike(f'%{q}%'))
    pagination  = query.paginate(page=page, per_page=12, error_out=False)
    return render_template('menu/index.html',
                           restaurants=pagination.items,
                           pagination=pagination,
                           categories=CATEGORIES,
                           active_cat=cat,
                           q=q)

@menu_bp.route('/<int:rest_id>')
def detail(rest_id):
    rest = Restaurant.query.get_or_404(rest_id)
    return render_template('menu/detail.html', rest=rest)

# ══════════════════════════════════════════════════════════════════════════════
# PARTY
# ══════════════════════════════════════════════════════════════════════════════
@party_bp.route('/')
def index():
    status  = request.args.get('status', 'RECRUITING')
    parties = Party.query.filter_by(status=StatusEnum[status])\
                         .order_by(Party.created_at.desc()).all()
    return render_template('party/index.html', parties=parties, status=status)

@party_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create():
    restaurants = Restaurant.query.all()
    if request.method == 'POST':
        title        = request.form.get('title')
        rest_id      = request.form.get('restaurant_id', type=int)
        meeting_time = request.form.get('meeting_time')
        max_people   = request.form.get('max_people', type=int)
        party = Party(
            title=title, restaurant_id=rest_id,
            host_id=session['user_id'],
            meeting_time=datetime.fromisoformat(meeting_time),
            max_people=max_people
        )
        db.session.add(party)
        db.session.flush()
        db.session.add(PartyMember(party_id=party.party_id,
                                   user_id=session['user_id'], is_host=True))
        db.session.commit()
        flash('파티가 생성되었습니다!', 'success')
        return redirect(url_for('party.detail', party_id=party.party_id))
    return render_template('party/create.html', restaurants=restaurants)

@party_bp.route('/<int:party_id>')
def detail(party_id):
    party    = Party.query.get_or_404(party_id)
    messages = ChatMessage.query.filter_by(party_id=party_id)\
                                .order_by(ChatMessage.created_at).all()
    user_id   = session.get('user_id')
    is_member = any(m.user_id == user_id for m in party.members) if user_id else False
    return render_template('party/detail.html',
                           party=party, messages=messages, is_member=is_member)

@party_bp.route('/<int:party_id>/join', methods=['POST'])
@login_required
def join(party_id):
    party = Party.query.get_or_404(party_id)
    if party.status != StatusEnum.RECRUITING:
        flash('모집이 마감된 파티입니다.', 'danger')
    elif len(party.members) >= party.max_people:
        flash('정원이 꽉 찼습니다.', 'danger')
    elif any(m.user_id == session['user_id'] for m in party.members):
        flash('이미 참여한 파티입니다.', 'info')
    else:
        db.session.add(PartyMember(party_id=party_id, user_id=session['user_id']))
        user = User.query.get(session['user_id'])
        user.manner_score = min(50.0, round(user.manner_score + 0.5, 1))
        db.session.commit()
        flash('파티에 참여했습니다! 매너온도 +0.5°', 'success')
    return redirect(url_for('party.detail', party_id=party_id))

@party_bp.route('/<int:party_id>/chat', methods=['POST'])
@login_required
def chat(party_id):
    content = request.form.get('content', '').strip()
    if content:
        db.session.add(ChatMessage(party_id=party_id,
                                   sender_id=session['user_id'],
                                   content=content))
        db.session.commit()
    return redirect(url_for('party.detail', party_id=party_id))

# ══════════════════════════════════════════════════════════════════════════════
# MYPAGE
# ══════════════════════════════════════════════════════════════════════════════
@mypage_bp.route('/')
@login_required
def index():
    user       = User.query.get_or_404(session['user_id'])
    my_parties = Party.query.join(PartyMember)\
                            .filter(PartyMember.user_id == user.user_id)\
                            .order_by(Party.created_at.desc()).limit(5).all()
    rec_logs   = RecommendationLog.query.filter_by(user_id=user.user_id)\
                                        .order_by(RecommendationLog.log_id.desc()).limit(10).all()
    liked_logs = [r for r in rec_logs if r.is_liked]
    return render_template('mypage/index.html',
                           user=user, my_parties=my_parties,
                           rec_logs=rec_logs, liked_logs=liked_logs)

@mypage_bp.route('/edit', methods=['GET', 'POST'])
@login_required
def edit():
    user = User.query.get_or_404(session['user_id'])
    if request.method == 'POST':
        nickname = request.form.get('nickname', '').strip()
        if nickname and nickname != user.nickname:
            if User.query.filter_by(nickname=nickname).first():
                flash('이미 사용 중인 닉네임입니다.', 'danger')
                return render_template('mypage/edit.html', user=user)
            user.nickname = nickname
            session['nickname'] = nickname
        user.allergies   = request.form.get('allergies', '')
        user.preferences = {
            'likes':    request.form.getlist('preferences'),
            'dislikes': request.form.getlist('dislikes')
        }
        db.session.commit()
        flash('프로필이 수정되었습니다.', 'success')
        return redirect(url_for('mypage.index'))
    return render_template('mypage/edit.html', user=user)

# ══════════════════════════════════════════════════════════════════════════════
# API (JSON)
# ══════════════════════════════════════════════════════════════════════════════
@api_bp.route('/nearby')
def nearby():
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    rad = request.args.get('radius', 500, type=int)
    if not lat or not lng:
        return jsonify({'error': 'lat/lng required'}), 400
    result = []
    for r in Restaurant.query.all():
        if r.latitude and r.longitude:
            dist = haversine(lat, lng, float(r.latitude), float(r.longitude))
            if dist <= rad:
                result.append({'id': r.restaurant_id, 'name': r.name,
                                'category': r.category, 'address': r.address,
                                'rating': r.avg_rating, 'dist': round(dist)})
    result.sort(key=lambda x: x['dist'])
    return jsonify(result)

@api_bp.route('/restaurants')
def restaurants():
    cat   = request.args.get('cat', '')
    q     = request.args.get('q', '')
    page  = request.args.get('page', 1, type=int)
    query = Restaurant.query
    if cat:   query = query.filter_by(category=cat)
    if q:     query = query.filter(Restaurant.name.ilike(f'%{q}%'))
    items = query.paginate(page=page, per_page=12, error_out=False)
    return jsonify({
        'items': [{'id': r.restaurant_id, 'name': r.name, 'category': r.category,
                   'address': r.address, 'rating': r.avg_rating} for r in items.items],
        'total': items.total, 'pages': items.pages, 'page': items.page
    })

@api_bp.route('/like/<int:log_id>', methods=['POST'])
def like_rec(log_id):
    log = RecommendationLog.query.get_or_404(log_id)
    log.is_liked = not log.is_liked
    db.session.commit()
    return jsonify({'liked': log.is_liked})
