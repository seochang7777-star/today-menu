import os
import math
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
    return {
        'user_id':      u.user_id,
        'email':        u.email,
        'nickname':     u.nickname,
        'manner_score': u.manner_score,
        'preferences':  u.preferences,
        'allergies':    u.allergies,
        'role':         u.role.value,
        'created_at':   u.created_at.isoformat() if u.created_at else None,
    }

def serialize_restaurant(r):
    return {
        'id':          r.restaurant_id,
        'name':        r.name,
        'address':     r.address,
        'latitude':    float(r.latitude)  if r.latitude  else None,
        'longitude':   float(r.longitude) if r.longitude else None,
        'category':    r.category,
        'description': r.description,
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
    user.preferences = {
        'likes':    data.get('preferences', (user.preferences or {}).get('likes', [])),
        'dislikes': data.get('dislikes',    (user.preferences or {}).get('dislikes', [])),
    }
    db.session.commit()
    return jsonify(serialize_user(user)), 200


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
        'items': [serialize_restaurant(r) for r in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page':  pagination.page,
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
@api_bp.route('/chat', methods=['POST'])
@jwt_login_required
def chatbot():
    from openai import OpenAI

    user_id  = int(get_jwt_identity())
    user     = User.query.get_or_404(user_id)
    data     = request.get_json(force=True)
    message  = data.get('message', '').strip()
    history  = data.get('history', [])

    if not message:
        return jsonify({'error': 'message is required'}), 400

    allergies  = user.allergies or '없음'
    likes      = ', '.join((user.preferences or {}).get('likes',    [])) or '없음'
    dislikes   = ', '.join((user.preferences or {}).get('dislikes', [])) or '없음'
    rest_names = ', '.join(
        [f"{r.name}({r.category})" for r in Restaurant.query.limit(20).all()]
    ) or '등록된 식당 없음'

    system_prompt = f"""당신은 '오늘의 메뉴' 앱의 AI 음식 추천 챗봇입니다.
사용자 정보:
- 닉네임: {user.nickname}
- 알러지/제외: {allergies}
- 좋아하는 음식: {likes}
- 싫어하는 음식: {dislikes}
등록 식당: {rest_names}
규칙: 알러지/싫어하는 음식 추천 금지. 등록 식당 있으면 이름 언급. 짧고 친근한 한국어."""

    messages = [{'role': 'system', 'content': system_prompt}]
    messages += history[-20:]
    messages.append({'role': 'user', 'content': message})

    try:
        client   = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model='gpt-4o-mini', messages=messages, max_tokens=500, temperature=0.8,
        )
        reply = response.choices[0].message.content

        for r in Restaurant.query.limit(20).all():
            if r.name in reply:
                db.session.add(RecommendationLog(
                    user_id=user_id,
                    input_context={'message': message},
                    recommended_restaurant_id=r.restaurant_id,
                    is_liked=False,
                ))
                db.session.commit()
                break

        return jsonify({'reply': reply}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

