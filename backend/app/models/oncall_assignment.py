from datetime import datetime
from app import db
import enum

class DutyType(enum.Enum):
    """Enum for different types of on-call duties"""
    RB_NURSING_WEEKDAY = "rb_nursing_weekday"  # Rufbereitschaft Pflege unter der Woche
    RB_NURSING_WEEKEND_DAY = "rb_nursing_weekend_day"  # Rufbereitschaft Pflege Wochenende Tag
    RB_NURSING_WEEKEND_NIGHT = "rb_nursing_weekend_night"  # Rufbereitschaft Pflege Wochenende Nacht
    RB_DOCTORS_WEEKDAY = "rb_doctors_weekday"  # Rufbereitschaft Ärzte unter der Woche
    RB_DOCTORS_WEEKEND = "rb_doctors_weekend"  # Rufbereitschaft Ärzte Wochenende
    AW_NURSING = "aw_nursing"  # Wochenenddienste Pflege

class OnCallAssignment(db.Model):
    __tablename__ = 'oncall_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)  # Date of the assignment
    duty_type = db.Column(db.String(50), nullable=False)  # One of DutyType enum values
    area = db.Column(db.String(50), nullable=True)  # Nord, Süd, Mitte (for AW and RB)
    calendar_week = db.Column(db.Integer, nullable=True)  # Denormalized for easier filtering
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = db.relationship('Employee', foreign_keys=[employee_id], backref='oncall_assignments')
    
    # Unique constraint: one assignment per employee per date per duty_type per area
    __table_args__ = (
        db.UniqueConstraint('date', 'duty_type', 'area', name='unique_date_duty_area'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'date': self.date.isoformat() if self.date else None,
            'duty_type': self.duty_type,
            'area': self.area,
            'calendar_week': self.calendar_week,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'employee': self.employee.to_dict() if self.employee else None
        }
    
    @staticmethod
    def from_dict(data):
        return OnCallAssignment(
            employee_id=data.get('employee_id'),
            date=datetime.strptime(data.get('date'), '%Y-%m-%d').date() if isinstance(data.get('date'), str) else data.get('date'),
            duty_type=data.get('duty_type'),
            area=data.get('area'),
            calendar_week=data.get('calendar_week')
        )

