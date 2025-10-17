from datetime import datetime
from app import db

class EmployeePlanning(db.Model):
    __tablename__ = 'employee_planning'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    weekday = db.Column(db.String(20), nullable=False)  # monday, tuesday, etc.
    available = db.Column(db.Boolean, nullable=False, default=True)
    custom_text = db.Column(db.String(200), nullable=True)  # For custom status
    replacement_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)  # Replacement employee
    calendar_week = db.Column(db.Integer, nullable=True)  # Denormalized for easier filtering
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = db.relationship('Employee', foreign_keys=[employee_id], backref='planning_entries')
    replacement = db.relationship('Employee', foreign_keys=[replacement_id], backref='replacement_entries')
    
    # Unique constraint: one planning entry per employee per weekday per week
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'weekday', 'calendar_week', name='unique_employee_weekday_week'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'weekday': self.weekday,
            'available': self.available,
            'custom_text': self.custom_text,
            'replacement_id': self.replacement_id,
            'calendar_week': self.calendar_week,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def from_dict(data):
        return EmployeePlanning(
            employee_id=data.get('employee_id'),
            weekday=data.get('weekday'),
            available=data.get('available', True),
            custom_text=data.get('custom_text'),
            replacement_id=data.get('replacement_id'),
            calendar_week=data.get('calendar_week')
        )
