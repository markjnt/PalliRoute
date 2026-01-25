from app import db


class EmployeeCapacity(db.Model):
    __tablename__ = "employee_capacities"

    id = db.Column(db.Integer, primary_key=True)

    employee_id = db.Column(
        db.Integer,
        db.ForeignKey("employees.id"),
        nullable=False,
    )

    capacity_type = db.Column(db.String(50), nullable=False)
    # "RB_NURSING_WEEKDAY"
    # "RB_NURSING_WEEKEND"   (Tag + Nacht zusammen!)
    # "RB_DOCTORS_WEEKDAY"
    # "RB_DOCTORS_WEEKEND"
    # "AW_NURSING"

    max_count = db.Column(db.Integer, nullable=False)

    employee = db.relationship("Employee")

    __table_args__ = (
        db.UniqueConstraint(
            "employee_id",
            "capacity_type",
            name="unique_employee_capacity",
        ),
    )

