from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User

users_bp = Blueprint('users', __name__)

VALID_AREAS = ['Nordkreis', 'Südkreis', 'Nord- und Südkreis']

@users_bp.route('/', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@users_bp.route('/<int:id>', methods=['GET'])
def get_user(id):
    user = User.query.get_or_404(id)
    return jsonify(user.to_dict()), 200

@users_bp.route('/', methods=['POST'])
def create_user():
    data = request.get_json()
    
    if not data or 'name' not in data or 'area' not in data:
        return jsonify({"error": "Missing required fields: name, area"}), 400
    
    if data['area'] not in VALID_AREAS:
        return jsonify({"error": f"Invalid area. Must be one of: {', '.join(VALID_AREAS)}"}), 400
    
    new_user = User(name=data['name'], area=data['area'])
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify(new_user.to_dict()), 201

@users_bp.route('/<int:id>', methods=['PUT'])
def update_user(id):
    user = User.query.get_or_404(id)
    data = request.get_json()
    
    if 'name' in data:
        user.name = data['name']
    if 'area' in data:
        if data['area'] not in VALID_AREAS:
            return jsonify({"error": f"Invalid area. Must be one of: {', '.join(VALID_AREAS)}"}), 400
        user.area = data['area']
    
    db.session.commit()
    return jsonify(user.to_dict()), 200

@users_bp.route('/<int:id>', methods=['DELETE'])
def delete_user(id):
    user = User.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted successfully"}), 200