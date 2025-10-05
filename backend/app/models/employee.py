from datetime import datetime
from app import db
from sqlalchemy import event

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
    area = db.Column(db.String(50), nullable=True)  # Area for employee
    alias = db.Column(db.String(500), nullable=True)  # Alias for employee
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Current appointments (where employee_id points to this employee)
    appointments = db.relationship('Appointment', foreign_keys='Appointment.employee_id', backref='employee', lazy='dynamic')
    # Original appointments (where origin_employee_id points to this employee)
    original_appointments = db.relationship('Appointment', foreign_keys='Appointment.origin_employee_id', backref='origin_employee', lazy='dynamic')
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
            'area': self.area,
            'alias': self.alias,
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
            area=data.get('area'),
            alias=data.get('alias')
        )