from . import db
from datetime import datetime
import enum

class RoleEnum(enum.Enum):
    USER  = "USER"
    ADMIN = "ADMIN"

class StatusEnum(enum.Enum):
    RECRUITING = "RECRUITING"
    CLOSED     = "CLOSED"
    COMPLETED  = "COMPLETED"

class User(db.Model):
    __tablename__ = 'users'

    user_id      = db.Column(db.Integer, primary_key=True)
    email        = db.Column(db.String(100), unique=True, nullable=False)
    password     = db.Column(db.String(200), nullable=False)
    nickname     = db.Column(db.String(50),  unique=True, nullable=False)
    manner_score = db.Column(db.Float, default=36.5)
    preferences  = db.Column(db.JSON)       # { likes: [], dislikes: [] }
    allergies    = db.Column(db.Text)
    # address      = db.Column(db.String(200), nullable=True)
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
    party_id   = db.Column(db.Integer, db.ForeignKey('parties.party_id'), nullable=False)
    sender_id  = db.Column(db.Integer, db.ForeignKey('users.user_id'),    nullable=False)
    content    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship('User', foreign_keys=[sender_id])

class RecommendationLog(db.Model):
    __tablename__ = 'recommendation_logs'

    log_id                    = db.Column(db.Integer, primary_key=True)
    user_id                   = db.Column(db.Integer, db.ForeignKey('users.user_id'),            nullable=False)
    input_context             = db.Column(db.JSON)
    recommended_restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.restaurant_id'), nullable=False)
    is_liked                  = db.Column(db.Boolean, default=False)

class Menu(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    menu_name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    category_id = db.Column(db.Integer, nullable=False)