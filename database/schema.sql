-- ============================================================
-- NEXSKILL: Credit-Based Skill Exchange Platform
-- PostgreSQL Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    credit_balance INTEGER DEFAULT 100 NOT NULL,
    rating DECIMAL(2,1) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 50,
    is_premium BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    otp_secret TEXT,
    otp_expires_at TIMESTAMP,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- USER SKILLS TABLE (skills offered & needed)
-- ============================================================
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_type VARCHAR(10) CHECK (skill_type IN ('offered', 'needed')) NOT NULL,
    category VARCHAR(50),
    proficiency VARCHAR(20) CHECK (proficiency IN ('beginner', 'intermediate', 'expert')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PORTFOLIO TABLE
-- ============================================================
CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    project_url TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SERVICE REQUESTS TABLE
-- ============================================================
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    skill_required VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    credit_amount INTEGER NOT NULL CHECK (credit_amount > 0),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed')),
    deadline DATE,
    attachments TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CREDIT TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20)
        CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund', 'signup_bonus')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    professionalism INTEGER CHECK (professionalism BETWEEN 1 AND 5),
    timeliness INTEGER CHECK (timeliness BETWEEN 1 AND 5),
    quality INTEGER CHECK (quality BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(reviewer_id, request_id)
);

-- ============================================================
-- MESSAGES TABLE (Chat)
-- ============================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CONVERSATIONS TABLE (for chat listing)
-- ============================================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMP DEFAULT NOW(),
    unread_count_user1 INTEGER DEFAULT 0,
    unread_count_user2 INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_type ON user_skills(skill_type);
CREATE INDEX idx_service_requests_requester ON service_requests(requester_id);
CREATE INDEX idx_service_requests_provider ON service_requests(provider_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_requests_updated_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Update user rating after review
-- ============================================================
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        rating = (
            SELECT ROUND(AVG(rating)::NUMERIC, 1)
            FROM reviews
            WHERE reviewee_id = NEW.reviewee_id
        ),
        total_reviews = (
            SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id
        )
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating
    AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- ============================================================
-- SEED DATA (Sample)
-- ============================================================
INSERT INTO users (id, full_name, email, password_hash, bio, credit_balance, rating, completed_projects, is_verified)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000001', 'Alex Chen', 'alex@nexskill.com',
     '$2b$10$example_hash_1', 'Full-stack developer passionate about scalable web apps.', 100, 4.8, 23, true),
    ('a1b2c3d4-0000-0000-0000-000000000002', 'Sarah Miller', 'sarah@nexskill.com',
     '$2b$10$example_hash_2', 'Creative designer with 5+ years in product design.', 80, 4.6, 18, true),
    ('a1b2c3d4-0000-0000-0000-000000000003', 'James Wilson', 'james@nexskill.com',
     '$2b$10$example_hash_3', 'Data scientist specializing in ML and predictive analytics.', 60, 4.9, 31, true);

INSERT INTO user_skills (user_id, skill_name, skill_type, category, proficiency) VALUES
    ('a1b2c3d4-0000-0000-0000-000000000001', 'React', 'offered', 'Development', 'expert'),
    ('a1b2c3d4-0000-0000-0000-000000000001', 'TypeScript', 'offered', 'Development', 'expert'),
    ('a1b2c3d4-0000-0000-0000-000000000001', 'Node.js', 'offered', 'Development', 'expert'),
    ('a1b2c3d4-0000-0000-0000-000000000001', 'UI/UX Design', 'needed', 'Design', NULL),
    ('a1b2c3d4-0000-0000-0000-000000000002', 'UI/UX Design', 'offered', 'Design', 'expert'),
    ('a1b2c3d4-0000-0000-0000-000000000002', 'Graphic Design', 'offered', 'Design', 'expert'),
    ('a1b2c3d4-0000-0000-0000-000000000002', 'Photography', 'offered', 'Media', 'intermediate'),
    ('a1b2c3d4-0000-0000-0000-000000000003', 'Python', 'offered', 'Development', 'expert'),
    ('a1b2c3d4-0000-0000-0000-000000000003', 'Machine Learning', 'offered', 'AI/ML', 'expert'),
    ('a1b2c3d4-0000-0000-0000-000000000003', 'Data Science', 'offered', 'AI/ML', 'expert');
