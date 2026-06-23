from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
from app import db
from app.models import User, Restaurant, Party, PartyMember, ChatMessage, RecommendationLog, StatusEnum
from app.utils import login_required
import math

api_bp = Blueprint('api', __name__, url_prefix='/api')

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
