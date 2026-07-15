import os
import math
import requests as req_lib
from datetime import datetime, timedelta, timezone
from functools import wraps
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from .models import (
    Restaurant,
    Menu,
    Category,
    RecommendationLog,
    Favorite,
    SearchLog,
    RestaurantClickLog,
)

from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash

from app import db
from app.models import (  # noqa

    User, Restaurant, Party, PartyMember,
    ChatMessage, RecommendationLog, MannerVote, StatusEnum, RoleEnum,
    Report, Inquiry, Review, Favorite, Notice, Menu, Category, SavedLocation, SearchLog
)

# ── 블루프린트 ────────────────────────────────────────────────────────────────
main_bp   = Blueprint('main',   __name__)
auth_bp   = Blueprint('auth',   __name__, url_prefix='/api/auth')
menu_bp   = Blueprint('menu',   __name__, url_prefix='/api/menu')
party_bp  = Blueprint('party',  __name__, url_prefix='/api/party')
mypage_bp = Blueprint('mypage', __name__, url_prefix='/api/mypage')
api_bp    = Blueprint('api',    __name__, url_prefix='/api')
support_bp = Blueprint('support', __name__, url_prefix='/api/support')

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

def check_and_complete_expired_parties():
    now = datetime.utcnow()
    expired_parties = Party.query.filter(
        Party.status == StatusEnum.RECRUITING,
        Party.meeting_time < now
    ).all()

    for party in expired_parties:
        party.complete_party()
    
    db.session.commit()


# ── 직렬화 헬퍼 ───────────────────────────────────────────────────────────────
def is_party_chat_locked(party):
    if party.status != StatusEnum.COMPLETED or not party.completed_at:
        return False
    return datetime.utcnow() >= party.completed_at + timedelta(days=7)

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
        'security_question': u.security_question,   # ← 추가
        'role':         u.role.value,
        'created_at':   u.created_at.isoformat() if u.created_at else None,
        'saved_locations': prefs.get('saved_locations', []),
    }

def serialize_restaurant(r, like_count=None, is_liked=False, log_id=None):
    phone = getattr(r, 'phone', None) or r.description or ''
    review_count = len(getattr(r, 'reviews', []) or [])
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
        'review_count': review_count,
        'like_count':  like_count if like_count is not None else 0,
        'business_hours': getattr(r, 'business_hours', '') or '',
        'image': getattr(r, 'image_url', None),
        'is_liked':    is_liked,  # 🔥 추가: 프론트엔드 연동 필드
        'log_id':      log_id,    # 🔥 추가: 프론트엔드 연동 필드
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
        'is_manual_close': bool(getattr(p, 'is_manual_close', False)),
        'completed_at': p.completed_at.isoformat() if p.completed_at else None,
        'is_chat_locked': is_party_chat_locked(p),
        'is_member':    any(m.user_id == viewer_id for m in p.members) if viewer_id else False,
        'is_host':      p.host_id == viewer_id if viewer_id else False,
        'created_at':   p.created_at.isoformat() if p.created_at else None,
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
        .order_by(sa_func.coalesce(liked_sub.c.like_count, 0).desc(), Restaurant.avg_rating.desc())
        .limit(8).all()
    )
    open_parties = Party.query.filter_by(status=StatusEnum.RECRUITING)\
                             .order_by(Party.created_at.desc()).limit(4).all()
    return jsonify({
        'trending':     [serialize_restaurant(r) for r in trending],
        'open_parties': [serialize_party(p) for p in open_parties],
        'categories':   CATEGORIES,
    })

@menu_bp.route('/trending', methods=['GET'])
def get_trending_data():
    from sqlalchemy import func as sa_func

    liked_sub = (
        db.session.query(
            RecommendationLog.recommended_restaurant_id.label('rest_id'),
            sa_func.count(RecommendationLog.log_id).label('like_count')
        )
        .filter(RecommendationLog.is_liked == True)
        .group_by(RecommendationLog.recommended_restaurant_id)
        .subquery()
    )
    
    trending = (
        Restaurant.query
        .outerjoin(liked_sub, Restaurant.restaurant_id == liked_sub.c.rest_id)
        .order_by(sa_func.coalesce(liked_sub.c.like_count, 0).desc())
        .limit(8)
        .all()
    )

    viewer_id = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from flask_jwt_extended import decode_token
            token_data = decode_token(auth_header.split(' ')[1])
            viewer_id  = int(token_data['sub'])
        except Exception:
            pass

    results = []
    for r in trending:
        count = db.session.query(sa_func.count(RecommendationLog.log_id))\
            .filter(RecommendationLog.recommended_restaurant_id == r.restaurant_id, 
                    RecommendationLog.is_liked == True).scalar()

        is_liked = False
        log_id = None
        if viewer_id:
            log = RecommendationLog.query.filter_by(
                user_id=viewer_id,
                recommended_restaurant_id=r.restaurant_id
            ).first()
            if log:
                is_liked = getattr(log, 'is_liked', True)
                log_id = log.log_id

        results.append(serialize_restaurant(r, like_count=count, is_liked=is_liked, log_id=log_id))
        
    return jsonify({'items': results})

@menu_bp.route('/search/log', methods=['POST'])
def log_search_keyword():
    try:
        data = request.get_json() or {}
        keyword = data.get('keyword', '').strip()
        
        if keyword:
            new_log = SearchLog(keyword=keyword, created_at=datetime.now(timezone.utc))
            db.session.add(new_log)
            db.session.commit()
            return jsonify({"message": "검색 로그 기록 완료"}), 201
        return jsonify({"message": "빈 검색어입니다"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "백엔드 저장 실패", "details": str(e)}), 500

