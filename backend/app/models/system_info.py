from app import db
from datetime import datetime

class SystemInfo(db.Model):
    __tablename__ = 'system_info'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SystemInfo {self.key}={self.value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @staticmethod
    def get_value(key, default=None):
        """Get a system info value by key"""
        info = SystemInfo.query.filter_by(key=key).first()
        return info.value if info else default
    
    @staticmethod
    def set_value(key, value):
        """Set a system info value by key"""
        info = SystemInfo.query.filter_by(key=key).first()
        if info:
            info.value = value
            info.updated_at = datetime.utcnow()
        else:
            info = SystemInfo(key=key, value=value)
            db.session.add(info)
        db.session.commit()
        return info
