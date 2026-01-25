from app import db


class ShiftInstance(db.Model):
    __tablename__ = "shift_instances"

    id = db.Column(db.Integer, primary_key=True)

    shift_definition_id = db.Column(
        db.Integer,
        db.ForeignKey("shift_definitions.id"),
        nullable=False,
    )

    date = db.Column(db.Date, nullable=False)
    calendar_week = db.Column(db.Integer, nullable=False)
    month = db.Column(db.String(7), nullable=False)  # "YYYY-MM"

    shift_definition = db.relationship("ShiftDefinition")

    __table_args__ = (
        db.UniqueConstraint(
            "shift_definition_id",
            "date",
            name="unique_shift_per_day",
        ),
    )

