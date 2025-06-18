from flask import Blueprint, jsonify
from flask_cors import cross_origin
import os

bp = Blueprint('config', __name__)

@bp.route('/maps-api-key')
@cross_origin()
def get_maps_api_key():
    api_key = os.getenv('GOOGLE_MAPS_API_KEY', '')
    if not api_key:
        return jsonify({'error': 'API key not configured'}), 500
    return jsonify({'apiKey': api_key}) 