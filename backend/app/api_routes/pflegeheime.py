from flask import Blueprint, jsonify, current_app
import os
from app.models.pflegeheim import Pflegeheim
from app.services.excel_import_service import ExcelImportService

pflegeheime_bp = Blueprint('pflegeheime', __name__)


@pflegeheime_bp.route('/', methods=['GET'])
def get_pflegeheime():
    pflegeheime = Pflegeheim.query.all()
    return jsonify([p.to_dict() for p in pflegeheime]), 200


@pflegeheime_bp.route('/import', methods=['POST'])
def import_pflegeheime():
    file_path = current_app.config.get('PFLEGEHEIME_IMPORT_PATH')
    if not file_path:
        return jsonify({"error": "PFLEGEHEIME_IMPORT_PATH not configured"}), 400
    if not os.path.exists(file_path):
        return jsonify({"error": f"File not found: {file_path}"}), 400
    if not os.path.isfile(file_path):
        return jsonify({"error": f"Path is not a file: {file_path}"}), 400
    try:
        result = ExcelImportService.import_pflegeheime(file_path)
        added = result['added']
        updated = result['updated']
        removed = result['removed']
        total_processed = len(added) + len(updated) + len(removed)
        message_parts = []
        if added:
            message_parts.append(f"{len(added)} hinzugefügt")
        if updated:
            message_parts.append(f"{len(updated)} aktualisiert")
        if removed:
            message_parts.append(f"{len(removed)} entfernt")
        message = f"Import erfolgreich: {', '.join(message_parts)}" if message_parts else "Keine Änderungen erforderlich"
        return jsonify({
            "message": message,
            "summary": {
                "total_processed": total_processed,
                "added": len(added),
                "updated": len(updated),
                "removed": len(removed),
            },
            "added_pflegeheime": [p.to_dict() for p in added],
            "updated_pflegeheime": [p.to_dict() for p in updated],
            "removed_pflegeheime": [p.to_dict() for p in removed],
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
