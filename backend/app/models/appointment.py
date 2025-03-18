from app import db
from datetime import datetime
import enum

class VisitType(enum.Enum):
    HB = "HB"  # Hausbesuch (25 min)
    NA = "NA"  # Nachtbesuch (120 min)
    TK = "TK"  # Telefonkontakt (no visit)

class Weekday(enum.Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'))
    weekday = db.Column(db.String(20), nullable=False)
    time = db.Column(db.Time, nullable=True)
    visit_type = db.Column(db.String(10), nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # in minutes
    info = db.Column(db.String(200))  # Additional info from Excel
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_duration_from_visit_type(self):
        if self.visit_type == VisitType.HB.value:
            return 25
        elif self.visit_type == VisitType.NA.value:
            return 120
        elif self.visit_type == VisitType.TK.value:
            return 0
        return self.duration

    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'employee_id': self.employee_id,
            'weekday': self.weekday,
            'time': self.time.strftime('%H:%M') if self.time else None,
            'visit_type': self.visit_type,
            'duration': self.duration,
            'info': self.info,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }