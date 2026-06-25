import os
import math
import requests as req_lib
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash

from app import db
from app.models import (
    User, Restaurant, Party, PartyMember,
    ChatMessage, RecommendationLog, StatusEnum, RoleEnum
)

# ── 블루프린트 ────────────────────────────────────────────────────────────────
main_bp   = Blueprint('main',   __name__)
auth_bp   = Blueprint('auth',   __name__, url_prefix='/auth')
menu_bp   = Blueprint('menu',   __name__, url_prefix='/menu')
party_bp  = Blueprint('party',  __name__, url_prefix='/party')
mypage_bp = Blueprint('mypage', __name__, url_prefix='/mypage')
api_bp    = Blueprint('api',    __name__, url_prefix='/api')

CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '분식', '치킨', '피자', '카페', '술집']

# ── 유틸 ──────────────────────────────────────────────────────────────────────
def haversine(la1, lo1, la2, lo2):
    R  = 6371000
    dL = math.radians(la2 - la1)
    dO = math.radians(lo2 - lo1)
    a  = math.sin(dL/2)**2 + math.cos(math.radians(la1)) * math.cos(math.radians(la2)) * math.sin(dO/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def jwt_login_required(f):
    """JWT 전용 데코레이터 — React에서 호출하는 보호 라우트에 사용"""
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user = User.query.get(int(get_jwt_identity()))
        if not user or user.role != RoleEnum.ADMIN:
            return jsonify({'message': '관리자 권한이 필요합니다.'}), 403
        return f(*args, **kwargs)
    return decorated

# ── 직렬화 헬퍼 ───────────────────────────────────────────────────────────────
def serialize_user(u):
    prefs = u.preferences or {}
    return {
        'user_id':      u.user_id,
        'email':        u.email,
        'nickname':     u.nickname,
        'manner_score': u.manner_score,
        'preferences':  u.preferences,
        'allergies':    u.allergies,
        'role':         u.role.value,
        'created_at':   u.created_at.isoformat() if u.created_at else None,
        'saved_locations': prefs.get('saved_locations', []),  # [{name, address, lat, lng}]
    }

def serialize_restaurant(r):
    # models.py에 phone 컬럼이 별도로 존재
    phone = getattr(r, 'phone', None) or r.description or ''
    return {
        'id':          r.restaurant_id,
        'name':        r.name,
        'address':     r.address,
        'latitude':    float(r.latitude)  if r.latitude  else None,
        'longitude':   float(r.longitude) if r.longitude else None,
        'category':    r.category,
        'description': r.description,
        'phone':       phone,
        'avg_rating':  r.avg_rating,
    }

def serialize_party(p, viewer_id=None):
    return {
        'party_id':     p.party_id,
        'title':        p.title,
        'restaurant':   {'id': p.restaurant.restaurant_id, 'name': p.restaurant.name, 'category': p.restaurant.category} if p.restaurant else None,
        'host':         {'user_id': p.host.user_id, 'nickname': p.host.nickname} if p.host else None,
        'meeting_time': p.meeting_time.isoformat() if p.meeting_time else None,
        'max_people':   p.max_people,
        'member_count': len(p.members),
        'status':       p.status.value,
        'is_member':    any(m.user_id == viewer_id for m in p.members) if viewer_id else False,
        'created_at':   p.created_at.isoformat() if p.created_at else None,
    }

def serialize_message(m):
    return {
        'message_id': m.message_id,
        'content':    m.content,
        'sender':     {'user_id': m.sender.user_id, 'nickname': m.sender.nickname} if m.sender else None,
        'created_at': m.created_at.isoformat() if m.created_at else None,
    }

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
@main_bp.route('/')
def index():
    trending     = Restaurant.query.order_by(Restaurant.avg_rating.desc()).limit(8).all()
    open_parties = Party.query.filter_by(status=StatusEnum.RECRUITING)\
                              .order_by(Party.created_at.desc()).limit(4).all()
    return jsonify({
        'trending':     [serialize_restaurant(r) for r in trending],
        'open_parties': [serialize_party(p) for p in open_parties],
        'categories':   CATEGORIES,
    })

# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════
@auth_bp.route('/register', methods=['POST'])
def register():
    data      = request.get_json()
    email     = data.get('email', '').strip()
    password  = data.get('password', '')
    password2 = data.get('password2', '')
    nickname  = data.get('nickname', '').strip()
    allergies = data.get('allergies', '')
    prefs     = data.get('preferences', [])

    if not email or not password or not nickname:
        return jsonify({'message': '필수 항목을 입력해주세요.'}), 400
    if password != password2:
        return jsonify({'message': '비밀번호가 일치하지 않습니다.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'message': '이미 사용 중인 이메일입니다.'}), 409
    if User.query.filter_by(nickname=nickname).first():
        return jsonify({'message': '이미 사용 중인 닉네임입니다.'}), 409

    user = User(
        email=email,
        password=generate_password_hash(password),
        nickname=nickname,
        allergies=allergies,
        preferences={'likes': prefs, 'dislikes': []},
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': '회원가입이 완료되었습니다.'}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email', '').strip()
    password = data.get('password', '')
    user     = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({'message': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401

    access_token  = create_access_token(identity=str(user.user_id))
    refresh_token = create_refresh_token(identity=str(user.user_id))

    return jsonify({
        'access_token':  access_token,
        'refresh_token': refresh_token,
        **serialize_user(user),
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def token_refresh():
    new_token = create_access_token(identity=get_jwt_identity())
    return jsonify({'access_token': new_token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = User.query.get_or_404(int(get_jwt_identity()))
    return jsonify(serialize_user(user)), 200


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user     = User.query.get_or_404(int(get_jwt_identity()))
    data     = request.get_json()
    nickname = data.get('nickname', '').strip()

    if nickname and nickname != user.nickname:
        if User.query.filter_by(nickname=nickname).first():
            return jsonify({'message': '이미 사용 중인 닉네임입니다.'}), 409
        user.nickname = nickname

    user.allergies   = data.get('allergies', user.allergies)
    prefs = user.preferences or {}

    # saved_locations: [{name, address, lat, lng}, ...] 최대 3개
    new_locations = data.get('saved_locations', None)
    if new_locations is not None:
        # 최대 3개, 필수 필드 검증
        validated = []
        for loc in new_locations[:3]:
            if loc.get('name') and loc.get('lat') is not None and loc.get('lng') is not None:
                validated.append({
                    'name':    str(loc['name'])[:30],
                    'address': str(loc.get('address', ''))[:100],
                    'lat':     float(loc['lat']),
                    'lng':     float(loc['lng']),
                })
        prefs['saved_locations'] = validated

    user.preferences = {
        **prefs,
        'likes':    data.get('preferences', prefs.get('likes', [])),
        'dislikes': data.get('dislikes',    prefs.get('dislikes', [])),
    }
    db.session.commit()
    return jsonify(serialize_user(user)), 200


# ── 소셜 로그인 공통 헬퍼 ─────────────────────────────────────────────────────
def _social_login_or_register(email, nickname, provider):
    """
    소셜 계정으로 로그인 or 최초 가입 처리.
    email 이 이미 있으면 로그인, 없으면 자동 회원가입 후 로그인.
    """
    user = User.query.filter_by(email=email).first()
    if not user:
        # 닉네임 중복 방지
        base_nick = nickname or email.split('@')[0]
        nick      = base_nick
        suffix    = 1
        while User.query.filter_by(nickname=nick).first():
            nick = f"{base_nick}{suffix}"
            suffix += 1

        user = User(
            email=email,
            password=generate_password_hash(os.urandom(32).hex()),  # 랜덤 비번
            nickname=nick,
            allergies='',
            preferences={'likes': [], 'dislikes': [], 'provider': provider},
        )
        db.session.add(user)
        db.session.commit()

    access_token  = create_access_token(identity=str(user.user_id))
    refresh_token = create_refresh_token(identity=str(user.user_id))
    return access_token, refresh_token, user


# ── 카카오 로그인 ─────────────────────────────────────────────────────────────
@auth_bp.route('/kakao', methods=['POST'])
def kakao_login():
    """
    프론트에서 카카오 SDK로 받은 access_token 을 전달받아 유저 정보 조회 후 JWT 발급.
    Body: { "access_token": "kakao_oauth_token" }
    """
    kakao_token = request.get_json().get('access_token', '')
    if not kakao_token:
        return jsonify({'message': 'access_token required'}), 400

    # 카카오 유저 정보 조회
    resp = req_lib.get(
        'https://kapi.kakao.com/v2/user/me',
        headers={'Authorization': f'Bearer {kakao_token}'},
        timeout=5,
    )
    if resp.status_code != 200:
        return jsonify({'message': '카카오 인증 실패'}), 401

    info     = resp.json()
    kakao_id = info.get('id')
    profile  = info.get('kakao_account', {})
    email    = profile.get('email') or f'kakao_{kakao_id}@kakao.social'
    nickname = profile.get('profile', {}).get('nickname', '') or f'카카오유저{kakao_id}'

    access_token, refresh_token, user = _social_login_or_register(email, nickname, 'kakao')
    return jsonify({'access_token': access_token, 'refresh_token': refresh_token, **serialize_user(user)}), 200


# ── 네이버 로그인 ─────────────────────────────────────────────────────────────
@auth_bp.route('/naver', methods=['POST'])
def naver_login():
    """
    프론트에서 네이버 SDK로 받은 access_token 을 전달받아 유저 정보 조회 후 JWT 발급.
    Body: { "access_token": "naver_oauth_token" }
    """
    naver_token = request.get_json().get('access_token', '')
    if not naver_token:
        return jsonify({'message': 'access_token required'}), 400

    # 네이버 유저 정보 조회
    resp = req_lib.get(
        'https://openapi.naver.com/v1/nid/me',
        headers={'Authorization': f'Bearer {naver_token}'},
        timeout=5,
    )
    if resp.status_code != 200:
        return jsonify({'message': '네이버 인증 실패'}), 401

    info     = resp.json().get('response', {})
    naver_id = info.get('id', '')
    email    = info.get('email') or f'naver_{naver_id}@naver.social'
    nickname = info.get('nickname') or info.get('name', '') or f'네이버유저{naver_id}'

    access_token, refresh_token, user = _social_login_or_register(email, nickname, 'naver')
    return jsonify({'access_token': access_token, 'refresh_token': refresh_token, **serialize_user(user)}), 200

# ══════════════════════════════════════════════════════════════════════════════
# MENU / RESTAURANT
# ══════════════════════════════════════════════════════════════════════════════
@menu_bp.route('/', methods=['GET'])
def list_restaurants():
    cat        = request.args.get('cat', '전체')
    page       = request.args.get('page', 1, type=int)
    q          = request.args.get('q', '')
    query      = Restaurant.query
    if cat != '전체':
        query = query.filter_by(category=cat)
    if q:
        query = query.filter(Restaurant.name.ilike(f'%{q}%'))
    pagination = query.paginate(page=page, per_page=12, error_out=False)
    return jsonify({
        'items':    [serialize_restaurant(r) for r in pagination.items],
        'total':    pagination.total,
        'pages':    pagination.pages,
        'page':     pagination.page,
        'has_prev': pagination.has_prev,
        'has_next': pagination.has_next,
        'categories': CATEGORIES,
    })


@menu_bp.route('/<int:rest_id>', methods=['GET'])
def get_restaurant(rest_id):
    rest = Restaurant.query.get_or_404(rest_id)
    return jsonify(serialize_restaurant(rest))


@menu_bp.route('/', methods=['POST'])
@admin_required
def create_restaurant():
    data = request.get_json()
    rest = Restaurant(
        name=data.get('name', ''),
        address=data.get('address', ''),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        category=data.get('category', '기타'),
        description=data.get('description', ''),
        avg_rating=data.get('avg_rating', 0.0),
    )
    db.session.add(rest)
    db.session.commit()
    return jsonify(serialize_restaurant(rest)), 201


@menu_bp.route('/<int:rest_id>', methods=['DELETE'])
@admin_required
def delete_restaurant(rest_id):
    rest = Restaurant.query.get_or_404(rest_id)
    db.session.delete(rest)
    db.session.commit()
    return jsonify({'message': '삭제되었습니다.'}), 200



# ── 게임용 랜덤 메뉴 API ────────────────────────────────────────────────────
@menu_bp.route('/random', methods=['GET'])
def random_menus():
    """GET /menu/random?count=64&cat=전체 — 게임용 랜덤 메뉴"""
    count = min(request.args.get('count', 64, type=int), 128)
    cat   = request.args.get('cat', '전체')
    query = Restaurant.query
    if cat != '전체':
        query = query.filter_by(category=cat)
    from sqlalchemy import func
    items = query.order_by(func.random()).limit(count).all()
    return jsonify({'items': [serialize_restaurant(r) for r in items]}), 200

# ══════════════════════════════════════════════════════════════════════════════
# PARTY
# ══════════════════════════════════════════════════════════════════════════════
@party_bp.route('/', methods=['GET'])
def list_parties():
    status_str = request.args.get('status', 'RECRUITING')
    try:
        status = StatusEnum[status_str]
    except KeyError:
        status = StatusEnum.RECRUITING

    viewer_id = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from flask_jwt_extended import decode_token
            token_data = decode_token(auth_header.split(' ')[1])
            viewer_id  = int(token_data['sub'])
        except Exception:
            pass

    parties = Party.query.filter_by(status=status)\
                         .order_by(Party.created_at.desc()).all()
    return jsonify([serialize_party(p, viewer_id) for p in parties])



@party_bp.route('/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party    = Party.query.get_or_404(party_id)
    messages = ChatMessage.query.filter_by(party_id=party_id)\
                                .order_by(ChatMessage.created_at).all()
    viewer_id = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from flask_jwt_extended import decode_token
            token_data = decode_token(auth_header.split(' ')[1])
            viewer_id  = int(token_data['sub'])
        except Exception:
            pass
    data          = serialize_party(party, viewer_id)
    data['messages'] = [serialize_message(m) for m in messages]
    return jsonify(data)



@party_bp.route('/', methods=['POST'])
@jwt_login_required
def create_party():
    host_id  = int(get_jwt_identity())
    data     = request.get_json()
    title    = data.get('title', '').strip()
    rest_id  = data.get('restaurant_id')
    mt_str   = data.get('meeting_time', '')
    max_ppl  = data.get('max_people', 4)

    if not title or not rest_id or not mt_str:
        return jsonify({'message': '필수 항목을 입력해주세요.'}), 400

    party = Party(
        title=title,
        restaurant_id=rest_id,
        host_id=host_id,
        meeting_time=datetime.fromisoformat(mt_str),
        max_people=max_ppl,
    )
    db.session.add(party)
    db.session.flush()
    db.session.add(PartyMember(party_id=party.party_id, user_id=host_id, is_host=True))
    db.session.commit()
    return jsonify(serialize_party(party, host_id)), 201



@party_bp.route('/<int:party_id>/join', methods=['POST'])
@jwt_login_required
def join_party(party_id):
    user_id = int(get_jwt_identity())
    party   = Party.query.get_or_404(party_id)

    if party.status != StatusEnum.RECRUITING:
        return jsonify({'message': '모집이 마감된 파티입니다.'}), 400
    if len(party.members) >= party.max_people:
        return jsonify({'message': '정원이 꽉 찼습니다.'}), 400
    if any(m.user_id == user_id for m in party.members):
        return jsonify({'message': '이미 참여한 파티입니다.'}), 409

    db.session.add(PartyMember(party_id=party_id, user_id=user_id))
    user = User.query.get(user_id)
    user.manner_score = min(50.0, round(user.manner_score + 0.5, 1))
    db.session.commit()
    return jsonify({'message': '파티에 참여했습니다! 매너온도 +0.5°', 'manner_score': user.manner_score}), 200



@party_bp.route('/<int:party_id>/chat', methods=['POST'])
@jwt_login_required
def party_chat(party_id):
    sender_id = int(get_jwt_identity())
    content   = request.get_json().get('content', '').strip()
    if not content:
        return jsonify({'message': 'content is required'}), 400
    msg = ChatMessage(party_id=party_id, sender_id=sender_id, content=content)
    db.session.add(msg)
    db.session.commit()
    return jsonify(serialize_message(msg)), 201



@party_bp.route('/<int:party_id>/status', methods=['PATCH'])
@admin_required
def update_party_status(party_id):
    party  = Party.query.get_or_404(party_id)
    status = request.get_json().get('status', '')
    try:
        party.status = StatusEnum[status]
    except KeyError:
        return jsonify({'message': '유효하지 않은 상태값입니다.'}), 400
    db.session.commit()
    return jsonify(serialize_party(party))

# ══════════════════════════════════════════════════════════════════════════════
# MYPAGE
# ══════════════════════════════════════════════════════════════════════════════
@mypage_bp.route('/', methods=['GET'])
@jwt_login_required
def mypage():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    my_parties = Party.query.join(PartyMember)\
                            .filter(PartyMember.user_id == user_id)\
                            .order_by(Party.created_at.desc()).limit(5).all()
    rec_logs   = RecommendationLog.query.filter_by(user_id=user_id)\
                                        .order_by(RecommendationLog.log_id.desc()).limit(10).all()
    return jsonify({
        'user':       serialize_user(user),
        'my_parties': [serialize_party(p, user_id) for p in my_parties],
        'rec_logs': [
            {
                'log_id':     r.log_id,
                'is_liked':   r.is_liked,
                'restaurant': serialize_restaurant(r.restaurant) if r.restaurant else None,
                'input_context': r.input_context,
            }
            for r in rec_logs
        ],
    })

# ══════════════════════════════════════════════════════════════════════════════
# API — 위치 기반 / 어드민 / 챗봇
# ══════════════════════════════════════════════════════════════════════════════
@api_bp.route('/nearby', methods=['GET'])
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
                item = serialize_restaurant(r)
                item['dist'] = round(dist)
                result.append(item)
    result.sort(key=lambda x: x['dist'])
    return jsonify(result)


@api_bp.route('/like/<int:log_id>', methods=['POST'])
@jwt_login_required
def like_rec(log_id):
    log = RecommendationLog.query.get_or_404(log_id)
    log.is_liked = not log.is_liked
    db.session.commit()
    return jsonify({'liked': log.is_liked})


# ── 관리자 전용 ───────────────────────────────────────────────────────────────
@api_bp.route('/admin/users', methods=['GET'])
@admin_required
def admin_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([serialize_user(u) for u in users])


@api_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': '탈퇴 처리되었습니다.'}), 200


# ── OpenAI 챗봇 ───────────────────────────────────────────────────────────────
# ── 챗봇 공통: DB에서 유저 컨텍스트 빌드 ──────────────────────────────────────
def _build_user_context(user_id):
    """JWT 인증된 유저의 DB 정보를 챗봇 프롬프트용으로 조립"""
    user = User.query.get_or_404(user_id)

    # 알러지 / 기피 / 선호
    allergies = user.allergies or '없음'
    likes     = ', '.join((user.preferences or {}).get('likes',    [])) or '없음'
    dislikes  = ', '.join((user.preferences or {}).get('dislikes', [])) or '없음'

    # 유저가 찜(is_liked)한 식당 목록
    liked_logs = RecommendationLog.query.filter_by(user_id=user_id, is_liked=True).limit(20).all()
    liked_rests = []
    for log in liked_logs:
        r = Restaurant.query.get(log.recommended_restaurant_id)
        if r:
            liked_rests.append(f"{r.name}({r.category})")
    wishlist = ', '.join(liked_rests) or '없음'

    # 유저가 등록한 장소 (preferences.locations)
    saved_locs = ', '.join((user.preferences or {}).get('locations', [])) or '없음'

    return user, {
        'allergies':  allergies,
        'likes':      likes,
        'dislikes':   dislikes,
        'wishlist':   wishlist,
        'saved_locs': saved_locs,
    }


# ── /api/chat  ─  메뉴 추천 챗봇 (회원 전용) ────────────────────────────────
@api_bp.route('/chat', methods=['POST'])
@jwt_login_required
def chatbot():
    """
    Body:
      message  str   사용자 입력
      history  list  이전 대화 [{role, content}, ...]
      mode     str   'recommend' | 'qna'  (기본값 recommend)
      lat      float 현재 위치 위도 (optional)
      lng      float 현재 위치 경도 (optional)
    """
    from openai import OpenAI

    user_id = int(get_jwt_identity())
    body    = request.get_json(force=True)
    message = body.get('message', '').strip()
    history = body.get('history', [])
    mode      = body.get('mode', 'recommend')   # 'recommend' | 'qna'
    lat       = body.get('lat')
    lng       = body.get('lng')
    loc_index = body.get('loc_index')   # None | 0~2 → 저장된 장소 인덱스

    if not message:
        return jsonify({'error': 'message is required'}), 400

    user, ctx = _build_user_context(user_id)

    # ── loc_index 가 지정된 경우 저장된 장소 좌표 사용 ──────────────────────
    loc_name = None
    if loc_index is not None:
        saved = (user.preferences or {}).get('saved_locations', [])
        if 0 <= int(loc_index) < len(saved):
            chosen  = saved[int(loc_index)]
            lat     = chosen['lat']
            lng     = chosen['lng']
            loc_name = chosen['name']

    # ── 위치 기반 식당 조회 ──────────────────────────────────────────────────
    nearby_list = []
    if lat and lng:
        for r in Restaurant.query.all():
            if r.latitude and r.longitude:
                dist = haversine(lat, lng, float(r.latitude), float(r.longitude))
                if dist <= 1000:   # 1km 이내
                    nearby_list.append(f"{r.name}({r.category}, {round(dist)}m)")
        nearby_list = nearby_list[:15]

    nearby_str = ', '.join(nearby_list) if nearby_list else None
    if nearby_str and loc_name:
        nearby_str = f'[{loc_name} 근처] ' + nearby_str

    # ── 등록된 장소 주변 식당 (위치 미제공 시 fallback) ─────────────────────
    all_rests = [f"{r.name}({r.category})" for r in Restaurant.query.limit(30).all()]
    all_rests_str = ', '.join(all_rests) or '등록된 식당 없음'

    # ── System Prompt 분기 ──────────────────────────────────────────────────
    if mode == 'recommend':
        location_section = (
            f"- 현재 위치 반경 1km 식당: {nearby_str}"
            if nearby_str
            else f"- 전체 등록 식당: {all_rests_str}"
        )
        system_prompt = f"""당신은 '오늘의 메뉴' 앱의 AI 메뉴 추천 챗봇입니다.
아래 사용자 정보를 기반으로 메뉴 또는 식당을 추천해주세요.

[사용자 DB 정보]
- 닉네임: {user.nickname}
- 좋아하는 음식: {ctx['likes']}
- 싫어하는 음식(기피): {ctx['dislikes']}
- 알러지/제외 재료: {ctx['allergies']}
- 찜한 식당(즐겨찾기): {ctx['wishlist']}
- 등록된 장소: {ctx['saved_locs']}
{location_section}

[추천 규칙]
1. 알러지 재료가 포함된 음식은 절대 추천하지 마세요.
2. 기피 음식(싫어하는 음식)도 추천에서 제외하세요.
3. 찜한 식당과 좋아하는 음식을 우선 고려하세요.
4. 위치 기반 식당 목록이 있으면 해당 식당 위주로 추천하세요.
5. 위치 정보가 없으면 등록된 장소 기준으로 추천하고, 처음 대화 시 등록된 장소(집/직장 등)를 먼저 물어보세요.
6. 식당명·카테고리·거리 정보를 포함해 구체적으로 추천하세요.
7. 짧고 친근한 한국어로 답변하세요 (3~5문장 이내).
8. 여러 선택지를 줄 때는 번호 목록으로 제시하세요."""

    else:  # qna
        system_prompt = f"""당신은 '오늘의 메뉴' 앱의 고객지원 Q&A 챗봇입니다.
앱 사용법, 기능, 회원 정보 관련 질문에 친절하게 답변해주세요.

[현재 사용자]
- 닉네임: {user.nickname}
- 등록된 장소: {ctx['saved_locs']}
- 알러지 설정: {ctx['allergies']}

[앱 주요 기능]
- 메뉴 추천: AI가 취향 기반으로 추천
- 밥친구 매칭: 파티 생성 & 참여
- 게임창: 질문을 통한 메뉴 추천
- 마이페이지: 취향/찜목록/활동내역 관리
- 내 위치 기반 반경 내 식당 검색

짧고 친절한 한국어로 답변하세요."""

    messages_to_send = [{'role': 'system', 'content': system_prompt}]
    messages_to_send += history[-20:]
    messages_to_send.append({'role': 'user', 'content': message})

    try:
        client   = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=messages_to_send,
            max_tokens=600,
            temperature=0.7,
        )
        reply = response.choices[0].message.content

        # 추천 로그 저장 (식당 이름이 응답에 포함된 경우)
        if mode == 'recommend':
            for r in Restaurant.query.limit(30).all():
                if r.name in reply:
                    db.session.add(RecommendationLog(
                        user_id=user_id,
                        input_context={'message': message, 'mode': mode},
                        recommended_restaurant_id=r.restaurant_id,
                        is_liked=False,
                    ))
                    db.session.commit()
                    break

        return jsonify({'reply': reply}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ══════════════════════════════════════════════════════════════════════════════
# 카카오 로컬 API 연동
# ══════════════════════════════════════════════════════════════════════════════


@api_bp.route('/kakao/search', methods=['GET'])
def kakao_search():
    print(" DEBUG:", request.args)
    print(" DEBUG q:", request.args.get('q'))
    """
    카카오 로컬 API — 키워드로 음식점 검색
    GET /api/kakao/search?q=삼겹살&lat=37.5&lng=126.9&radius=1000
    """
    q      = request.args.get('q', '').strip()
    lat    = request.args.get('lat', type=float)
    lng    = request.args.get('lng', type=float)
    radius = request.args.get('radius', 1000, type=int)   # 미터

    if not q:
        return jsonify({'error': 'q(검색어) is required'}), 400

    kakao_key = os.environ.get('KAKAO_REST_API_KEY', '')
    if not kakao_key:
        return jsonify({'error': 'KAKAO_REST_API_KEY not set'}), 500

    params = {
        'query':    q,
        'category_group_code': 'FD6',   # 음식점
        'size':     15,
    }
    if lat and lng:
        params['x']      = lng        # 카카오는 x=경도, y=위도
        params['y']      = lat
        params['radius'] = radius

    try:
        resp = req_lib.get(
            'https://dapi.kakao.com/v2/local/search/keyword.json',
            headers={'Authorization': f'KakaoAK {kakao_key}'},
            params=params,
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()

        # 필요한 필드만 추출
        places = [
            {
                'id':           p['id'],
                'name':         p['place_name'],
                'category':     p['category_name'],
                'address':      p['road_address_name'] or p['address_name'],
                'phone':        p['phone'],
                'lat':          float(p['y']),
                'lng':          float(p['x']),
                'url':          p['place_url'],
                'dist':         int(p.get('distance') or 0),
            }
            for p in data.get('documents', [])
        ]
        return jsonify({'places': places, 'total': data['meta']['total_count']}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/kakao/register', methods=['POST'])
@jwt_login_required
def kakao_register_restaurant():
    """
    카카오 검색 결과 → DB에 식당 등록
    POST /api/kakao/register
    Body: { name, address, lat, lng, category, phone }
    """
    data = request.get_json(force=True)

    # 이미 같은 이름 + 주소로 등록된 식당인지 확인
    existing = Restaurant.query.filter_by(
        name=data.get('name'), address=data.get('address')
    ).first()

    if existing:
        return jsonify({'message': '이미 등록된 식당입니다.', 'id': existing.restaurant_id}), 200

    # 카테고리 정제 (카카오 카테고리는 "음식점 > 한식 > 삼겹살" 형태)
    raw_cat = data.get('category', '')
    category = raw_cat.split(' > ')[1] if ' > ' in raw_cat else raw_cat[:10]

    rest = Restaurant(
        name=data.get('name', ''),
        address=data.get('address', ''),
        latitude=data.get('lat'),
        longitude=data.get('lng'),
        category=category,
        phone=data.get('phone', ''),
        description='',
        avg_rating=0.0,
    )
    db.session.add(rest)
    db.session.commit()
    return jsonify({'message': '식당이 등록되었습니다.', 'id': rest.restaurant_id}), 201
