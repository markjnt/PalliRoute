from datetime import datetime
from app import db


class Pflegeheim(db.Model):
    __tablename__ = 'pflegeheime'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    street = db.Column(db.String(200), nullable=False)
    zip_code = db.Column(db.String(20), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'street': self.street,
            'zip_code': self.zip_code,
            'city': self.city,
            'address': f"{self.street}, {self.zip_code} {self.city}",
            'latitude': self.latitude,
            'longitude': self.longitude,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
