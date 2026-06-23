from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
from app import db
from app.models import User, Restaurant, Party, PartyMember, ChatMessage, RecommendationLog, StatusEnum
from app.utils import login_required
import math

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

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