@menu_bp.route('/<int:rest_id>/click', methods=['POST'])
def log_restaurant_click(rest_id):
    try:
        # 식당 존재 여부 확인
        restaurant = Restaurant.query.get(rest_id)
        if not restaurant:
            return jsonify({"error": "식당을 찾을 수 없습니다."}), 404

        # 조회 로그 저장
        click_log = RestaurantClickLog(
            restaurant_id=rest_id,
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(click_log)
        db.session.commit()

        return jsonify({"message": "조회수 기록 완료"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "조회수 저장 실패",
            "details": str(e)
        }), 500

@menu_bp.route('/trending/keywords', methods=['GET'])
def get_realtime_trending_keywords():
    try:
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(days=1)
        
        trending_keywords = (
            db.session.query(
                SearchLog.keyword,
                func.count(SearchLog.log_id).label('search_count'),
                func.max(SearchLog.created_at).label('latest_search')
            )
            .filter(SearchLog.created_at >= twenty_four_hours_ago)
            .group_by(SearchLog.keyword)
            .order_by(
                func.count(SearchLog.log_id).desc(),
                func.max(SearchLog.created_at).desc()
            )
            .limit(10)
            .all()
        )
        
        results = [{"name": row.keyword, "count": row.search_count} for row in trending_keywords]
        return jsonify({'items': results}), 200
    except Exception as e:
        return jsonify({"error": "백엔드 조회 실패", "details": str(e)}), 500
    
@menu_bp.route('/trending/realtime', methods=['GET'])
def get_realtime_trending():
    try:
        from sqlalchemy import func

        # ==========================
        # 1. 검색량 집계 (최근 1시간)
        # ==========================
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

        search_data = (
            db.session.query(
                SearchLog.keyword.label('name'),
                func.count(SearchLog.log_id).label('search_count')
            )
            .filter(
                SearchLog.created_at >= one_hour_ago
            )
            .group_by(SearchLog.keyword)
            .all()
        )


        # ==========================
        # 2. 클릭수 집계 (최근 1시간)
        # ==========================
        click_data = (
            db.session.query(
                Restaurant.name.label('name'),
                func.count(RestaurantClickLog.click_id).label('click_count')
            )
            .join(
                RestaurantClickLog,
                Restaurant.restaurant_id == RestaurantClickLog.restaurant_id
            )
            .filter(
                RestaurantClickLog.created_at >= one_hour_ago
            )
            .group_by(Restaurant.name)
            .all()
        )


        # ==========================
        # 3. 찜수 집계
        # ==========================
        like_data = (
            db.session.query(
                Restaurant.name.label('name'),
                func.count(RecommendationLog.log_id).label('like_count')
            )   
            .join(
                RecommendationLog,
                Restaurant.restaurant_id == RecommendationLog.recommended_restaurant_id
            )
            .filter(
                RecommendationLog.is_liked == True
            )
            .group_by(Restaurant.name)
            .all()
        )


        # ==========================
        # 4. 데이터 합치기
        # ==========================
        ranking = {}


        for row in search_data:
            ranking[row.name] = {
                "name": row.name,
                "search": row.search_count,
                "click": 0,
                "like": 0
            }


        for row in click_data:
            if row.name not in ranking:
                ranking[row.name] = {
                    "name": row.name,
                    "search": 0,
                    "click": row.click_count,
                    "like": 0
                }
            else:
                ranking[row.name]["click"] = row.click_count


        for row in like_data:
            if row.name not in ranking:
                ranking[row.name] = {
                    "name": row.name,
                    "search": 0,
                    "click": 0,
                    "like": row.like_count
                }
            else:
                ranking[row.name]["like"] = row.like_count


        # ==========================
        # 5. 정렬
        # 검색량 → 클릭 → 찜
        # ==========================
        result = sorted(
            ranking.values(),
            key=lambda x: (
                x["search"] + x["click"] + x["like"],
                x["search"],
                x["click"],
                x["like"]
            ),
            reverse=True
        )[:9]


        return jsonify({
            "items": result
        }), 200


    except Exception as e:
        return jsonify({
            "error": "실시간 인기 데이터 조회 실패",
            "details": str(e)
        }), 500

@menu_bp.route('/trending/clicks', methods=['GET'])
def get_restaurant_click_trending():
    try:
        from sqlalchemy import func

        # 최근 1시간 데이터만 집계
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

        trending_clicks = (
            db.session.query(
                Restaurant.name,
                func.count(RestaurantClickLog.click_id).label('click_count')
            )
            .join(
                RestaurantClickLog,
                Restaurant.restaurant_id == RestaurantClickLog.restaurant_id
            )
            .filter(
                RestaurantClickLog.created_at >= one_hour_ago
            )
            .group_by(Restaurant.restaurant_id)
            .order_by(
                func.count(RestaurantClickLog.click_id).desc()
            )
            .limit(10)
            .all()
        )

        results = [
            {
                "name": row.name,
                "count": row.click_count
            }
            for row in trending_clicks
        ]

        return jsonify({"items": results}), 200

    except Exception as e:
        return jsonify({
            "error": "클릭 데이터 조회 실패",
            "details": str(e)
        }), 500
    

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
@jwt_login_required
def me():
    user = User.query.get_or_404(int(get_jwt_identity()))
    return jsonify(serialize_user(user)), 200


@auth_bp.route('/me', methods=['PUT'])
@jwt_login_required
def update_me():
    user = User.query.get_or_404(int(get_jwt_identity()))
    data = request.get_json()
    nickname = data.get('nickname', '').strip()

    if nickname and nickname != user.nickname:
        if User.query.filter_by(nickname=nickname).first():
            return jsonify({'message': '이미 사용 중인 닉네임입니다.'}), 409
        user.nickname = nickname

    # 보안 질문 저장
    user.security_question = data.get(
        'security_question',
        user.security_question
    )

    # 보안 답변 저장(해시)
    security_answer = data.get('security_answer')
    if security_answer:
        user.security_answer = generate_password_hash(security_answer)

    user.allergies = data.get('allergies', user.allergies)
    user.gender = data.get('gender', user.gender)
    user.address = data.get('address', user.address)

    prefs = user.preferences or {}

    new_locations = data.get('saved_locations')
    if new_locations is not None:
        validated = []
        for loc in new_locations[:3]:
            if loc.get('name') and loc.get('lat') is not None and loc.get('lng') is not None:
                validated.append({
                    'name': str(loc['name'])[:30],
                    'address': str(loc.get('address', ''))[:100],
                    'lat': float(loc['lat']),
                    'lng': float(loc['lng']),
                })
        prefs['saved_locations'] = validated

    user.preferences = {
        **prefs,
        'likes': data.get('likes', prefs.get('likes', [])),
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

# ── 비밀번호 찾기 ─────────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['DELETE'])
@jwt_login_required
def delete_account():
    """회원 탈퇴 (본인)"""
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    try:
        MannerVote.query.filter(
            (MannerVote.voter_id == user_id) | (MannerVote.target_id == user_id)
        ).delete(synchronize_session=False)
        RecommendationLog.query.filter_by(user_id=user_id).delete()
        Favorite.query.filter_by(user_id=user_id).delete()
        Review.query.filter_by(user_id=user_id).delete()
        Inquiry.query.filter_by(user_id=user_id).delete()
        Report.query.filter(
            (Report.reporter_id == user_id) | (Report.target_id == user_id)
        ).delete(synchronize_session=False)
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': '회원 탈퇴가 완료되었습니다.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'탈퇴 중 오류: {str(e)}'}), 500

@auth_bp.route('/reset-password-direct', methods=['POST'])
def reset_password_direct():
    data = request.get_json()
    
    # 프론트엔드 payload와 매핑
    email        = data.get('email', '').strip()
    nickname     = data.get('nickname', '').strip()
    new_password = data.get('new_password', '')
    new_password2 = data.get('new_password2', '')

    # 1. 빈 값 방어 코드
    if not email or not nickname or not new_password or not new_password2:
        return jsonify({'message': '모든 항목을 입력해주세요.'}), 400

    # 2. 새 비밀번호 일치 여부 체크
    if new_password != new_password2:
        return jsonify({'message': '새 비밀번호가 일치하지 않습니다.'}), 400

    # 3. 🔍 핵심: 이메일과 닉네임이 동시에 일치하는 유저가 존재하는지 찾기
    user = User.query.filter_by(email=email, nickname=nickname).first()
    
    # 일치하는 유저가 없으면 보안상 뜬구름 잡지 않고 즉시 튕겨냅니다.
    if not user:
        return jsonify({'message': '입력하신 이메일과 닉네임 정보가 일치하는 회원이 없습니다.'}), 404

    # 4. 안전하게 암호화(해싱)하여 비밀번호 덮어쓰기
    user.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({'message': '비밀번호가 성공적으로 재설정되었습니다.'}), 200

# ── 비밀번호 변경 ─────────────────────────────────────────────────────────────
@auth_bp.route('/verify-password', methods=['POST'])
@jwt_required()
def verify_password():
    data = request.get_json()

    current_password = data.get("currentPassword", "")

    if not current_password:
        return jsonify({"message": "현재 비밀번호를 입력해주세요."}), 400

    user = User.query.get(int(get_jwt_identity()))

    if not user:
        return jsonify({"message": "사용자를 찾을 수 없습니다."}), 404

    if not check_password_hash(user.password, current_password):
        return jsonify({"message": "현재 비밀번호가 일치하지 않습니다."}), 400

    return jsonify({"message": "비밀번호가 확인되었습니다."}), 200

# ── 비밀번호 변경(최종확인) ─────────────────────────────────────────────────────────────
@auth_bp.route('/change-password', methods=['PATCH'])
@jwt_required()
def change_password():
    data = request.get_json()

    current_password = data.get("currentPassword", "")
    new_password = data.get("newPassword", "")

    if not current_password or not new_password:
        return jsonify({"message": "모든 항목을 입력해주세요."}), 400

    if len(new_password) < 4:
        return jsonify({"message": "비밀번호는 4자리 이상이어야 합니다."}), 400

    user = User.query.get(int(get_jwt_identity()))

    if not user:
        return jsonify({"message": "사용자를 찾을 수 없습니다."}), 404

    # 현재 비밀번호 확인
    if not check_password_hash(user.password, current_password):
        return jsonify({"message": "현재 비밀번호가 일치하지 않습니다."}), 400

    # 새 비밀번호로 변경
    user.password = generate_password_hash(new_password)

    db.session.commit()

    return jsonify({"message": "비밀번호가 변경되었습니다."}), 200

