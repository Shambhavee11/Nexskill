"""
Feature engineering for NexSkill recommendation model.
Builds feature vectors from user skills, ratings, and interaction history.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer


def build_skill_matrix(users_df: pd.DataFrame, skills_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build a binary user-skill matrix for offered skills.

    Returns:
        DataFrame where rows = users, columns = skill names (binary 0/1)
    """
    offered = skills_df[skills_df['skill_type'] == 'offered'].copy()

    # Pivot to binary matrix
    offered['value'] = 1
    matrix = offered.pivot_table(
        index='user_id',
        columns='skill_name',
        values='value',
        aggfunc='max',
        fill_value=0
    )

    # Align with all users
    matrix = matrix.reindex(users_df['id'], fill_value=0)
    return matrix


def build_needed_skill_vector(user_skills: list) -> list:
    """
    Extract the list of skills a user needs (lowercase).
    """
    return [s['skill_name'].lower().strip()
            for s in user_skills if s['skill_type'] == 'needed']


def build_offered_skill_vector(user_skills: list) -> list:
    """
    Extract the list of skills a user offers (lowercase).
    """
    return [s['skill_name'].lower().strip()
            for s in user_skills if s['skill_type'] == 'offered']


def skill_overlap_score(user_needs: list, candidate_offers: list) -> float:
    """
    Jaccard-style overlap: how many of user's needs are covered by candidate's offers.
    Returns value in [0, 1].
    """
    if not user_needs or not candidate_offers:
        return 0.0
    user_set = set(user_needs)
    cand_set = set(candidate_offers)
    intersection = user_set & cand_set
    # Weighted: all needed skills vs matched
    return len(intersection) / len(user_set)


def category_overlap_score(user_skills: list, candidate_skills: list) -> float:
    """
    Category-level overlap (softer match even if exact skill names differ).
    """
    user_needed_cats = {s['category'] for s in user_skills
                        if s['skill_type'] == 'needed' and s.get('category')}
    cand_offered_cats = {s['category'] for s in candidate_skills
                         if s['skill_type'] == 'offered' and s.get('category')}

    if not user_needed_cats or not cand_offered_cats:
        return 0.0
    intersection = user_needed_cats & cand_offered_cats
    return len(intersection) / len(user_needed_cats)


def build_tfidf_skill_vectors(skills_df: pd.DataFrame, users_df: pd.DataFrame):
    """
    Build TF-IDF vectors from skill names for content-based similarity.
    Each user's offered skills are concatenated into a 'document'.
    """
    offered = skills_df[skills_df['skill_type'] == 'offered']
    user_skill_docs = (
        offered.groupby('user_id')['skill_name']
        .apply(lambda x: ' '.join(x))
        .reset_index()
        .rename(columns={'skill_name': 'skill_doc'})
    )

    # Align with all users
    user_skill_docs = users_df[['id']].merge(
        user_skill_docs, left_on='id', right_on='user_id', how='left'
    ).fillna('')

    vectorizer = TfidfVectorizer(analyzer='word', ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(user_skill_docs['skill_doc'])
    return tfidf_matrix, vectorizer, user_skill_docs['id'].tolist()


def build_interaction_matrix(requests_df: pd.DataFrame, users_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build a user-user interaction matrix from completed requests.
    Value = review rating (if given), else 3 (neutral) for completed.
    Used for collaborative filtering.
    """
    if requests_df.empty:
        # Return empty matrix
        user_ids = users_df['id'].tolist()
        return pd.DataFrame(0.0, index=user_ids, columns=user_ids)

    # Use rating or default 3.0 for unrated completions
    requests_df = requests_df.copy()
    requests_df['effective_rating'] = requests_df['review_rating'].apply(
        lambda r: r if r > 0 else 3.0
    )

    matrix = requests_df.pivot_table(
        index='requester_id',
        columns='provider_id',
        values='effective_rating',
        aggfunc='mean',
        fill_value=0
    )

    all_ids = users_df['id'].tolist()
    matrix = matrix.reindex(index=all_ids, columns=all_ids, fill_value=0)
    return matrix


def normalize_scores(scores: dict) -> dict:
    """Normalize a score dict to [0, 1] range."""
    if not scores:
        return scores
    vals = np.array(list(scores.values()), dtype=float)
    min_v, max_v = vals.min(), vals.max()
    if max_v == min_v:
        return {k: 1.0 for k in scores}
    return {k: float((v - min_v) / (max_v - min_v)) for k, v in scores.items()}