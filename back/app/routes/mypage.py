from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
from app import db
from app.models import User, Restaurant, Party, PartyMember, ChatMessage, RecommendationLog, StatusEnum
from app.utils import login_required
import math

mypage_bp = Blueprint('mypage', __name__, url_prefix='/mypage')

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