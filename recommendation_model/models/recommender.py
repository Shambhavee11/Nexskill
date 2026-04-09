"""
NexSkill Recommendation Engine
================================
Hybrid model combining:
  1. Content-Based Filtering  — skill overlap (exact + category + TF-IDF)
  2. Collaborative Filtering  — user-user similarity from interaction history
  3. Reputation Score         — rating, trust score, completed projects

Final score = weighted sum of all three components.

Usage:
    engine = RecommendationEngine()
    engine.fit()                         # load data & train
    recs = engine.recommend(user_id)     # get top-N recommendations
"""

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Optional

from recommendation_model.utils.db import fetch_all_users, fetch_user_skills, fetch_completed_requests, fetch_user_by_id
from recommendation_model.utils.features import (
    build_skill_matrix,
    build_needed_skill_vector,
    build_offered_skill_vector,
    skill_overlap_score,
    category_overlap_score,
    build_tfidf_skill_vectors,
    build_interaction_matrix,
    normalize_scores,
)


# ── Weights for the hybrid score ──────────────────────────────
WEIGHT_SKILL_OVERLAP  = 0.35   # exact skill match
WEIGHT_CATEGORY       = 0.10   # category-level match
WEIGHT_TFIDF          = 0.15   # TF-IDF content similarity
WEIGHT_COLLAB         = 0.20   # collaborative filtering
WEIGHT_REPUTATION     = 0.20   # rating + trust + projects