# ── 아이디 찾기 ─────────────────────────────────────────────────────────────
@auth_bp.route('/findid', methods=['POST'])
def find_id():
    data = request.get_json()

    nickname = data.get('nickname', '').strip()
    question = data.get('security_question', '').strip()
    answer = data.get('security_answer', '').strip()

    if not nickname or not question or not answer:
        return jsonify({
            'message': '모든 항목을 입력해주세요.'
        }), 400

    user = User.query.filter_by(
        nickname=nickname,
        security_question=question
    ).first()

    if not user:
        return jsonify({
            'message': '일치하는 회원이 없습니다.'
        }), 404

    if not check_password_hash(user.security_answer, answer):
        return jsonify({
            'message': '답변이 올바르지 않습니다.'
        }), 400

    return jsonify({
        'email': user.email
    }), 200


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
    
    # ── 🔥 [여기서부터 수정] 로그인 유저의 찜(추천로그) 상태 조회 코드 추가 ──
    viewer_id = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from flask_jwt_extended import decode_token
            token_data = decode_token(auth_header.split(' ')[1])
            viewer_id = int(token_data['sub'])
        except Exception:
            pass

    serialized_items = []
    for r in pagination.items:
        # 기본값 설정
        is_liked = False
        log_id = None
        
        # 유저가 로그인 상태라면 찜 내역 탐색
        if viewer_id:
            log = RecommendationLog.query.filter_by(
                user_id=viewer_id, 
                recommended_restaurant_id=r.restaurant_id
            ).first()
            if log:
                is_liked = getattr(log, 'is_liked', True)
                log_id = log.log_id

        # 찜 목록 개수 집계 (기존 메커니즘 유지용 카운트 계산)
        count = db.session.query(func.count(RecommendationLog.log_id))\
            .filter(RecommendationLog.recommended_restaurant_id == r.restaurant_id, 
                    RecommendationLog.is_liked == True).scalar() or 0

        # 확장된 형태로 직렬화 후 배열에 보관
        serialized_items.append(serialize_restaurant(r, like_count=count, is_liked=is_liked, log_id=log_id))
    # ── ────────────────────────────────────────────────────────────────── ──

    return jsonify({
        'items':    serialized_items, # 가공된 리스트 전달
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
    raw_count = db.session.query(func.count(RecommendationLog.log_id))\
        .filter(RecommendationLog.recommended_restaurant_id == rest_id, 
                RecommendationLog.is_liked == True)\
        .scalar() or 0

    viewer_id = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from flask_jwt_extended import decode_token
            token_data = decode_token(auth_header.split(' ')[1])
            viewer_id  = int(token_data['sub'])
        except Exception:
            pass

    is_liked = False
    log_id = None
    if viewer_id:
        log = RecommendationLog.query.filter_by(
            user_id=viewer_id,
            recommended_restaurant_id=rest_id
        ).first()
        if log:
            is_liked = getattr(log, 'is_liked', True)
            log_id = log.log_id

    return jsonify(serialize_restaurant(rest, like_count=raw_count, is_liked=is_liked, log_id=log_id))


@menu_bp.route('/', methods=['POST'])
@admin_required
def create_restaurant():
    data = request.get_json()
    rest = Restaurant(
        name=data.get('name', ''),
        address=data.get('address', ''),
        phone=data.get('phone', ''),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        category=data.get('category', '기타'),
        description=data.get('description', ''),
        avg_rating=data.get('avg_rating', 0.0),
        business_hours=data.get('business_hours', ''),
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

    from sqlalchemy import func
    query = db.session.query(Menu, Category).join(
        Category, Menu.category_id == Category.id
    )
    if cat != '전체':
        query = query.filter(Category.name == cat)

    items = query.order_by(func.random()).limit(count).all()

    result = []
    for menu, category in items:
        result.append({
            'id':       menu.id,
            'name':     menu.menu_name,
            'category': category.name,
        })

    return jsonify({'items': result}), 200


# ══════════════════════════════════════════════════════════════════════════════
@menu_bp.route('/all', methods=['GET'])
def all_menus():
    items = (
        db.session.query(Menu, Category)
        .join(Category, Menu.category_id == Category.id)
        .order_by(Menu.id.asc())
        .all()
    )

    result = []
    for menu, category in items:
        result.append({
            'id':       menu.id,
            'name':     menu.menu_name,
            'category': category.name,
        })

    return jsonify({'items': result}), 200


# PARTY
# ══════════════════════════════════════════════════════════════════════════════
@party_bp.route('/', methods=['GET'])
def list_parties():
    check_and_complete_expired_parties()

    # 1. 일단 시간 지나고 정원 찬 파티를 일괄 정리 (Data Cleansing)
    now = datetime.now() 
    
    expired_parties = Party.query.filter(
        Party.status == StatusEnum.RECRUITING,
        Party.meeting_time < now
    ).all()
    for p in expired_parties:
        p.complete_party()
    
    # 정원 찬 파티 '마감' 처리 (루프가 필요한 경우)
    recruiting_parties = Party.query.filter_by(status=StatusEnum.RECRUITING).all()
    for p in recruiting_parties:
        if len(p.members) >= p.max_people:
            p.status = StatusEnum.CLOSED
            p.is_manual_close = False
            
    db.session.commit()

    # 2. 파라미터 처리 및 필터링
    status_str = request.args.get('status', 'RECRUITING')
    try:
        status = StatusEnum[status_str]
    except KeyError:
        status = StatusEnum.RECRUITING

    # 3. 사용자 정보 확인
    viewer_id = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from flask_jwt_extended import decode_token
            token_data = decode_token(auth_header.split(' ')[1])
            viewer_id = int(token_data['sub'])
        except Exception:
            pass

    # 4. 정리된 상태의 데이터를 조회하여 반환
    parties = Party.query.order_by(Party.created_at.desc()).all()
    
    return jsonify([serialize_party(p, viewer_id) for p in parties])


@party_bp.route('/<int:party_id>', methods=['GET'])
def get_party(party_id):
    party    = Party.query.get_or_404(party_id)
    now = datetime.utcnow()
    if party.status != StatusEnum.COMPLETED and party.meeting_time < now:
        party.complete_party()
        try: db.session.commit()
        except Exception: db.session.rollback()
    elif party.status == StatusEnum.RECRUITING and len(party.members) >= party.max_people:
        party.status = StatusEnum.CLOSED
        party.is_manual_close = False
        try: db.session.commit()
        except Exception: db.session.rollback()
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


@party_bp.route('/<int:party_id>', methods=['DELETE'])
@jwt_login_required
def delete_party(party_id):
    user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    if party.host_id != user_id:
        return jsonify({'message': '호스트만 파티를 삭제할 수 있습니다.'}), 403
    if len(party.members) > 1:
        return jsonify({'message': '참여 중인 파티원이 있어 삭제할 수 없습니다.'}), 400
    db.session.delete(party)
    db.session.commit()
    return jsonify({'message': '파티가 삭제되었습니다.'}), 200


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

    meeting_time = datetime.fromisoformat(mt_str)
    if meeting_time < datetime.now():
        return jsonify({'message': '현재 시간 이후로 약속 일시를 선택해주세요.'}), 400

    party = Party(
        title=title,
        restaurant_id=rest_id,
        host_id=host_id,
        meeting_time=meeting_time,
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
    party = Party.query.get_or_404(party_id)
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404


    if party.status != StatusEnum.RECRUITING:
        return jsonify({'message': '모집이 마감된 파티입니다.'}), 400
    if len(party.members) >= party.max_people:
        return jsonify({'message': '정원이 꽉 찼습니다.'}), 400
    if any(m.user_id == user_id for m in party.members):
        return jsonify({'message': '이미 참여한 파티입니다.'}), 409

    if user in party.kicked_users:
        return jsonify({'message': '강퇴당한 파티에는 다시 참여할 수 없습니다.'}), 403

    db.session.add(PartyMember(party_id=party_id, user_id=user_id))

    user.manner_score = min(50.0, round(user.manner_score + 0.5, 1))
    db.session.commit()

    # 파티 방에 새 참여자 알림 소켓 emit
    try:
        from app import socketio as _sio
        occurred_at = datetime.utcnow().isoformat()
        payload = {
            'party_id':     party_id,
            'party_title':  party.title,
            'user_id':      user.user_id,
            'nickname':     user.nickname,
            'member_count': len(party.members),
            'occurred_at':  occurred_at,
        }
        _sio.emit('party_member_joined', payload, room=f'party_{party_id}')
    except Exception as e:
        print(f"[socket] party_member_joined emit 실패: {e}")

    return jsonify({'message': '파티에 참여했습니다! 매너온도 +0.5°', 'manner_score': user.manner_score}), 200


@party_bp.route('/<int:party_id>/chat', methods=['POST'])
@jwt_login_required
def party_chat(party_id):
    sender_id = int(get_jwt_identity())
    content   = request.get_json().get('content', '').strip()
    if not content:
        return jsonify({'message': 'content is required'}), 400
    party = Party.query.get_or_404(party_id)
    if is_party_chat_locked(party):
        return jsonify({'message': '파티 종료 후 7일이 지나 채팅이 비활성화되었습니다.'}), 403
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
        return jsonify({'message': '호스트만 변경할 수 있습니다.'}), 403
    
    if party.status == StatusEnum.RECRUITING:
        if len(party.members) < 2:
            return jsonify({'message': '파티 모집 마감은 2인 이상 참여 시 가능합니다.'}), 400
        party.status = StatusEnum.CLOSED
        party.is_manual_close = True
    elif party.status == StatusEnum.CLOSED:
        if len(party.members) >= party.max_people:
            return jsonify({'message': '정원이 가득 찬 파티는 다시 모집할 수 없습니다.'}), 400
        party.status = StatusEnum.RECRUITING
        party.is_manual_close = False
    else:
        return jsonify({'message': '상태를 변경할 수 없는 파티입니다.'}), 400
        
    db.session.commit()
    return jsonify(serialize_party(party, user_id)), 200

@party_bp.route('/<int:party_id>/kick/<int:target_user_id>', methods=['DELETE'])
@jwt_login_required
def kick_member(party_id, target_user_id):
    current_user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    
    if party.host_id != current_user_id:
        return jsonify({'message': '호스트만 강퇴할 수 있습니다.'}), 403
    if party.status == StatusEnum.COMPLETED:
        return jsonify({'message': '종료된 파티에서는 강퇴할 수 없습니다.'}), 400
    
    member = PartyMember.query.filter_by(party_id=party_id, user_id=target_user_id, is_host=False).first_or_404()
    db.session.delete(member)
    
    target_user = User.query.get(target_user_id)
    if target_user and target_user not in party.kicked_users:
        party.kicked_users.append(target_user)

    db.session.flush()

    if len(party.members) == 0:
        db.session.delete(party)
        db.session.commit()
        return jsonify({'message': '강퇴 후 파티원이 없어 파티가 삭제되었습니다.'}), 200

    remaining_count = PartyMember.query.filter_by(party_id=party_id).count()
    if not party.is_manual_close and party.status == StatusEnum.CLOSED and remaining_count < party.max_people:
        party.status = StatusEnum.RECRUITING

    db.session.commit()
    return jsonify({'message': '강퇴되었으며, 해당 파티에 재참여할 수 없습니다.'}), 200


# 파티 모임 종료 (Host 전용)
@party_bp.route('/<int:party_id>/finish', methods=['PATCH'])
@jwt_login_required
def finish_party(party_id):
    current_user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    
    if party.host_id != current_user_id:
        return jsonify({'message': '호스트만 종료할 수 있습니다.'}), 403
    if len(party.members) < 2:
        return jsonify({'message': '파티 종료는 2인 이상 참여 시 가능합니다.'}), 400
        
    party.complete_party()
    db.session.commit()
    return jsonify({'message': '모임이 종료되었습니다.'}), 200

# 불량 유저 신고 (공통)
@party_bp.route('/<int:party_id>/report', methods=['POST'])
@jwt_login_required
def report_user(party_id):
    reporter_id = get_jwt_identity()
    data = request.get_json()
    target_id = data.get('target_id')
    reason = data.get('reason')
    
    if reporter_id == target_id:
        return jsonify({'message': '본인은 신고할 수 없습니다.'}), 400

    try:
        new_report = Report(
            party_id=party_id,
            reporter_id=reporter_id,
            target_id=target_id,
            reason=reason
        )
        db.session.add(new_report)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': '이미 이 사용자를 신고하셨습니다.'}), 400

    report_count = Report.query.filter_by(party_id=party_id, target_id=target_id).count()

    if report_count >= 3:
        party = Party.query.get_or_404(party_id)
        if party.status == StatusEnum.COMPLETED:
            return jsonify({'message': '신고가 접수되었습니다. 종료된 파티에서는 자동 강퇴되지 않습니다.', 'kicked': False}), 201
        target_user = User.query.get_or_404(target_id)
        
        if target_user not in party.kicked_users:
            party.kicked_users.append(target_user)
            member = PartyMember.query.filter_by(party_id=party_id, user_id=target_id).first()
            if member:
                db.session.delete(member)
                db.session.flush()
                remaining_count = PartyMember.query.filter_by(party_id=party_id).count()
                if not party.is_manual_close and party.status == StatusEnum.CLOSED and remaining_count < party.max_people:
                    party.status = StatusEnum.RECRUITING
            db.session.commit()
            return jsonify({'message': '신고가 3회 누적되어 해당 유저가 자동 강퇴되었습니다.', 'kicked': True}), 200

    return jsonify({'message': '신고가 접수되었습니다.', 'kicked': False}), 201


@party_bp.route('/reports/<int:report_id>/process', methods=['PATCH'])
@jwt_login_required
def process_report(report_id):
    """신고 처리 완료 (관리자 전용)"""
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role != RoleEnum.ADMIN:
        return jsonify({'message': '권한이 없습니다.'}), 403
    report = Report.query.get_or_404(report_id)
    report.is_processed = True
    db.session.commit()
    return jsonify({'message': '처리 완료되었습니다.'}), 200

@party_bp.route('/admin/reports', methods=['GET'])
@jwt_login_required
def get_all_reports():
    # 관리자 권한 확인 (User 모델의 role 필드 사용)
    current_user = User.query.get(get_jwt_identity())
    if current_user.role != RoleEnum.ADMIN:
        return jsonify({'message': '권한이 없습니다.'}), 403

    reports = Report.query.order_by(Report.created_at.desc()).all()
    
    return jsonify([{
        'report_id': r.report_id,
        'party_id': r.party_id,
        'reporter': r.reporter.nickname,
        'target': r.target.nickname,
        'reason': r.reason,
        'created_at': r.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'is_processed': r.is_processed
    } for r in reports]), 200

@party_bp.route('/<int:party_id>/cancel', methods=['PATCH'])
@jwt_login_required
def cancel_party(party_id):
    current_user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    
    if party.host_id != current_user_id:
        return jsonify({'message': '호스트만 취소할 수 있습니다.'}), 403
    
    if len(party.members) > 1:
        return jsonify({'message': '이미 다른 파티원이 참여 중입니다. 파티를 취소할 수 없습니다.'}), 400
    
    party.status = StatusEnum.CANCELLED 
    db.session.commit()
    
    return jsonify({'message': '파티가 취소되었습니다.'}), 200

# ══════════════════════════════════════════════════════════════════════════════
# MYPAGE
# ══════════════════════════════════════════════════════════════════════════════
@mypage_bp.route('/', methods=['GET'])
@jwt_login_required
def mypage():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    # 알림(10분/5분 전) 기능이 이 목록을 그대로 사용하므로, 단순 '최근 생성순'이 아니라
    # '아직 안 끝난 파티 + 곧 시작할 순서'를 우선해서 5개를 골라야 알림이 누락되지 않는다.
    my_parties = Party.query.join(PartyMember)\
                            .filter(PartyMember.user_id == user_id)\
                            .order_by(
                                (Party.status == StatusEnum.COMPLETED).asc(),
                                Party.meeting_time.asc(),
                            ).limit(5).all()
    rec_logs   = RecommendationLog.query.filter_by(user_id=user_id)\
                                        .order_by(RecommendationLog.log_id.desc()).limit(10).all()
    liked_logs = RecommendationLog.query.filter_by(user_id=user_id, is_liked=True).all()
    my_reviews = Review.query.filter_by(user_id=user_id).order_by(Review.created_at.desc()).all()
    return jsonify({
        'user':       serialize_user(user),
        'my_parties': [serialize_party(p, user_id) for p in my_parties],
        'my_reviews': [rv.to_dict() for rv in my_reviews],
        'rec_logs': [
            {
                'log_id':     r.log_id,
                'is_liked':   r.is_liked,
                'restaurant': serialize_restaurant(r.restaurant) if r.restaurant else None,
                'input_context': r.input_context,
            }
            for r in rec_logs
        ],
        'liked_logs': [
            {
                'log_id':     r.log_id,
                'is_liked':   True,
                'restaurant': serialize_restaurant(r.restaurant) if r.restaurant else None,
                'recommended_restaurant_id': r.recommended_restaurant_id,
            } for r in liked_logs
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


@api_bp.route('/like/create', methods=['POST'])
@jwt_login_required
def create_like_log():
    """식당 찜하기 — 추천로그 없을 때 새로 생성"""
    user_id = int(get_jwt_identity())
    data    = request.get_json(force=True)
    rest_id = data.get('restaurant_id')
    if not rest_id:
        return jsonify({'message': 'restaurant_id 필요'}), 400

    # 이미 로그 있으면 재사용
    existing = RecommendationLog.query.filter_by(
        user_id=user_id, recommended_restaurant_id=rest_id
    ).first()
    if existing:
        existing.is_liked = True
        db.session.commit()
        return jsonify({'log_id': existing.log_id, 'liked': True}), 200

    # 새 로그 생성
    log = RecommendationLog(
        user_id=user_id,
        recommended_restaurant_id=rest_id,
        is_liked=True,
        input_context={'source': 'home_like'},
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'log_id': log.log_id, 'liked': True}), 201


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
    try:
        MannerVote.query.filter(
            (MannerVote.voter_id == user_id) | (MannerVote.target_id == user_id)
        ).delete(synchronize_session=False)
        RecommendationLog.query.filter_by(user_id=user_id).delete()
        Favorite.query.filter_by(user_id=user_id).delete()
        Review.query.filter_by(user_id=user_id).delete()
        Inquiry.query.filter_by(user_id=user_id).delete()
        Report.query.filter(
            (Report.reporter_id == user_id) | (Report.target_id == user_id)
        ).delete(synchronize_session=False)
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': '강제 탈퇴 처리되었습니다.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'처리 중 오류: {str(e)}'}), 500

@api_bp.route('/admin/reviews', methods=['GET'])
@admin_required
def admin_get_reviews():
    """전체 리뷰 목록 (관리자 전용)"""
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    q        = request.args.get('q', '')

    query = Review.query.order_by(Review.created_at.desc())
    if q:
        query = query.join(Restaurant, Review.restaurant_id == Restaurant.restaurant_id)                     .filter(Restaurant.name.ilike(f'%{q}%'))

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    reviews = []
    for rv in pagination.items:
        user = User.query.get(rv.user_id)
        rest = Restaurant.query.get(rv.restaurant_id)
        reviews.append({
            'review_id':   rv.review_id,
            'rating':      rv.rating,
            'content':     rv.content,
            'created_at':  rv.created_at.strftime('%Y-%m-%d') if rv.created_at else '',
            'user_id':     rv.user_id,
            'nickname':    user.nickname if user else '탈퇴한 사용자',
            'restaurant_id': rv.restaurant_id,
            'restaurant_name': rest.name if rest else '삭제된 식당',
        })
    return jsonify({
        'reviews': reviews,
        'total':   pagination.total,
        'pages':   pagination.pages,
        'page':    page,
    }), 200

@api_bp.route('/admin/reviews/<int:review_id>', methods=['DELETE'])
@admin_required
def admin_delete_review(review_id):
    """리뷰 삭제 (관리자 전용)"""
    review = Review.query.get_or_404(review_id)
    rest_id = review.restaurant_id
    db.session.delete(review)
    db.session.commit()
    # 평균 별점 업데이트
    try:
        _update_avg_rating(rest_id)
        db.session.commit()
    except: pass
    return jsonify({'message': '리뷰가 삭제되었습니다.'}), 200





    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': '탈퇴 처리되었습니다.'}), 200


# ── OpenAI 챗봇 ───────────────────────────────────────────────────────────────
def _address_to_coord(address):
    """카카오 로컬 API로 주소 → 좌표 변환"""
    import requests as _req
    kakao_key = os.environ.get('KAKAO_REST_API_KEY', '')
    if not kakao_key or not address or address == '없음':
        return None, None
    try:
        res = _req.get(
            'https://dapi.kakao.com/v2/local/search/address.json',
            headers={'Authorization': f'KakaoAK {kakao_key}'},
            params={'query': address},
            timeout=3
        )
        docs = res.json().get('documents', [])
        if docs:
            return float(docs[0]['y']), float(docs[0]['x'])  # lat, lng
    except Exception:
        pass
    return None, None


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


    from app.models import SavedLocation as _SavedLoc
    _user_saved_locs = _SavedLoc.query.filter_by(user_id=user_id).all()
    saved_locs = ', '.join([loc.name for loc in _user_saved_locs]) or '없음'
    saved_locs_detail = '; '.join([
        f"{loc.name}({loc.address})"
        for loc in _user_saved_locs
    ]) or '없음'
    address = user.address or '없음'

    return user, {
        'allergies':       allergies,
        'likes':           likes,
        'dislikes':        dislikes,
        'wishlist':        wishlist,
        'saved_locs':      saved_locs,
        'saved_locs_detail': saved_locs_detail,
        'address':         address,
        'manner_score':    user.manner_score,
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

    # 위치 없으면 사용자 주소지 → 좌표 변환 fallback
    addr_fallback_used = False
    if not (lat and lng) and user.address and user.address != '없음':
        addr_lat, addr_lng = _address_to_coord(user.address)
        if addr_lat and addr_lng:
            lat, lng = addr_lat, addr_lng
            loc_name = f"{user.address} (주소지 기반)"
            addr_fallback_used = True

    if lat and lng:
        lat_buffer = 0.0091  # 대략 1km 마진
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

    from sqlalchemy import text as _t_chat
    _chat_rows = db.session.execute(_t_chat(
        "SELECT name, category FROM restaurants ORDER BY avg_rating DESC LIMIT 200"
    )).fetchall()
    all_rests = [f"{row[0]}({row[1]})" for row in _chat_rows]
    all_rests_str = ', '.join(all_rests) or '등록된 식당 없음'

    if mode == 'recommend':
        if nearby_str:
            if addr_fallback_used:
                location_section = f"- 주소지({user.address}) 기반 반경 1km 식당: {nearby_str}"
            else:
                location_section = f"- 현재 위치 반경 1km 식당: {nearby_str}"
        else:
            location_section = f"- 전체 등록 식당: {all_rests_str}"
            if user.address and user.address != '없음':
                location_section += f"\n- 참고 주소지: {user.address} (좌표 변환 실패로 전체 식당 기준 추천)"
        system_prompt = f"""당신은 '오늘의 메뉴' 앱의 AI 메뉴 추천 챗봇입니다.
아래 사용자 DB 정보를 기반으로 메뉴 또는 식당을 추천해주세요.

[사용자 DB 정보]
- 닉네임: {user.nickname}
- 주소지: {ctx['address']}
- 저장 장소: {ctx['saved_locs_detail']}
- 좋아하는 음식: {ctx['likes']}
- 싫어하는 음식(기피): {ctx['dislikes']}
- 알러지/제외 재료: {ctx['allergies']}
- 찜한 식당(즐겨찾기): {ctx['wishlist']}
{location_section}

[추천 규칙]
1. 알러지 재료가 포함된 음식은 절대 추천하지 마세요.
2. 기피 음식도 추천에서 제외하세요.
3. 찜한 식당과 좋아하는 음식을 최우선으로 고려하세요.
4. 위치 기반 식당 목록이 있으면 해당 식당 위주로 추천하세요.
5. 위치 정보가 없으면 저장 장소나 주소지 기준으로 추천하세요.
6. 식당명을 언급할 때 반드시 DB에 있는 정확한 식당명을 사용하세요 (링크 연결에 필요).
7. 짧고 친근한 한국어로 답변하세요 (3~5문장 이내).
8. 여러 선택지는 번호 목록으로 제시하세요."""

    else:
        # ── Q&A용 DB 데이터 조회 ──────────────────────────────────────────────
        # 공지사항 (최근 5개 DB에서 조회)
        from app.models import Notice
        recent_notices = Notice.query.order_by(Notice.created_at.desc()).limit(5).all()
        notices_str = '\n'.join([
            f"- [{n.created_at.strftime('%Y-%m-%d')}] {n.title}: {n.content[:100]}"
            for n in recent_notices
        ]) if recent_notices else '현재 등록된 공지사항이 없습니다.'

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

        # ── 이용약관 + 개인정보처리방침 전문 (GPT 컨텍스트용) ───────────────
        TERMS_SUMMARY = """
[이용약관 전문]
제1조(목적): AI 기반 맞춤형 식단 제안, 실시간 위치 기반 밥친구 파티 매칭, 로컬 골목상권 상생 마케팅 서비스 이용 관련 권리·의무·책임 규정.

제2조(용어 정의):
- 서비스: AI 메뉴 추천, 커뮤니티 파티 매칭, 소상공인 마케팅 지원 등 일체의 서비스
- 회원: 약관에 동의하고 계정을 등록하여 서비스를 이용하는 자
- 파티: 회원이 배달 최소주문금액 충족 또는 친목 도모를 목적으로 식당·시간을 지정하여 생성한 실시간 모임
- 파트너 상인: 플랫폼에 입점하여 식당 정보 및 프로모션을 제공하는 소상공인
- 게시물: 회원이 서비스 내 게시한 글·사진·채팅 등 모든 정보

제3조(약관 변경): 7일 전 공지, 중대 변경 시 30일 전 고지. 이후 서비스 계속 이용 시 동의 간주.

제4조(회원가입): 이메일/비밀번호/닉네임 필수. 타인 명의 도용·허위정보 기재 시 승인 거절 또는 이용계약 해지 가능. JWT 토큰 관리 소홀로 발생한 손해는 회원 책임.

제5조(AI 추천 면책): OpenAI API 활용. AI 추천 결과는 완전무결 보장 불가. 식당 위생·실시간 영업 여부·맛 미보장. 알레르기 반응 등 소비 결과는 전적으로 회원 책임.

제6조(파티 이용수칙):
- 노쇼(No-Show) 금지
- 파티 채팅에서 욕설·비방·성희롱·종교/정치적 포교 금지
- 식사비 정산 회피·지연 금지
- 위반 시 서비스 이용 제한, 파티 개설 권한 박탈 가능

제7조(소상공인 보호): 악성 리뷰·허위사실 유포로 상인 영업 방해 금지.

제8조(게시물 저작권): 게시물 저작권은 작성자에게 귀속. 타인 저작권 침해 시 회원 책임. 법령 위반·음란·명예훼손 게시물은 사전 통지 없이 삭제 가능.

제9조(서비스 변경·중단): 정기 점검·외부 API 정책 변화·서버 점검 시 서비스 일부 수정·중단 가능. 불가항력 사유로 인한 데이터 유실은 면책.

제10조(이용 제한·해지): 언제든지 탈퇴 가능. 약관 위반 시 경고→일시정지→영구이용정지 단계 조치.

제11조(준거법): 대한민국 법률 적용. 분쟁 발생 시 민사소송법상 관할법원.
"""
        PRIVACY_SUMMARY = """
[개인정보처리방침 전문]
1조(총칙): 정보통신망법·개인정보보호법 준수. 약관 안내 페이지 동의 시 수집·이용 동의 간주.

2조(수집 항목):
- 필수: 이메일, 비밀번호, 닉네임
- 자동 생성: JWT 토큰, 서비스 이용 기록, 접속 로그, 쿠키, IP 정보
- 선택: GPS 위치 정보(카카오맵 API 이용 시)
- 수집 방법: 회원가입 폼 입력, 서비스 이용 중 자동 생성 로그, 브라우저 쿠키

3조(이용 목적):
- 회원 관리·신원 확인 (JWT 기반 안전한 로그인)
- 맞춤형 AI 서비스 제공 (OpenAI API 연동 메뉴 추천)
- 위치 기반 파티 매칭 서비스 운영
- 소상공인 상생 마케팅 활용

4조(제3자 제공):
- 원칙적으로 제3자 제공 불가
- OpenAI API: 질문 텍스트만 전송, 이메일·패스워드 등 계정 식별 정보 절대 미포함
- 카카오맵 API: 위경도 좌표만 연동, 화면 구현 후 휘발성 처리

5조(보유 기간): 회원가입~탈퇴 시까지. 불량 이용 기록은 탈퇴 후 최대 3개월 격리 보관 후 영구 파기.

6조(파기 방법): SQL Delete 명령어 실행 및 인덱스 정리로 복구 불가능하게 영구 삭제.

7조(이용자 권리): 마이페이지에서 언제든지 열람·수정·삭제 가능. 탈퇴로 동의 철회 가능. 오류 정정 요청 시 완료 전까지 해당 정보 이용·제공 중단.

8조(기술적 보호): 비밀번호 일방향 해시 처리, JWT 암호화 서명. 정기 백업 및 접근 권한 최소화.

9조(개인정보 보호책임자):
- 팀: today-menu 개발본부 데이터보안팀
- 문의: support@today-menu.com
"""

        system_prompt = f"""당신은 '오늘의 메뉴' 앱의 Q&A 안내 챗봇입니다.
아래 사용자 정보와 앱 가이드, 이용약관, 개인정보처리방침을 바탕으로 친절하고 구체적으로 안내해주세요.

{TERMS_SUMMARY}
{PRIVACY_SUMMARY}

[공지사항]
- 서비스 정식 오픈 (2026.06): AI 메뉴 추천, 밥친구 파티 매칭, 게임창 모두 오픈
- 파티 매칭 기능 업데이트 (2026.06): 실시간 채팅, 매너온도 투표 추가
- AI 챗봇 고도화 (2026.07): 찜목록 기반 개인화 추천, 위치 기반 식당 연결 기능 추가
- 정기 점검: 매주 화요일 새벽 2시~4시 (서비스 일시 중단)

[고객센터 FAQ]
Q. AI 챗봇이 위치와 다른 맛집을 추천해요.
A. 브라우저 위치 정보 제공에 동의하거나 마이페이지에서 저장 장소를 등록해주세요.
Q. 밥친구 파티 참여는 어떻게 하나요?
A. 밥친구 메뉴 → 모집 중인 파티 선택 → 파티 참여하기 버튼을 누르세요.
Q. 매너온도는 어떻게 올리나요?
A. 파티 참여 시 +0.5도, 파티 상세 페이지에서 다른 회원에게 👍 투표 시 상대방 +1도 상승합니다.
Q. 회원 탈퇴는 어디서 하나요?
A. 마이페이지 최하단 '회원 탈퇴하기' 버튼을 누르세요.

[답변 규칙]
- 이용약관·개인정보처리방침 관련 질문 → 위 내용을 바탕으로 정확히 답변하세요.
- 공지사항 관련 질문 → 위 공지사항 내용을 기반으로 답변하세요.
- 고객센터/서비스 사용법 질문 → 위 FAQ와 앱 가이드를 참고해 답변하세요.
- 서비스와 전혀 무관한 질문(날씨, 정치, 연예, 다른 앱 등) → "저는 오늘의 메뉴 앱 관련 질문만 답변드릴 수 있어요 😊 앱 이용이나 약관 관련 궁금한 점을 물어봐 주세요!"라고 정중히 안내하세요.

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

■ 공지사항
- 상단 메뉴 '공지사항' 또는 푸터 → 고객 → 공지사항 클릭
- 서비스 업데이트, 점검 안내, 이벤트 정보 등 확인 가능
- 최신 공지 목록:
{notices_str}

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
            # Python 레벨에서 식당명 매칭 (SQLite 호환)
            all_rests_log = Restaurant.query.with_entities(
                Restaurant.restaurant_id, Restaurant.name
            ).all()
            for r_id, r_name in all_rests_log:
                if r_name and r_name in reply:
                    db.session.add(RecommendationLog(
                        user_id=user_id,
                        input_context={'message': message, 'mode': mode},
                        recommended_restaurant_id=r_id,
                        is_liked=False,
                    ))
                    db.session.commit()
                    break

        # ── 응답에서 식당명 추출 → 상세 정보 첨부 ──────────────────────
        matched_restaurants = []
        if mode == 'recommend':
            # 전체 식당 중 응답에 이름이 언급된 것 찾기 (최대 3개)
            from sqlalchemy import text as _t_match
            all_rests_for_match = db.session.execute(_t_match(
                "SELECT restaurant_id, name, category, address, avg_rating FROM restaurants"
            )).fetchall()
            for r in all_rests_for_match:
                if r[1] in reply:
                    matched_restaurants.append({
                        'id':       r[0],
                        'name':     r[1],
                        'category': r[2],
                        'address':  r[3],
                        'avg_rating': r[4],
                    })
                    if len(matched_restaurants) >= 3:
                        break

        return jsonify({
            'reply':        reply,
            'restaurants':  matched_restaurants,
            'manner_score': user.manner_score,
            'wishlist':     [r for r in ctx['wishlist'].split(', ') if r and r != '없음'],
        }), 200

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
    join_room(f'party_{room_id}')

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


@socketio.on('subscribe_party_notifications')
def handle_subscribe_party_notifications(data):
    """참여 중인 파티들의 알림 방 구독"""
    user_id = data.get('user_id')
    party_ids = data.get('party_ids') or []
    subscribed = []

    if not user_id:
        socket_emit('error', {'message': '사용자 정보가 없습니다.'})
        return

    for party_id in party_ids:
        try:
            party_id = int(party_id)
            if is_user_in_party(int(user_id), party_id):
                join_room(f'party_{party_id}')
                subscribed.append(party_id)
        except (TypeError, ValueError):
            continue

    socket_emit('party_notification_subscribed', {'party_ids': subscribed})


@socketio.on('subscribe_my_party_notifications')
def handle_subscribe_my_party_notifications(data):
    """사용자가 참여 중인 모든 파티 알림 방 구독"""
    user_id = data.get('user_id')
    subscribed = []

    if not user_id:
        socket_emit('error', {'message': '사용자 정보가 없습니다.'})
        return

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        socket_emit('error', {'message': '사용자 정보가 올바르지 않습니다.'})
        return

    party_members = PartyMember.query.filter_by(user_id=user_id).all()
    for member in party_members:
        join_room(f'party_{member.party_id}')
        subscribed.append(member.party_id)

    join_room(f'user_{user_id}')
    socket_emit('party_notification_subscribed', {'party_ids': subscribed})


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
        party = Party.query.get(int(room_id))
        if not party:
            socket_emit('error', {'message': '파티를 찾을 수 없습니다.'})
            return
        if is_party_chat_locked(party):
            socket_emit('error', {'message': '파티 종료 후 7일이 지나 채팅이 비활성화되었습니다.'})
            return

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



# ── 파티 탈퇴 API ─────────────────────────────────────────────────────────────
@party_bp.route('/<int:party_id>/leave', methods=['DELETE'])
@jwt_login_required
def leave_party(party_id):
    """파티 탈퇴 (호스트는 불가, 인원 0명 시 파티 자동 삭제)"""
    user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    member = PartyMember.query.filter_by(party_id=party_id, user_id=user_id).first()
    
    if not member:
        return jsonify({'message': '파티 참여자가 아닙니다.'}), 404
    if party.status == StatusEnum.COMPLETED:
        return jsonify({'message': '종료된 파티에서는 탈퇴할 수 없습니다.'}), 400
    if member.is_host:
        return jsonify({'message': '호스트는 탈퇴할 수 없습니다. 파티를 종료하거나 취소해주세요.'}), 403

    user = User.query.get(user_id)
    party_title = party.title
    db.session.delete(member)
    db.session.flush()
    
    # 남은 인원 확인
    member_count = PartyMember.query.filter_by(party_id=party_id).count()
    party = Party.query.get(party_id)

    if member_count == 0:
        db.session.delete(party)
        db.session.commit()
        try:
            from app import socketio as _sio
            occurred_at = datetime.utcnow().isoformat()
            payload = {
                'party_id':     party_id,
                'party_title':  party_title,
                'user_id':      user_id,
                'nickname':     user.nickname if user else '알 수 없음',
                'member_count': member_count,
                'occurred_at':  occurred_at,
            }
            _sio.emit('party_member_left', payload, room=f'party_{party_id}')
        except Exception as e:
            print(f"[socket] party_member_left(자동삭제) emit 실패: {e}")
        return jsonify({'message': '파티를 탈퇴했습니다. 마지막 멤버이므로 파티가 자동 삭제되었습니다.'}), 200
    
    db.session.commit()

    if not party.is_manual_close and party.status == StatusEnum.CLOSED:
        if member_count < party.max_people:
            party.status = StatusEnum.RECRUITING
        
    db.session.commit()

    try:
        from app import socketio as _sio
        occurred_at = datetime.utcnow().isoformat()
        payload = {
            'party_id':     party_id,
            'party_title':  party_title,
            'user_id':      user_id,
            'nickname':     user.nickname if user else '알 수 없음',
            'member_count': member_count,
            'occurred_at':  occurred_at,
        }
        _sio.emit('party_member_left', payload, room=f'party_{party_id}')
    except Exception as e:
        print(f"[socket] party_member_left emit 실패: {e}")
    return jsonify({'message': '파티에서 탈퇴했습니다.'}), 200


# ── 파티 상태 변경 API ──────────────────────────────────────────────────────────
@party_bp.route('/<int:party_id>/status', methods=['PATCH'])
@jwt_login_required
def change_party_status(party_id):
    user_id = int(get_jwt_identity())
    party = Party.query.get_or_404(party_id)
    if party.host_id != user_id:
        return jsonify({'message': '호스트만 상태를 변경할 수 있습니다.'}), 403
    
    data = request.get_json(force=True)
    new_status = data.get('status')
    
    if new_status not in ['RECRUITING', 'CLOSED']:
        return jsonify({'message': '유효하지 않은 상태입니다.'}), 400
    
    # [수동 마감 시 플래그 설정]
    if new_status == 'CLOSED':
        party.is_manual_close = True
    else:
        # 다시 모집을 시작할 때는 수동 마감 상태를 해제함
        party.is_manual_close = False
        
    party.status = StatusEnum[new_status]
    db.session.commit()
    
    return jsonify({'message': f"파티 상태가 '{new_status}'로 변경되었습니다.", 'status': new_status}), 200




# ══════════════════════════════════════════════════════════════════════════════
# NOTICES — 공지사항
# ══════════════════════════════════════════════════════════════════════════════

@api_bp.route('/notices', methods=['GET'])
def get_notices():
    """공지사항 목록 조회 (전체)"""
    notices = Notice.query.order_by(Notice.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notices]), 200


@api_bp.route('/notices', methods=['POST'])
@jwt_login_required
def create_notice():
    """공지사항 작성 (관리자 전용)"""
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if user.role.value.lower() != 'admin':
        return jsonify({'message': '관리자만 공지사항을 작성할 수 있습니다.'}), 403

    data    = request.get_json(force=True)
    title   = data.get('title', '').strip()
    content = data.get('content', '').strip()
    category = data.get('category', '서비스').strip()

    if not title or not content:
        return jsonify({'message': '제목과 내용을 입력해주세요.'}), 400

    notice = Notice(
        title=title,
        content=content,
        category=category,
        author_id=user_id,
    )
    db.session.add(notice)
    db.session.commit()
    return jsonify({'message': '공지사항이 등록되었습니다.', 'notice': notice.to_dict()}), 201


@api_bp.route('/notices/<int:notice_id>', methods=['DELETE'])
@jwt_login_required
def delete_notice(notice_id):
    """공지사항 삭제 (관리자 전용)"""
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    if user.role.value.lower() != 'admin':
        return jsonify({'message': '관리자만 삭제할 수 있습니다.'}), 403

    notice = Notice.query.get_or_404(notice_id)
    db.session.delete(notice)
    db.session.commit()
    return jsonify({'message': '공지사항이 삭제되었습니다.'}), 200

# ── REVIEW API ─────────────────────────────────────────────────────────────────
@menu_bp.route('/<int:rest_id>/reviews', methods=['GET'])
def get_reviews(rest_id):
    Restaurant.query.get_or_404(rest_id)
    reviews = Review.query.filter_by(restaurant_id=rest_id).order_by(Review.created_at.desc()).all()
    avg = sum(rv.rating for rv in reviews) / len(reviews) if reviews else 0
    return jsonify({'reviews': [rv.to_dict() for rv in reviews], 'avg_rating': round(avg, 1), 'count': len(reviews)}), 200

@menu_bp.route('/<int:rest_id>/reviews', methods=['POST'])
@jwt_login_required
def create_review(rest_id):
    user_id = int(get_jwt_identity())
    Restaurant.query.get_or_404(rest_id)
    data    = request.get_json(force=True)
    rating  = float(data.get('rating', 0))
    content = data.get('content', '').strip()
    if not (1.0 <= rating <= 5.0):
        return jsonify({'message': '별점은 1~5 사이로 입력해주세요.'}), 400
    existing = Review.query.filter_by(user_id=user_id, restaurant_id=rest_id).first()
    if existing:
        existing.rating = rating; existing.content = content
        db.session.commit()
        _update_avg_rating(rest_id)
        return jsonify({'message': '리뷰가 수정되었습니다.', 'review': existing.to_dict()}), 200
    review = Review(user_id=user_id, restaurant_id=rest_id, rating=rating, content=content)
    db.session.add(review)
    user = User.query.get(user_id)
    user.manner_score = round(min(50.0, user.manner_score + 0.3), 1)
    db.session.commit()
    _update_avg_rating(rest_id)
    return jsonify({'message': '리뷰가 등록되었습니다!', 'review': review.to_dict()}), 201

@menu_bp.route('/<int:rest_id>/reviews/<int:review_id>', methods=['DELETE'])
@jwt_login_required
def delete_review(rest_id, review_id):
    user_id = int(get_jwt_identity())
    review  = Review.query.get_or_404(review_id)
    if review.user_id != user_id:
        return jsonify({'message': '본인 리뷰만 삭제할 수 있습니다.'}), 403
    db.session.delete(review); db.session.commit()
    _update_avg_rating(rest_id)
    return jsonify({'message': '리뷰가 삭제되었습니다.'}), 200

@mypage_bp.route('/reviews', methods=['GET'])
@jwt_login_required
def my_reviews():
    user_id = int(get_jwt_identity())
    reviews = Review.query.filter_by(user_id=user_id).order_by(Review.created_at.desc()).all()
    return jsonify({'reviews': [rv.to_dict() for rv in reviews]}), 200

def _update_avg_rating(restaurant_id):
    reviews = Review.query.filter_by(restaurant_id=restaurant_id).all()
    rest = Restaurant.query.get(restaurant_id)
    if rest:
        rest.avg_rating = round(sum(rv.rating for rv in reviews) / len(reviews), 1) if reviews else 0.0
        db.session.commit()

# ── MANNER HISTORY API ────────────────────────────────────────────────────────
@api_bp.route('/manner/vote/<int:target_user_id>', methods=['POST'])
@jwt_login_required
def vote_manner(target_user_id):
    """매너온도 투표 (하루 2회 제한)"""
    voter_id = int(get_jwt_identity())

    if voter_id == target_user_id:
        return jsonify({'message': '자신에게 투표할 수 없습니다.'}), 400

    target = User.query.get_or_404(target_user_id)
    data = request.get_json()
    is_positive = data.get('is_positive', True)

    # 하루 2회 제한 체크
    from datetime import datetime, date
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_votes = MannerVote.query.filter(
        MannerVote.voter_id == voter_id,
        MannerVote.voted_at >= today_start
    ).count()

    if today_votes >= 2:
        return jsonify({'message': '오늘 투표 횟수(2회)를 모두 사용했습니다.', 'remaining': 0}), 400

    # 같은 대상 하루 1회 제한
    already = MannerVote.query.filter(
        MannerVote.voter_id == voter_id,
        MannerVote.target_id == target_user_id,
        MannerVote.voted_at >= today_start
    ).first()
    if already:
        return jsonify({'message': '이미 이 유저에게 오늘 투표했습니다.', 'remaining': 2 - today_votes}), 400

    # 투표 저장
    vote = MannerVote(voter_id=voter_id, target_id=target_user_id, is_positive=is_positive)
    db.session.add(vote)

    # 온도 변경 (±1.0, 범위 20~50)
    delta = 1.0 if is_positive else -1.0
    target.manner_score = round(max(20.0, min(50.0, (target.manner_score or 36.5) + delta)), 1)
    db.session.commit()

    remaining = max(0, 1 - (today_votes))  # 이번 투표 포함하면 remaining-1
    return jsonify({
        'message': f'매너온도 {"+" if is_positive else ""}{delta}°C 반영되었습니다.',
        'manner_score': target.manner_score,
        'remaining': remaining,
    }), 200

@api_bp.route('/manner/history', methods=['GET'])
@jwt_login_required
def manner_history():
    user_id  = int(get_jwt_identity())
    received = MannerVote.query.filter_by(target_id=user_id).order_by(MannerVote.voted_at.desc()).limit(20).all()
    given    = MannerVote.query.filter_by(voter_id=user_id).order_by(MannerVote.voted_at.desc()).limit(10).all()
    user     = User.query.get(user_id)

    total_received = len(received)
    positive_count = sum(1 for v in received if v.is_positive)
    negative_count = total_received - positive_count

    return jsonify({
        'manner_score': user.manner_score,
        'stats': {
            'total_received': total_received,
            'positive':       positive_count,
            'negative':       negative_count,
        },
        'received': [
            {
                'voter':       v.voter.nickname if v.voter else '알 수 없음',
                'is_positive': v.is_positive,
                'delta':       1.0 if v.is_positive else -1.0,
                'voted_at':    v.voted_at.strftime('%Y-%m-%d %H:%M') if v.voted_at else '',
            }
            for v in received
        ],
        'given': [
            {
                'target':      v.target.nickname if v.target else '알 수 없음',
                'is_positive': v.is_positive,
                'voted_at':    v.voted_at.strftime('%Y-%m-%d %H:%M') if v.voted_at else '',
            }
            for v in given
        ],
    })

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


# ══════════════════════════════════════════════════════════════════════════════
# SUPPORT
# ══════════════════════════════════════════════════════════════════════════════


# 1. 문의글 목록 불러오기 (GET)
@support_bp.route('/inquiries', methods=['GET'])
def get_inquiries():
    inquiries = Inquiry.query.order_by(Inquiry.created_at.desc()).all()
    return jsonify([i.to_dict() for i in inquiries]), 200

# 2. 문의글 등록하기 (POST)
@support_bp.route('/inquiries', methods=['POST'])
@jwt_login_required 
def create_inquiry():
    print(f"DEBUG: 현재 사용자 ID -> {get_jwt_identity()}")
    data = request.get_json()

    if not data or 'title' not in data or 'content' not in data:
        return jsonify({"msg": "제목과 내용을 모두 입력해주세요."}), 422
    
    try:
        user_identity = get_jwt_identity()
        print(f"DEBUG: 사용자 ID -> {user_identity}")
        
        new_inquiry = Inquiry(
            title=data['title'],
            content=data['content'],
            user_id=int(user_identity) 
        )
        db.session.add(new_inquiry)
        db.session.commit()
        return jsonify(new_inquiry.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: DB 에러 발생 -> {str(e)}")
        return jsonify({"msg": f"서버 저장 오류: {str(e)}"}), 500

# 3. 관리자 답변 달기 (PATCH)
@support_bp.route('/inquiries/<int:id>/answer', methods=['PATCH'])
@admin_required
def answer_inquiry(id):
    # 관리자 권한 체크
    from flask_jwt_extended import get_jwt_identity
    user_id  = int(get_jwt_identity())
    cur_user = User.query.get(user_id)
    if not cur_user or cur_user.role.value.lower() != 'admin':
        return jsonify({'message': '관리자만 답변할 수 있습니다.'}), 403

    inquiry = Inquiry.query.get(id)
    if inquiry is None:
        return jsonify({'msg': '문의가 없습니다.'}), 404

    data = request.get_json(force=True)
    inquiry.answer = data.get('answer', '')
    from datetime import datetime
    inquiry.answered_at = datetime.utcnow()
    db.session.commit()
    return jsonify(inquiry.to_dict()), 200

# ── SAVED-LOCATIONS API ──────────────────────────────────────────────────────

@api_bp.route('/saved-locations', methods=['GET'])
@jwt_login_required
def get_saved_locations():
    user_id = int(get_jwt_identity())
    locs = SavedLocation.query.filter_by(user_id=user_id).all()
    return jsonify([loc.to_dict() for loc in locs]), 200

@api_bp.route('/saved-locations', methods=['POST'])
@jwt_login_required
def add_saved_location():
    user_id = int(get_jwt_identity())
    data    = request.get_json(force=True)
    name    = data.get('name', '').strip()
    address = data.get('address', '').strip()

    if not name or not address:
        return jsonify({'message': 'name과 address가 필요합니다.'}), 400

    # 최대 3개 제한
    count = SavedLocation.query.filter_by(user_id=user_id).count()
    if count >= 3:
        return jsonify({'message': '저장 장소는 최대 3개까지 가능합니다.'}), 400

    loc = SavedLocation(user_id=user_id, name=name, address=address)
    db.session.add(loc)
    db.session.commit()
    return jsonify(loc.to_dict()), 201

@api_bp.route('/saved-locations/<int:location_id>', methods=['DELETE'])
@jwt_login_required
def delete_saved_location(location_id):
    user_id = int(get_jwt_identity())
    loc = SavedLocation.query.filter_by(id=location_id, user_id=user_id).first_or_404()
    db.session.delete(loc)
    db.session.commit()
    return jsonify({'message': '삭제되었습니다.'}), 200

# ── FAVORITES API ────────────────────────────────────────────────────────

@api_bp.route('/favorites', methods=['POST'])
@jwt_login_required
def toggle_favorite():
    user_id       = int(get_jwt_identity())
    data          = request.get_json(force=True)
    restaurant_id = int(data.get('restaurant_id', 0))

    if not restaurant_id:
        return jsonify({"msg": "식당 ID가 필요합니다."}), 400

    # 이미 찜한 상태인지 확인
    favorite = Favorite.query.filter_by(
        user_id=user_id, 
        restaurant_id=restaurant_id
    ).first()

    if favorite:
        db.session.delete(favorite)
        db.session.commit()
        return jsonify({"status": "removed", "msg": "찜 목록에서 제거되었습니다."}), 200
    else:
        new_favorite = Favorite(user_id=user_id, restaurant_id=restaurant_id)
        db.session.add(new_favorite)
        db.session.commit()
        return jsonify({"status": "added", "msg": "찜 목록에 추가되었습니다."}), 201
    
@api_bp.route('/favorites', methods=['GET'])
@jwt_login_required
def get_my_favorites():
    user_id   = int(get_jwt_identity())
    from sqlalchemy.orm import joinedload
    favorites = Favorite.query.options(
        joinedload(Favorite.restaurant)
    ).filter(Favorite.user_id == user_id).all()

    result = []
    for f in favorites:
        if f.restaurant:
            result.append({
                'id':         f.restaurant.restaurant_id,
                'name':       f.restaurant.name,
                'category':   f.restaurant.category,
                'avg_rating': f.restaurant.avg_rating,
                'address':    f.restaurant.address or '',
                'image':      getattr(f.restaurant, 'image_url', None),
            })
    return jsonify(result), 200
