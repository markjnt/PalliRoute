from datetime import datetime
from app import db

class Employee(db.Model):
    __tablename__ = 'employees'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    street = db.Column(db.String(200), nullable=False)
    zip_code = db.Column(db.String(20), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    function = db.Column(db.String(100), nullable=False)
    work_hours = db.Column(db.Float, nullable=False)  # Percentage of full-time (e.g., 100.0)
    tour_number = db.Column(db.Integer, nullable=True)  # Tour number for employee
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    appointments = db.relationship('Appointment', backref='employee', lazy='dynamic')
    routes = db.relationship('Route', backref='employee', lazy='dynamic')
    
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
            'latitude': self.latitude,
            'longitude': self.longitude,
            'function': self.function,
            'work_hours': self.work_hours,
            'tour_number': self.tour_number,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def from_dict(data):
        return Employee(
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            street=data.get('street'),
            zip_code=data.get('zip_code'),
            city=data.get('city'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            function=data.get('function'),
            work_hours=data.get('work_hours'),
            tour_number=data.get('tour_number'),
            is_active=data.get('is_active', True)
        )