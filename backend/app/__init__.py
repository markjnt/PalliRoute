from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config
from .services.scheduler_service import scheduler_service

# Initialize SQLAlchemy
db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],  # Get allowed origins from config
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    scheduler_service.init_app(app)

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
    from .api_routes.employees import employees_bp
    from .api_routes.patients import patients_bp
    from .api_routes.appointments import appointments_bp
    from .api_routes.routes import routes_bp
    from .api_routes.config import bp as config_bp

    app.register_blueprint(employees_bp, url_prefix='/api/employees')
    app.register_blueprint(patients_bp, url_prefix='/api/patients')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(routes_bp, url_prefix='/api/routes')
    app.register_blueprint(config_bp, url_prefix='/api/config')

    # Auto-migrate database on startup
    with app.app_context():
        try:
            # Try to run migrations first
            from flask_migrate import upgrade
            upgrade()
        except Exception as e:
            # If migrations fail (first run), use create_all
            print(f"Migration not available, using create_all: {e}")
            db.create_all()

    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}
    
    @app.route('/scheduler/status')
    def scheduler_status():
        """Get scheduler status"""
        return jsonify(scheduler_service.get_status())
    
    @app.route('/scheduler/start', methods=['POST'])
    def start_scheduler():
        """Start the scheduler"""
        scheduler_service.start()
        return jsonify({'message': 'Scheduler started'})
    
    @app.route('/scheduler/stop', methods=['POST'])
    def stop_scheduler():
        """Stop the scheduler"""
        scheduler_service.stop()
        return jsonify({'message': 'Scheduler stopped'})

    return app