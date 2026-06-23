from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
from app import db
from app.models import User, Restaurant, Party, PartyMember, ChatMessage, RecommendationLog, StatusEnum
from app.utils import login_required
from app.constants import CATEGORIES
import math

menu_bp = Blueprint('menu', __name__, url_prefix='/menu')

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