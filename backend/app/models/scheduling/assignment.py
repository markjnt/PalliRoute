from app import db


class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.Integer, primary_key=True)

    employee_id = db.Column(
        db.Integer,
        db.ForeignKey("employees.id"),
        nullable=False,
    )

    shift_instance_id = db.Column(
        db.Integer,
        db.ForeignKey("shift_instances.id"),
        nullable=False,
    )

    source = db.Column(db.String(20), nullable=False)  # "SOLVER" | "MANUAL"

    employee = db.relationship("Employee")
    shift_instance = db.relationship("ShiftInstance")

    __table_args__ = (
        db.UniqueConstraint(
            "employee_id",
            "shift_instance_id",
            name="unique_employee_shift_instance",
        ),
    )

