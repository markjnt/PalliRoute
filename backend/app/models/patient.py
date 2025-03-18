from datetime import datetime
from .. import db

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    street = db.Column(db.String(200), nullable=False)
    zip_code = db.Column(db.String(20), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    phone1 = db.Column(db.String(50))
    phone2 = db.Column(db.String(50))
    calendar_week = db.Column(db.Integer)
    area = db.Column(db.String(50))  # Nordkreis or Südkreis
    tour = db.Column(db.Integer)  # Direkte Nummer der Tour (1, 2, 3, etc.)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    appointments = db.relationship('Appointment', backref='patient', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'street': self.street,
            'zip_code': self.zip_code,
            'city': self.city,
            'address': f"{self.street}, {self.zip_code} {self.city}",
            'phone1': self.phone1,
            'phone2': self.phone2,
            'calendar_week': self.calendar_week,
            'area': self.area,
            'tour': self.tour,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'appointments': [appointment.to_dict() for appointment in self.appointments]
        }
    
    @staticmethod
    def from_dict(data):
        return Patient(
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            street=data.get('street'),
            zip_code=data.get('zip_code'),
            city=data.get('city'),
            phone1=data.get('phone1'),
            phone2=data.get('phone2'),
            calendar_week=data.get('calendar_week'),
            area=data.get('area'),
            tour=data.get('tour')
        )