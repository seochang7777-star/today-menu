from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
from app import db
from app.models import User, Restaurant, Party, PartyMember, ChatMessage, RecommendationLog, StatusEnum
from app.utils import login_required
from app.constants import CATEGORIES
import math

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    trending     = Restaurant.query.order_by(Restaurant.avg_rating.desc()).limit(8).all()
    open_parties = Party.query.filter_by(status=StatusEnum.RECRUITING)\
                              .order_by(Party.created_at.desc()).limit(4).all()
    return render_template('main/index.html',
                           trending=trending,
                           open_parties=open_parties,
                           categories=CATEGORIES)
