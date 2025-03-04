from app import db
from datetime import datetime
import json

class Route(db.Model):
    __tablename__ = 'routes'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    weekday = db.Column(db.String(20), nullable=False)
    route_order = db.Column(db.Text, nullable=False)  # JSON Array of appointment ids
    total_duration = db.Column(db.Integer, nullable=False)  # in minutes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_route_order(self, appointment_ids):
        self.route_order = json.dumps(appointment_ids)
        
    def get_route_order(self):
        if self.route_order:
            return json.loads(self.route_order)
        return []
        
    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'weekday': self.weekday,
            'route_order': self.get_route_order(),
            'total_duration': self.total_duration,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
