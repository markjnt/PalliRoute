from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

# Initialize SQLAlchemy
db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],  # Frontend development server
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Initialize extensions
    db.init_app(app)

    # Register error handlers
    @app.errorhandler(400)
    def bad_request_error(error):
        return jsonify({'error': 'Bad Request', 'message': str(error)}), 400

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'error': 'Not Found', 'message': str(error)}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal Server Error', 'message': str(error)}), 500

    # Register blueprints
    from .routes.users import users_bp
    from .routes.employees import employees_bp
    from .routes.patients import patients_bp
    from .routes.appointments import appointments_bp
    from .routes.routes import routes_bp
    from .routes.config import bp as config_bp

    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(employees_bp, url_prefix='/api/employees')
    app.register_blueprint(patients_bp, url_prefix='/api/patients')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(routes_bp, url_prefix='/api/routes')
    app.register_blueprint(config_bp, url_prefix='/api/config')

    # Create database tables
    with app.app_context():
        db.create_all()

    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}

    return app