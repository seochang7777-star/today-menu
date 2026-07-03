from . import db
from datetime import datetime
import enum

party_kicked_users = db.Table('party_kicked_users',
    db.Column('party_id', db.Integer, db.ForeignKey('parties.party_id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.user_id'), primary_key=True)
)

class RoleEnum(enum.Enum):
    USER  = "USER"
    ADMIN = "ADMIN"

class StatusEnum(enum.Enum):
    RECRUITING = "RECRUITING"
    CLOSED     = "CLOSED"
    COMPLETED  = "COMPLETED"
    CANCELLED = 'CANCELLED'

class User(db.Model):
    __tablename__ = 'users'
    user_id      = db.Column(db.Integer, primary_key=True)
    email        = db.Column(db.String(100), unique=True, nullable=False)
    password     = db.Column(db.String(200), nullable=False)
    nickname     = db.Column(db.String(50),  unique=True, nullable=False)
    manner_score = db.Column(db.Float, default=36.5)
    preferences  = db.Column(db.JSON)       # { likes: [], dislikes: [] }
    allergies    = db.Column(db.Text)
    address      = db.Column(db.String(200), nullable=True)
    gender       = db.Column(db.String(20), nullable=True, default='미설정')
    saved_locations = db.Column(db.JSON, default=list)
    role         = db.Column(db.Enum(RoleEnum), default=RoleEnum.USER)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    parties_hosted = db.relationship('Party',      backref='host', lazy=True)
    party_members  = db.relationship('PartyMember', backref='user', lazy=True)
    rec_logs       = db.relationship('RecommendationLog', backref='user', lazy=True)

class Restaurant(db.Model):
    __tablename__ = 'restaurants'

    restaurant_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    category = db.Column(db.String(50))
    description = db.Column(db.Text)
    avg_rating = db.Column(db.Float, default=0.0)
    parties  = db.relationship('Party',              backref='restaurant', lazy=True)
    rec_logs = db.relationship('RecommendationLog',  backref='restaurant', lazy=True)


class Party(db.Model):
    __tablename__ = 'parties'
    party_id      = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.restaurant_id'), nullable=False)
    host_id       = db.Column(db.Integer, db.ForeignKey('users.user_id'),             nullable=False)
    title         = db.Column(db.String(100), nullable=False)
    meeting_time  = db.Column(db.DateTime,    nullable=False)
    max_people    = db.Column(db.Integer,     nullable=False)
    status        = db.Column(db.Enum(StatusEnum), default=StatusEnum.RECRUITING)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    members  = db.relationship('PartyMember',   backref='party', cascade='all, delete-orphan')
    messages = db.relationship('ChatMessage',   backref='party', cascade='all, delete-orphan')
    kicked_users = db.relationship('User', secondary=party_kicked_users, backref='kicked_from_parties')
    reports = db.relationship('Report', backref='party', cascade='all, delete-orphan')



class PartyMember(db.Model):
    __tablename__ = 'party_members'

    member_id = db.Column(db.Integer, primary_key=True)
    party_id  = db.Column(db.Integer, db.ForeignKey('parties.party_id'), nullable=False)
    user_id   = db.Column(db.Integer, db.ForeignKey('users.user_id'),    nullable=False)
    is_host   = db.Column(db.Boolean, default=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    message_id = db.Column(db.Integer, primary_key=True)
    party_id = db.Column(db.Integer, db.ForeignKey('parties.party_id'), nullable=False, index=True)
    sender_id  = db.Column(db.Integer, db.ForeignKey('users.user_id'),    nullable=False)
    content    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    sender = db.relationship('User', foreign_keys=[sender_id])

class MannerVote(db.Model):
    """매너온도 투표 — 하루 2회 제한"""
    __tablename__ = 'manner_votes'

    vote_id     = db.Column(db.Integer, primary_key=True)
    voter_id    = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    target_id   = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    is_positive = db.Column(db.Boolean, nullable=False)
    voted_at    = db.Column(db.DateTime, default=datetime.utcnow)

    voter  = db.relationship('User', foreign_keys=[voter_id])
    target = db.relationship('User', foreign_keys=[target_id])


class RecommendationLog(db.Model):
    __tablename__ = 'recommendation_logs'

    log_id                    = db.Column(db.Integer, primary_key=True)
    user_id                   = db.Column(db.Integer, db.ForeignKey('users.user_id'),            nullable=False)
    input_context             = db.Column(db.JSON)
    recommended_restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.restaurant_id'), nullable=False)
    is_liked                  = db.Column(db.Boolean, default=False)

class Favorite(db.Model):
    """사용자가 찜한 식당 목록"""
    __tablename__ = 'favorites'
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'restaurant_id', name='_one_fav_per_user_restaurant'),
    )

    favorite_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.restaurant_id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('favorites', cascade='all, delete-orphan'))
    restaurant = db.relationship('Restaurant', backref=db.backref('favorited_by', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'favorite_id': self.favorite_id,
            'restaurant_id': self.restaurant_id,
            'restaurant_name': self.restaurant.name,
            'created_at': self.created_at.strftime('%Y-%m-%d')
        }

class Report(db.Model):
    __tablename__ = 'reports'
    __table_args__ = (
        db.UniqueConstraint('party_id', 'reporter_id', 'target_id', name='_one_report_per_user_per_party'),
    )

    report_id  = db.Column(db.Integer, primary_key=True)
    party_id   = db.Column(db.Integer, db.ForeignKey('parties.party_id'), nullable=False)
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    target_id  = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    reason     = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_processed = db.Column(db.Boolean, default=False) # 관리자 처리 여부

    reporter = db.relationship('User', foreign_keys=[reporter_id])
    target = db.relationship('User', foreign_keys=[target_id])

class Inquiry(db.Model):
    __tablename__ = 'inquiries'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=True) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    
    writer = db.relationship('User', backref='inquiries', foreign_keys=[user_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'answer': self.answer,
            'date': self.created_at.strftime('%Y-%m-%d'),
            'writer': self.writer.nickname if self.writer else "알 수 없음"
        }


class Review(db.Model):
    """식당 리뷰 + 별점"""
    __tablename__ = 'reviews'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'restaurant_id', name='_one_review_per_user_restaurant'),
    )

    review_id     = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.restaurant_id'), nullable=False)
    rating        = db.Column(db.Float, nullable=False)   # 1.0 ~ 5.0
    content       = db.Column(db.Text, nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    writer     = db.relationship('User',       foreign_keys=[user_id])
    restaurant = db.relationship('Restaurant', foreign_keys=[restaurant_id], backref='reviews')

    def to_dict(self):
        return {
            'review_id':     self.review_id,
            'user_id':       self.user_id,
            'restaurant_id': self.restaurant_id,
            'rating':        self.rating,
            'content':       self.content or '',
            'nickname':      self.writer.nickname if self.writer else '알 수 없음',
            'created_at':    self.created_at.strftime('%Y-%m-%d') if self.created_at else '',
        }
