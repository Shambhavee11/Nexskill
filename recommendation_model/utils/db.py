"""
Database connection utility for NexSkill recommendation model.
Fetches user, skills, requests, and interaction data from PostgreSQL.
"""

import os
import psycopg2
import psycopg2.extras
import pandas as pd
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """Return a new PostgreSQL connection."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "nexskill_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
    )


def fetch_all_users() -> pd.DataFrame:
    """Fetch all users with their basic info."""
    sql = """
        SELECT
            u.id,
            u.full_name,
            u.rating,
            u.completed_projects,
            u.trust_score,
            u.credit_balance,
            u.is_premium,
            u.is_verified,
            u.created_at
        FROM users u
        WHERE u.is_verified = true
        ORDER BY u.created_at DESC
    """
    conn = get_connection()
    try:
        df = pd.read_sql_query(sql, conn)
        return df
    finally:
        conn.close()


def fetch_user_skills() -> pd.DataFrame:
    """Fetch all user skills (offered and needed)."""
    sql = """
        SELECT
            us.user_id,
            us.skill_name,
            us.skill_type,
            us.category,
            us.proficiency
        FROM user_skills us
        JOIN users u ON u.id = us.user_id
        WHERE u.is_verified = true
    """
    conn = get_connection()
    try:
        df = pd.read_sql_query(sql, conn)
        df['skill_name'] = df['skill_name'].str.lower().str.strip()
        return df
    finally:
        conn.close()


def fetch_completed_requests() -> pd.DataFrame:
    """Fetch all completed service requests (interaction history)."""
    sql = """
        SELECT
            sr.id         AS request_id,
            sr.requester_id,
            sr.provider_id,
            sr.skill_required,
            sr.credit_amount,
            sr.created_at,
            COALESCE(r.rating, 0)                          AS review_rating,
            COALESCE(r.professionalism, 0)                 AS review_professionalism,
            COALESCE(r.quality, 0)                         AS review_quality,
            COALESCE(r.timeliness, 0)                      AS review_timeliness
        FROM service_requests sr
        LEFT JOIN reviews r
            ON r.request_id = sr.id
            AND r.reviewer_id = sr.requester_id
        WHERE sr.status = 'completed'
          AND sr.provider_id IS NOT NULL
    """
    conn = get_connection()
    try:
        df = pd.read_sql_query(sql, conn)
        df['skill_required'] = df['skill_required'].str.lower().str.strip()
        return df
    finally:
        conn.close()


def fetch_user_by_id(user_id: str) -> dict:
    """Fetch a single user's full profile for recommendation context."""
    sql = """
        SELECT
            u.id, u.full_name, u.rating, u.completed_projects,
            u.trust_score, u.is_premium,
            COALESCE(
                json_agg(
                    json_build_object(
                        'skill_name', us.skill_name,
                        'skill_type', us.skill_type,
                        'category', us.category,
                        'proficiency', us.proficiency
                    )
                ) FILTER (WHERE us.id IS NOT NULL),
                '[]'
            ) AS skills
        FROM users u
        LEFT JOIN user_skills us ON us.user_id = u.id
        WHERE u.id = %s
        GROUP BY u.id
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()