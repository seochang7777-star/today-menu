import os
import math
import requests as req_lib
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash


from app import db
from app.models import (
    User, Restaurant, Party, PartyMember,
    ChatMessage, RecommendationLog, MannerVote, StatusEnum, RoleEnum
)

# ── 블루프린트 ────────────────────────────────────────────────────────────────
main_bp   = Blueprint('main',   __name__)
auth_bp   = Blueprint('auth',   __name__, url_prefix='/api/auth')
menu_bp   = Blueprint('menu',   __name__, url_prefix='/api/menu')
party_bp  = Blueprint('party',  __name__, url_prefix='/api/party')
mypage_bp = Blueprint('mypage', __name__, url_prefix='/api/mypage')
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
        'gender':       u.gender or '미설정',   # ← 추가
        'address':      u.address or '',         # ← 추가
        'role':         u.role.value,
        'created_at':   u.created_at.isoformat() if u.created_at else None,
        'saved_locations': prefs.get('saved_locations', []),
    }

def serialize_restaurant(r, like_count=None):
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
        'like_count':  like_count if like_count is not None else 0,
    }

def serialize_party(p, viewer_id=None):
    return {
        'party_id':     p.party_id,
        'title':        p.title,
        'restaurant':   {
            'id':       p.restaurant.restaurant_id,
            'name':     p.restaurant.name,
            'category': p.restaurant.category,
            'address':  p.restaurant.address,   # PartyDetail 사이드에서 사용
        } if p.restaurant else None,
        'host':         {'user_id': p.host.user_id, 'nickname': p.host.nickname} if p.host else None,
        'meeting_time': p.meeting_time.isoformat() if p.meeting_time else None,
        'max_people':   p.max_people,
        'member_count': len(p.members),
        'status':       p.status.value,
        'is_member':    any(m.user_id == viewer_id for m in p.members) if viewer_id else False,
        'created_at':   p.created_at.isoformat() if p.created_at else None,
        # PartyDetail 참여자 목록에서 사용
        'members': [
            {
                'user': {'user_id': m.user.user_id, 'nickname': m.user.nickname} if m.user else None,
                'is_host': m.is_host,
                'joined_at': m.joined_at.isoformat() if m.joined_at else None,
            }
            for m in p.members
        ],
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
    from sqlalchemy import func as sa_func
    liked_sub = (
        db.session.query(
            RecommendationLog.recommended_restaurant_id,
            sa_func.count(RecommendationLog.log_id).label('like_count')
        )
        .filter(RecommendationLog.is_liked == True)
        .group_by(RecommendationLog.recommended_restaurant_id)
        .subquery()
    )
    trending = (
        Restaurant.query
        .outerjoin(liked_sub, Restaurant.restaurant_id == liked_sub.c.recommended_restaurant_id)
        .order_by(sa_func.coalesce(liked_sub.c.like_count, 0).desc())
        .limit(8).all()
    )
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
    
    # 💡 [필드명 통일] 프론트엔드와 맞춰 likes와 dislikes를 명확하게 수신합니다.
    likes     = data.get('likes', [])
    dislikes  = data.get('dislikes', [])

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
        preferences={'likes': likes, 'dislikes': dislikes},
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
    user.gender    = data.get('gender',    user.gender)    # ← 추가
    user.address   = data.get('address',   user.address)   # ← 추가
    prefs = user.preferences or {}

    new_locations = data.get('saved_locations', None)
    if new_locations is not None:
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

    # 💡 [필드명 통일] 프론트엔드 payload 구조와 데이터베이스 JSON 구조 명확히 동치
    user.preferences = {
        **prefs,
        'likes':    data.get('likes', prefs.get('likes', [])),
        'dislikes': data.get('dislikes', prefs.get('dislikes', [])),
    }
    db.session.commit()
    return jsonify(serialize_user(user)), 200


# ── 소셜 로그인 공통 헬퍼 ─────────────────────────────────────────────────────
def _social_login_or_register(email, nickname, provider):
    user = User.query.filter_by(email=email).first()
    if not user:
        base_nick = nickname or email.split('@')[0]
        nick      = base_nick
        suffix    = 1
        while User.query.filter_by(nickname=nick).first():
            nick = f"{base_nick}{suffix}"
            suffix += 1

        user = User(
            email=email,
            password=generate_password_hash(os.urandom(32).hex()),
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
    kakao_token = request.get_json().get('access_token', '')
    if not kakao_token:
        return jsonify({'message': 'access_token required'}), 400

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
    naver_token = request.get_json().get('access_token', '')
    if not naver_token:
        return jsonify({'message': 'access_token required'}), 400

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
    sort  = request.args.get('sort', 'rating')
    query = Restaurant.query
    if cat != '전체':
        query = query.filter_by(category=cat)
    if q:
        query = query.filter(Restaurant.name.ilike(f'%{q}%'))
    if sort == 'likes':
        from sqlalchemy import func as _sf
        _ls = (db.session.query(
            RecommendationLog.recommended_restaurant_id,
            _sf.count(RecommendationLog.log_id).label('lc'))
            .filter(RecommendationLog.is_liked == True)
            .group_by(RecommendationLog.recommended_restaurant_id).subquery())
        query = query.outerjoin(
            _ls, Restaurant.restaurant_id == _ls.c.recommended_restaurant_id
        ).order_by(_sf.coalesce(_ls.c.lc, 0).desc())
    else:
        query = query.order_by(Restaurant.avg_rating.desc())
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


@menu_bp.route('/random', methods=['GET'])
def random_menus():
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

    parties = Party.query.filter_by(status=status).order_by(Party.created_at.desc()).all()
    
    for p in parties:
        p.refresh_status()
        
    return jsonify([serialize_party(p, viewer_id) for p in parties])


@party_bp.route('/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party    = Party.query.get_or_404(party_id)
    party.refresh_status()
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

@party_bp.route('/<int:party_id>/close', methods=['PATCH'])
@jwt_login_required
def manual_close_party(party_id):
    user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    
    if party.host_id != user_id:
        return jsonify({'message': '호스트만 마감할 수 있습니다.'}), 403
    
    if party.status != StatusEnum.RECRUITING:
        return jsonify({'message': '이미 마감된 파티입니다.'}), 400
        
    party.status = StatusEnum.CLOSED
    db.session.commit()
    return jsonify(serialize_party(party, user_id)), 200

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

# 파티 강퇴 (Host 전용)
@party_bp.route('/<int:party_id>/kick/<int:target_user_id>', methods=['DELETE'])
@jwt_login_required
def kick_member(party_id, target_user_id):
    current_user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    
    if party.host_id != current_user_id:
        return jsonify({'message': '호스트만 강퇴할 수 있습니다.'}), 403
    
    member = PartyMember.query.filter_by(party_id=party_id, user_id=target_user_id, is_host=False).first_or_404()
    db.session.delete(member)
    db.session.commit()
    return jsonify({'message': '강퇴되었습니다.'}), 200

# 파티 모임 종료 (Host 전용)
@party_bp.route('/<int:party_id>/finish', methods=['PATCH'])
@jwt_login_required
def finish_party(party_id):
    current_user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    
    if party.host_id != current_user_id:
        return jsonify({'message': '호스트만 종료할 수 있습니다.'}), 403
        
    party.status = StatusEnum.COMPLETED
    db.session.commit()
    return jsonify({'message': '모임이 종료되었습니다.'}), 200

# 불량 유저 신고 (공통)
@party_bp.route('/<int:party_id>/report', methods=['POST'])
@jwt_login_required
def report_user(party_id):
    reporter_id = int(get_jwt_identity())
    data = request.get_json()
    target_id = data.get('target_id')
    reason = data.get('reason')
    
    # 신고 로직 (Report 모델 저장)
    new_report = Report(reporter_id=reporter_id, target_id=target_id, reason=reason, party_id=party_id)
    db.session.add(new_report)
    db.session.commit()
    return jsonify({'message': '신고가 접수되었습니다.'}), 201

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

# 💡 [코드 최적화] 하버사인 전체 스캔 연산을 극복하기 위한 Bounding Box(Mbr) 1차 쿼리 적용 완료
@api_bp.route('/nearby', methods=['GET'])
def nearby():
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    rad = request.args.get('radius', 500, type=int)
    if not lat or not lng:
        return jsonify({'error': 'lat/lng required'}), 400
        
    lat_buffer = (rad / 1000.0) * 0.0091
    lng_buffer = (rad / 1000.0) * 0.0113

    filtered_restaurants = Restaurant.query.filter(
        Restaurant.latitude.between(lat - lat_buffer, lat + lat_buffer),
        Restaurant.longitude.between(lng - lng_buffer, lng + lng_buffer)
    ).all()

    result = []

    for r in filtered_restaurants:
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
def _build_user_context(user_id):
    user = User.query.get_or_404(user_id)
    user_prefs = user.preferences or {}

    allergies = user.allergies or '없음'
    
    # 💡 [필드명 통일] DB JSON 컬럼에서 likes, dislikes 배열을 바인딩
    likes     = ', '.join(user_prefs.get('likes', [])) or '없음'
    dislikes  = ', '.join(user_prefs.get('dislikes', [])) or '없음'

    liked_logs = RecommendationLog.query.filter_by(user_id=user_id, is_liked=True).limit(20).all()
    liked_rests = []
    for log in liked_logs:
        r = Restaurant.query.get(log.recommended_restaurant_id)
        if r:
            liked_rests.append(f"{r.name}({r.category})")
    wishlist = ', '.join(liked_rests) or '없음'


    saved_locs = ', '.join([loc.get('name', '') for loc in user_prefs.get('saved_locations', [])]) or '없음'


    return user, {
        'allergies':  allergies,
        'likes':      likes,
        'dislikes':   dislikes,
        'wishlist':   wishlist,
        'saved_locs': saved_locs,
    }


@api_bp.route('/chat', methods=['POST'])
@jwt_login_required
def chatbot():
    from openai import OpenAI

    user_id = int(get_jwt_identity())
    body    = request.get_json(force=True)
    message = body.get('message', '').strip()
    history = body.get('history', [])
    mode      = body.get('mode', 'recommend')
    lat       = body.get('lat')
    lng       = body.get('lng')
    loc_index = body.get('loc_index')

    if not message:
        return jsonify({'error': 'message is required'}), 400

    user, ctx = _build_user_context(user_id)

    loc_name = None
    if loc_index is not None:
        saved = (user.preferences or {}).get('saved_locations', [])
        if 0 <= int(loc_index) < len(saved):
            chosen  = saved[int(loc_index)]
            lat     = chosen['lat']
            lng     = chosen['lng']
            loc_name = chosen['name']

    nearby_list = []
    if lat and lng:

        lat_buffer = 0.0091 # 대략 1km 마진
        lng_buffer = 0.0113
        filtered_for_chat = Restaurant.query.filter(
            Restaurant.latitude.between(lat - lat_buffer, lat + lat_buffer),
            Restaurant.longitude.between(lng - lng_buffer, lng + lng_buffer)
        ).all()
        for r in filtered_for_chat:
            if r.latitude and r.longitude:
                dist = haversine(lat, lng, float(r.latitude), float(r.longitude))
                if dist <= 1000:
                    nearby_list.append(f"{r.name}({r.category}, {round(dist)}m)")

        nearby_list = nearby_list[:15]

    nearby_str = ', '.join(nearby_list) if nearby_list else None
    if nearby_str and loc_name:
        nearby_str = f'[{loc_name} 근처] ' + nearby_str

    all_rests = [f"{r.name}({r.category})" for r in Restaurant.query.limit(30).all()]
    all_rests_str = ', '.join(all_rests) or '등록된 식당 없음'

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

    else:
        # ── Q&A용 DB 데이터 조회 ──────────────────────────────────────────────
        # 찜 목록 (최대 5개)
        liked_names = ', '.join([
            Restaurant.query.get(l.recommended_restaurant_id).name
            for l in RecommendationLog.query.filter_by(user_id=user_id, is_liked=True).limit(5).all()
            if Restaurant.query.get(l.recommended_restaurant_id)
        ]) or '없음'

        # 참여 중인 파티 (최대 3개)
        from app.models import PartyMember, Party
        my_parties = db.session.query(Party).join(
            PartyMember, Party.party_id == PartyMember.party_id
        ).filter(PartyMember.user_id == user_id).order_by(
            Party.created_at.desc()
        ).limit(3).all()
        party_info = ', '.join([
            f"{p.title}({p.status.value})"
            for p in my_parties
        ]) or '없음'

        # 매너온도
        manner = user.manner_score

        system_prompt = f"""당신은 '오늘의 메뉴' 앱의 Q&A 안내 챗봇입니다.
아래 사용자 정보와 앱 가이드를 바탕으로 친절하고 구체적으로 안내해주세요.

[현재 사용자 DB 정보]
- 닉네임: {user.nickname}
- 매너온도: {manner}°C
- 알러지/기피 재료: {ctx['allergies']}
- 좋아하는 음식: {ctx['likes']}
- 찜한 식당 목록: {liked_names}
- 등록된 장소: {ctx['saved_locs']}
- 참여 중인 파티: {party_info}

[앱 기능 상세 가이드]

■ 메뉴 추천 (AI 챗봇 추천 탭)
- 챗봇 왼쪽 하단 💬 버튼 → '🍽️ 메뉴 추천' 탭 선택
- 위치 버튼(📍)으로 현재 GPS 위치 또는 저장 장소 중 선택 가능
- AI가 취향·알러지·찜목록 기반으로 주변 식당 추천
- + 버튼으로 빠른 질문 선택 가능 (점심 추천, 매운 것, 혼밥 등)

■ 찜 목록 사용법
- 메뉴 찾기 페이지에서 식당 카드의 ❤️ 버튼 클릭 → 찜 등록
- 마이페이지 → '메뉴 찜목록' 탭에서 확인
- 챗봇 + 버튼에 찜한 식당이 표시되어 "근처 비슷한 메뉴 추천" 가능

■ 밥친구 파티 기능
- 파티 만들기: 상단 메뉴 '밥친구' → 우측 상단 '파티 만들기' 버튼
  → 식당 선택, 모집 인원, 날짜·시간 입력 후 생성
- 파티 참여: 밥친구 목록에서 '모집 중' 파티 클릭 → '파티 참여하기' 버튼
- 참여 후 파티 채팅방에서 실시간 대화 가능
- 파티 참여 시 매너온도 +0.5° 상승

■ 매너온도 시스템
- 현재 {user.nickname}님의 매너온도: {manner}°C
- 파티 참여, 후기 작성 등으로 온도 상승
- 파티 상세 페이지 참여자 목록에서 👍/👎 클릭으로 다른 회원 투표 (하루 2회)
- 온도 범위: 20°C ~ 50°C

■ 게임창 사용법
- 상단 메뉴 '🎲 게임창' 클릭
- 4가지 게임 모드:
  1) 룰렛: 랜덤으로 메뉴 뽑기
  2) 스무고개: AI와 스무고개로 메뉴 결정
  3) 월드컵(32강): 메뉴 대결로 최애 메뉴 선택
  4) 뽑기: 운에 맡겨 메뉴 결정

■ 마이페이지
- 프로필 수정: 닉네임, 알러지, 좋아하는/기피 음식 태그 설정
- 저장 장소: 집/회사/학교 등 최대 3개 저장 → 챗봇 위치 추천에 활용
- 활동내역: 추천 받은 식당, 참여한 파티 이력 확인

■ 위치 기반 식당 검색
- 홈 화면 → '내 주변 추천' 섹션에서 자동 표시
- 챗봇 추천 탭 → 📍 버튼으로 위치 선택 후 질문

친절하고 명확한 한국어로 답변하세요.
사용자 DB 정보를 활용해 개인화된 안내를 제공하세요.
예: 찜한 식당이 있으면 "회원님이 찜하신 {liked_names} 관련 기능은..." 처럼 안내."""

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

        # 💡 [코드 고도화] 추천 로그 인메모리 루프 누수 해결을 위한 텍스트 포함 쿼리 적용
        if mode == 'recommend':
            matched_restaurant = Restaurant.query.filter(
                db.literal(reply).like(db.func.concat('%', Restaurant.name, '%'))
            ).first()

            if matched_restaurant:
                db.session.add(RecommendationLog(
                    user_id=user_id,
                    input_context={'message': message, 'mode': mode},
                    recommended_restaurant_id=matched_restaurant.restaurant_id,
                    is_liked=False,
                ))
                db.session.commit()

        return jsonify({'reply': reply}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
# 카카오 로컬 API 연동
# ══════════════════════════════════════════════════════════════════════════════
@api_bp.route('/kakao/search', methods=['GET'])
def kakao_search():


    """
    카카오 로컬 API — 키워드로 음식점 검색
    GET /api/kakao/search?q=삼겹살&lat=37.5&lng=126.9&radius=1000
    """

    q      = request.args.get('q', '').strip()
    lat    = request.args.get('lat', type=float)
    lng    = request.args.get('lng', type=float)
    radius = request.args.get('radius', 1000, type=int)

    if not q:
        return jsonify({'error': 'q(검색어) is required'}), 400

    kakao_key = os.environ.get('KAKAO_REST_API_KEY', '')
    if not kakao_key:
        return jsonify({'error': 'KAKAO_REST_API_KEY not set'}), 500

    params = {
        'query':    q,
        'category_group_code': 'FD6',
        'size':     15,
    }
    if lat and lng:
        params['x']      = lng
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
    data = request.get_json(force=True)

    existing = Restaurant.query.filter_by(
        name=data.get('name'), address=data.get('address')
    ).first()

    if existing:
        return jsonify({'message': '이미 등록된 식당입니다.', 'id': existing.restaurant_id}), 200

    # 💡 [예외 차단] 카카오 카테고리를 쪼갤 때 발생하던 잠재적 IndexError 예외 방지 가드 적용
    raw_cat = data.get('category', '')
    tokens = raw_cat.split(' > ') if raw_cat else []
    if len(tokens) > 1:
        category = tokens[1]
    else:
        category = raw_cat[:10] if raw_cat else '기타'

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


# ══════════════════════════════════════════════════════════════════════════════
# SOCKET.IO — 파티 실시간 채팅
# ══════════════════════════════════════════════════════════════════════════════
from flask_socketio import join_room, leave_room, emit as socket_emit
from app import socketio

def is_user_in_party(user_id, party_id):
    # 예: PartyMember 테이블에 해당 user_id와 party_id 조합이 존재하는지 확인
    return PartyMember.query.filter_by(user_id=user_id, party_id=party_id).first() is not None

@socketio.on('join')
def handle_join(data):
    """파티 채팅방 입장 (참여자 검증 포함)"""
    room_id = str(data.get('room_id', ''))
    user_id = data.get('sender_id') 
    username = data.get('username', '익명')

    if not user_id or not is_user_in_party(int(user_id), int(room_id)):
        socket_emit('error', {'message': '참여자만 채팅방에 입장할 수 있습니다.'})
        return 

    join_room(room_id)

    # 기존 메시지 내역 전송
    try:
        msgs = ChatMessage.query.filter_by(party_id=int(room_id))\
                          .order_by(ChatMessage.created_at).limit(100).all()
        history = [
            {
                'message_id': m.message_id,
                'content':    m.content,
                'created_at': m.created_at.isoformat() if m.created_at else '',
                'sender': {
                    'user_id':  m.sender.user_id  if m.sender else None,
                    'nickname': m.sender.nickname if m.sender else '알 수 없음',
                }
            }
            for m in msgs
        ]
        socket_emit('previous_messages', history)
    except Exception:
        socket_emit('previous_messages', [])

    socket_emit('system_message',
        {'message': f'{username}님이 입장했습니다.', 'created_at': ''},
        to=room_id)


@socketio.on('leave')
def handle_leave(data):
    """파티 채팅방 퇴장"""
    room_id  = str(data.get('room_id', ''))
    username = data.get('username', '익명')
    leave_room(room_id)
    socket_emit('system_message',
        {'message': f'{username}님이 퇴장했습니다.', 'created_at': ''},
        to=room_id)


@socketio.on('send_message')
def handle_send_message(data):
    """메시지 전송 → 참여자 검증 + DB 저장 + 브로드캐스트"""
    room_id   = str(data.get('room_id', ''))
    sender_id = data.get('sender_id')
    content   = data.get('content', '').strip()

    if not content or not sender_id:
        socket_emit('error', {'message': '메시지 또는 발신자 정보가 없습니다.'})
        return

    if not is_user_in_party(int(sender_id), int(room_id)):
        socket_emit('error', {'message': '참여자만 메시지를 보낼 수 있습니다.'})
        return

    try:
        msg = ChatMessage(
            party_id=int(room_id),
            sender_id=int(sender_id),
            content=content,
        )
        db.session.add(msg)
        db.session.commit()
        db.session.refresh(msg)
        payload = {
            'message_id': msg.message_id,
            'content':    msg.content,
            'created_at': msg.created_at.isoformat() if msg.created_at else '',
            'sender': {
                'user_id':  msg.sender.user_id  if msg.sender else sender_id,
                'nickname': msg.sender.nickname if msg.sender else '알 수 없음',
            }
        }
        socket_emit('receive_message', payload, to=room_id)
    except Exception as e:
        socket_emit('error', {'message': str(e)})


@socketio.on('disconnect')
def handle_disconnect():
    pass



# ── 매너온도 투표 API ────────────────────────────────────────────────────────
@api_bp.route('/manner/vote/<int:target_id>', methods=['POST'])
@jwt_login_required
def vote_manner(target_id):
    from datetime import date
    voter_id = int(get_jwt_identity())
    if voter_id == target_id:
        return jsonify({'message': '자신에게 투표할 수 없습니다.'}), 400
    target = User.query.get_or_404(target_id)
    body   = request.get_json(force=True)
    is_pos = bool(body.get('is_positive', True))
    today  = date.today()
    today_count = MannerVote.query.filter(
        MannerVote.voter_id == voter_id,
        db.func.date(MannerVote.voted_at) == today,
    ).count()
    if today_count >= 2:
        return jsonify({'message': '오늘 투표 횟수(2회)를 모두 사용했습니다.'}), 429
    already = MannerVote.query.filter(
        MannerVote.voter_id  == voter_id,
        MannerVote.target_id == target_id,
        db.func.date(MannerVote.voted_at) == today,
    ).first()
    if already:
        return jsonify({'message': '오늘 이미 이 회원에게 투표했습니다.'}), 409
    vote = MannerVote(voter_id=voter_id, target_id=target_id, is_positive=is_pos)
    db.session.add(vote)
    delta = 1.0 if is_pos else -1.0
    target.manner_score = round(max(20.0, min(50.0, target.manner_score + delta)), 1)
    db.session.commit()
    remaining = 2 - (today_count + 1)
    return jsonify({
        'message':     f"{'따뜻한' if is_pos else '차가운'} 한 표! {target.nickname}님 온도 {'+' if is_pos else ''}{delta}°",
        'new_score':   target.manner_score,
        'remaining':   remaining,
        'is_positive': is_pos,
    }), 200


@api_bp.route('/manner/status', methods=['GET'])
@jwt_login_required
def manner_vote_status():
    from datetime import date
    voter_id = int(get_jwt_identity())
    today    = date.today()
    used  = MannerVote.query.filter(
        MannerVote.voter_id == voter_id,
        db.func.date(MannerVote.voted_at) == today,
    ).count()
    votes = MannerVote.query.filter(
        MannerVote.voter_id == voter_id,
        db.func.date(MannerVote.voted_at) == today,
    ).all()
    return jsonify({
        'used':      used,
        'remaining': max(0, 2 - used),
        'votes':     [{'target_id': v.target_id, 'is_positive': v.is_positive} for v in votes],
    }), 200

