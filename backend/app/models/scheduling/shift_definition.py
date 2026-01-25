from app import db


class ShiftDefinition(db.Model):
    __tablename__ = "shift_definitions"

    id = db.Column(db.Integer, primary_key=True)

    category = db.Column(db.String(20), nullable=False)
    # "RB_WEEKDAY" | "RB_WEEKEND" | "AW"

    role = db.Column(db.String(20), nullable=False)
    # "NURSING" | "DOCTOR"

    area = db.Column(db.String(20), nullable=False)
    # "Nord" | "Süd" | "Mitte"

    time_of_day = db.Column(db.String(10), nullable=False)
    # "DAY" | "NIGHT" | "NONE"

    is_weekday = db.Column(db.Boolean, nullable=False)
    is_weekend = db.Column(db.Boolean, nullable=False)