class RecommendationEngine:
    """
    Hybrid recommendation engine for NexSkill.
    Call `.fit()` once at startup (or periodically), then `.recommend()` per request.
    """

    def __init__(self):
        self.users_df       : Optional[pd.DataFrame] = None
        self.skills_df      : Optional[pd.DataFrame] = None
        self.requests_df    : Optional[pd.DataFrame] = None
        self.tfidf_matrix   = None
        self.tfidf_vectorizer = None
        self.tfidf_user_ids : List[str] = []
        self.interaction_matrix: Optional[pd.DataFrame] = None
        self.reputation_scores : Dict[str, float] = {}
        self._fitted = False

    # ─────────────────────────────────────────────────────────────
    # FIT
    # ─────────────────────────────────────────────────────────────
    def fit(self):
        """Load data from DB and build all model components."""
        print("🔄 Loading data from database...")
        self.users_df    = fetch_all_users()
        self.skills_df   = fetch_user_skills()
        self.requests_df = fetch_completed_requests()

        if self.users_df.empty:
            print("⚠️  No users found — model not fitted.")
            return

        print(f"   Users: {len(self.users_df)} | Skills: {len(self.skills_df)} | Requests: {len(self.requests_df)}")

        # 1. TF-IDF matrix
        self.tfidf_matrix, self.tfidf_vectorizer, self.tfidf_user_ids = \
            build_tfidf_skill_vectors(self.skills_df, self.users_df)

        # 2. Interaction matrix (collaborative filtering)
        self.interaction_matrix = build_interaction_matrix(self.requests_df, self.users_df)

        # 3. Reputation scores
        self.reputation_scores = self._compute_reputation_scores()

        self._fitted = True
        print("✅ Recommendation engine fitted successfully.")

    # ─────────────────────────────────────────────────────────────
    # RECOMMEND
    # ─────────────────────────────────────────────────────────────
    def recommend(
        self,
        user_id: str,
        top_n: int = 8,
        exclude_ids: Optional[List[str]] = None,
        required_skill: Optional[str] = None,
    ) -> List[Dict]:
        """
        Generate top-N creator recommendations for a given user.

        Args:
            user_id:        ID of the user requesting recommendations
            top_n:          Number of recommendations to return
            exclude_ids:    User IDs to exclude from results
            required_skill: If set, only recommend users offering this skill

        Returns:
            List of dicts with keys: user_id, full_name, score, breakdown, skills, rating
        """
        if not self._fitted:
            self.fit()

        # Fetch user's current profile
        user_profile = fetch_user_by_id(user_id)
        if not user_profile:
            return []

        user_skills_list = user_profile.get('skills', [])
        user_needs  = build_needed_skill_vector(user_skills_list)
        user_offers = build_offered_skill_vector(user_skills_list)

        exclude = set(exclude_ids or []) | {user_id}

        # All candidate users
        candidates = self.users_df[~self.users_df['id'].isin(exclude)].copy()

        if candidates.empty:
            return []

        # Optional filter: must offer a specific skill
        if required_skill:
            skill_lower = required_skill.lower().strip()
            users_with_skill = self.skills_df[
                (self.skills_df['skill_type'] == 'offered') &
                (self.skills_df['skill_name'].str.lower() == skill_lower)
            ]['user_id'].unique()
            candidates = candidates[candidates['id'].isin(users_with_skill)]

        if candidates.empty:
            return []

        scores = {}
        breakdowns = {}

        for _, cand in candidates.iterrows():
            cid = cand['id']

            # Candidate's skills
            cand_skills_list = self.skills_df[self.skills_df['user_id'] == cid].to_dict('records')
            cand_offers = build_offered_skill_vector(cand_skills_list)

            # 1. Skill overlap (exact)
            s_overlap = skill_overlap_score(user_needs, cand_offers)

            # 2. Category overlap
            s_category = category_overlap_score(user_skills_list, cand_skills_list)

            # 3. TF-IDF similarity
            s_tfidf = self._tfidf_similarity(user_id, cid, user_needs)

            # 4. Collaborative filtering
            s_collab = self._collab_score(user_id, cid)

            # 5. Reputation
            s_rep = self.reputation_scores.get(cid, 0.0)

            # Weighted sum
            total = (
                WEIGHT_SKILL_OVERLAP * s_overlap  +
                WEIGHT_CATEGORY      * s_category +
                WEIGHT_TFIDF         * s_tfidf    +
                WEIGHT_COLLAB        * s_collab   +
                WEIGHT_REPUTATION    * s_rep
            )

            scores[cid] = total
            breakdowns[cid] = {
                'skill_overlap':  round(s_overlap,  3),
                'category_match': round(s_category, 3),
                'tfidf_sim':      round(s_tfidf,    3),
                'collab':         round(s_collab,   3),
                'reputation':     round(s_rep,      3),
                'total':          round(total,      4),
            }

        # Sort by score
        sorted_ids = sorted(scores, key=scores.get, reverse=True)[:top_n]

        # Build result list
        results = []
        for cid in sorted_ids:
            row = self.users_df[self.users_df['id'] == cid].iloc[0]
            offered_skills = self.skills_df[
                (self.skills_df['user_id'] == cid) &
                (self.skills_df['skill_type'] == 'offered')
            ][['skill_name', 'category', 'proficiency']].to_dict('records')

            results.append({
                'user_id':            cid,
                'full_name':          row['full_name'],
                'rating':             float(row['rating'] or 0),
                'completed_projects': int(row['completed_projects'] or 0),
                'trust_score':        int(row['trust_score'] or 50),
                'is_premium':         bool(row['is_premium']),
                'offered_skills':     offered_skills,
                'recommendation_score': round(scores[cid], 4),
                'score_breakdown':    breakdowns[cid],
            })

        return results

    # ─────────────────────────────────────────────────────────────
    # SIMILAR USERS  (for "people like you also worked with...")
    # ─────────────────────────────────────────────────────────────
    def similar_users(self, user_id: str, top_n: int = 5) -> List[Dict]:
        """
        Find users with similar skill profiles (TF-IDF cosine similarity).
        Useful for "similar creators" sidebar.
        """
        if not self._fitted:
            self.fit()

        if user_id not in self.tfidf_user_ids:
            return []

        idx = self.tfidf_user_ids.index(user_id)
        user_vec = self.tfidf_matrix[idx]
        sims = cosine_similarity(user_vec, self.tfidf_matrix).flatten()

        # Sort and exclude self
        top_indices = np.argsort(sims)[::-1]
        results = []
        for i in top_indices:
            cid = self.tfidf_user_ids[i]
            if cid == user_id:
                continue
            row = self.users_df[self.users_df['id'] == cid]
            if row.empty:
                continue
            row = row.iloc[0]
            results.append({
                'user_id':    cid,
                'full_name':  row['full_name'],
                'rating':     float(row['rating'] or 0),
                'similarity': round(float(sims[i]), 4),
            })
            if len(results) >= top_n:
                break

        return results

    # ─────────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ─────────────────────────────────────────────────────────────
    def _compute_reputation_scores(self) -> Dict[str, float]:
        """
        Compute normalised reputation score for each user.
        Combines: rating (0-5), trust_score (0-100), completed_projects.
        """
        df = self.users_df.copy()
        df['rating']             = df['rating'].fillna(0).astype(float)
        df['trust_score']        = df['trust_score'].fillna(50).astype(float)
        df['completed_projects'] = df['completed_projects'].fillna(0).astype(float)

        # Normalise each component to [0,1]
        for col in ['rating', 'trust_score', 'completed_projects']:
            col_max = df[col].max()
            if col_max > 0:
                df[col + '_norm'] = df[col] / col_max
            else:
                df[col + '_norm'] = 0.0

        # Weighted rep score
        df['rep'] = (
            0.50 * df['rating_norm'] +
            0.30 * df['trust_score_norm'] +
            0.20 * df['completed_projects_norm']
        )

        return dict(zip(df['id'], df['rep']))

    def _tfidf_similarity(self, user_id: str, cand_id: str, user_needs: list) -> float:
        """
        TF-IDF cosine similarity between user's NEEDS document and candidate's OFFERS document.
        Falls back to 0 if user not in TF-IDF index.
        """
        if not user_needs or cand_id not in self.tfidf_user_ids:
            return 0.0

        # Build a query vector from user's needed skills
        query_doc = ' '.join(user_needs)
        try:
            query_vec = self.tfidf_vectorizer.transform([query_doc])
        except Exception:
            return 0.0

        cand_idx = self.tfidf_user_ids.index(cand_id)
        cand_vec = self.tfidf_matrix[cand_idx]

        sim = cosine_similarity(query_vec, cand_vec).flatten()[0]
        return float(np.clip(sim, 0, 1))

    def _collab_score(self, user_id: str, cand_id: str) -> float:
        """
        Collaborative filtering score using user-user similarity.

        Strategy: find users similar to `user_id` (based on who they've worked with),
        then check how highly those similar users rated `cand_id`.
        """
        if self.interaction_matrix is None:
            return 0.0
        if user_id not in self.interaction_matrix.index:
            return 0.0
        if cand_id not in self.interaction_matrix.columns:
            return 0.0

        # User's interaction vector
        user_vec = self.interaction_matrix.loc[user_id].values.reshape(1, -1)

        # All other users' vectors
        all_vecs = self.interaction_matrix.values

        # If user has no interactions, return 0
        if user_vec.sum() == 0:
            return 0.0

        # Cosine similarity with all users
        with np.errstate(divide='ignore', invalid='ignore'):
            sims = cosine_similarity(user_vec, all_vecs).flatten()

        # Weight other users' ratings of cand_id by similarity
        cand_col_idx = self.interaction_matrix.columns.tolist().index(cand_id)
        cand_ratings = self.interaction_matrix.iloc[:, cand_col_idx].values

        # Only consider users who have rated this candidate
        mask = cand_ratings > 0
        if not mask.any():
            return 0.0

        weighted_sum = np.dot(sims[mask], cand_ratings[mask])
        sim_sum = np.abs(sims[mask]).sum()

        if sim_sum == 0:
            return 0.0

        predicted = weighted_sum / sim_sum
        # Normalise from [0,5] to [0,1]
        return float(np.clip(predicted / 5.0, 0, 1))