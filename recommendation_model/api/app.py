"""
NexSkill Recommendation API
============================
Flask microservice exposing the recommendation engine over HTTP.
The Node.js backend calls this service to get recommendations.

Endpoints:
    GET  /recommend/<user_id>?top_n=8&skill=React
    GET  /similar/<user_id>?top_n=5
    POST /retrain          — re-fit the model (call after bulk data changes)
    GET  /health
"""
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import threading
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from recommendation_model.models.recommender import RecommendationEngine

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── Singleton engine instance ───────────────────────────────
engine = RecommendationEngine()
_engine_lock = threading.Lock()
_last_trained: datetime = None


def ensure_fitted():
    """Fit engine on first use (lazy loading)."""
    global _last_trained
    if not engine._fitted:
        with _engine_lock:
            if not engine._fitted:
                engine.fit()
                _last_trained = datetime.utcnow()


# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────

@app.route('/recommend/<user_id>', methods=['GET'])
def recommend(user_id: str):
    """
    Get top-N creator recommendations for a user.

    Query params:
        top_n    (int, default 8)   — number of results
        skill    (str, optional)    — filter by required skill
        exclude  (str, optional)    — comma-separated user IDs to exclude
    """
    try:
        ensure_fitted()

        top_n = int(request.args.get('top_n', 8))
        skill = request.args.get('skill', None)
        exclude_raw = request.args.get('exclude', '')
        exclude_ids = [e.strip() for e in exclude_raw.split(',') if e.strip()]

        top_n = max(1, min(top_n, 20))  # clamp to [1, 20]

        results = engine.recommend(
            user_id=user_id,
            top_n=top_n,
            exclude_ids=exclude_ids,
            required_skill=skill,
        )

        return jsonify({
            'success': True,
            'user_id': user_id,
            'count': len(results),
            'recommendations': results,
        })

    except Exception as e:
        app.logger.error(f"recommend error for {user_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/similar/<user_id>', methods=['GET'])
def similar(user_id: str):
    """
    Find users with similar skill profiles.

    Query params:
        top_n (int, default 5)
    """
    try:
        ensure_fitted()

        top_n = int(request.args.get('top_n', 5))
        top_n = max(1, min(top_n, 20))

        results = engine.similar_users(user_id=user_id, top_n=top_n)

        return jsonify({
            'success': True,
            'user_id': user_id,
            'count': len(results),
            'similar_users': results,
        })

    except Exception as e:
        app.logger.error(f"similar error for {user_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/retrain', methods=['POST'])
def retrain():
    """
    Retrain / refit the recommendation model.
    Accepts optional API key for security.
    """
    api_key = request.headers.get('X-API-Key', '')
    expected = os.getenv('REC_API_KEY', '')
    if expected and api_key != expected:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    global _last_trained
    try:
        with _engine_lock:
            engine._fitted = False
            engine.fit()
            _last_trained = datetime.utcnow()

        return jsonify({
            'success': True,
            'message': 'Model retrained successfully',
            'trained_at': _last_trained.isoformat(),
        })
    except Exception as e:
        app.logger.error(f"retrain error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'success': True,
        'service': 'NexSkill Recommendation Engine',
        'fitted': engine._fitted,
        'last_trained': _last_trained.isoformat() if _last_trained else None,
        'timestamp': datetime.utcnow().isoformat(),
    })


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'NexSkill Recommendation API',
        'endpoints': [
            'GET /recommend/<user_id>?top_n=8&skill=React',
            'GET /similar/<user_id>?top_n=5',
            'POST /retrain',
            'GET /health',
        ]
    })


# ─────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Pre-fit on startup
    print("🚀 Starting NexSkill Recommendation API...")
    ensure_fitted()

    port = int(os.getenv('REC_PORT', 8000))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    print(f"🌐 API running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)