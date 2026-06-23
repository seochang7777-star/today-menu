from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
from app import db
from app.models import User, Restaurant, Party, PartyMember, ChatMessage, RecommendationLog, StatusEnum
from app.utils import login_required
import math

party_bp = Blueprint('party', __name__, url_prefix='/party')

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