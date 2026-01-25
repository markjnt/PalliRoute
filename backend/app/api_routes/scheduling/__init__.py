from flask import Blueprint

# Create the main scheduling blueprint
scheduling_bp = Blueprint('scheduling', __name__)

# Import all route modules to register their endpoints
from . import shift_definitions
from . import shift_instances
from . import employee_capacities
from . import assignments
