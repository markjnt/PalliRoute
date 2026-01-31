from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
import os
from app.models.system_info import SystemInfo

bp = Blueprint('config', __name__)

@bp.route('/maps-api-key')
@cross_origin()
def get_maps_api_key():
    api_key = os.getenv('GOOGLE_MAPS_API_KEY', '')
    if not api_key:
        return jsonify({'error': 'API key not configured'}), 500
    return jsonify({'apiKey': api_key})

@bp.route('/last-import-time', methods=['GET'])
@cross_origin()
def get_last_import_time():
    """Get the last patient import time"""
    last_import_time = SystemInfo.get_value('last_patient_import_time')
    return jsonify({
        "last_import_time": last_import_time
    }), 200

@bp.route('/time-account-as-of', methods=['GET'])
@cross_origin()
def get_time_account_as_of():
    """Get the date of the current Stundenkonto stand (from last Excel upload)."""
    value = SystemInfo.get_value('time_account_as_of')
    return jsonify({'time_account_as_of': value}), 200


@bp.route('/last-import-time', methods=['POST'])
@cross_origin()
def update_last_import_time():
    """Update the last import time via API"""
    try:
        data = request.get_json()
        if not data or 'last_import_time' not in data:
            return jsonify({'error': 'last_import_time is required'}), 400
        
        last_import_time = data['last_import_time']
        SystemInfo.set_value('last_patient_import_time', last_import_time)
        
        return jsonify({'message': 'Last import time updated successfully', 'last_import_time': last_import_time}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to update last import time: {str(e)}'}), 500 