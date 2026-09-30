-- =============================================================================
-- Academic Connect — Student profile catalog seed
-- Chunk 05: skills, interests, research_areas, languages
--
-- Populates a modest, curated starting catalog for the Student Academic
-- Profile domain (see docs/student-profiles.md) — enough for a working
-- profile-building experience without inventing hundreds of speculative
-- entries. Platform administrators extend this catalog later (a future
-- chunk's concern, per docs/student-profiles.md, "Known limitations");
-- for now it is seeded the same way roles/permissions are.
--
-- Idempotent: safe to run multiple times (ON DUPLICATE KEY UPDATE /
-- re-resolving parent_id by slug rather than a hardcoded id).
--
-- Usage:
--   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_catalog.sql
-- =============================================================================

-- ---- Skills -----------------------------------------------------------------
INSERT INTO skills (uuid, name, slug, category, status) VALUES
  (UUID(), 'Python', 'python', 'PROGRAMMING', 'ACTIVE'),
  (UUID(), 'JavaScript', 'javascript', 'PROGRAMMING', 'ACTIVE'),
  (UUID(), 'Java', 'java', 'PROGRAMMING', 'ACTIVE'),
  (UUID(), 'C++', 'cpp', 'PROGRAMMING', 'ACTIVE'),
  (UUID(), 'SQL', 'sql', 'DATABASE', 'ACTIVE'),
  (UUID(), 'MongoDB', 'mongodb', 'DATABASE', 'ACTIVE'),
  (UUID(), 'React', 'react', 'WEB', 'ACTIVE'),
  (UUID(), 'Node.js', 'nodejs', 'WEB', 'ACTIVE'),
  (UUID(), 'Flutter', 'flutter', 'MOBILE', 'ACTIVE'),
  (UUID(), 'Swift', 'swift', 'MOBILE', 'ACTIVE'),
  (UUID(), 'TensorFlow', 'tensorflow', 'AI_ML', 'ACTIVE'),
  (UUID(), 'PyTorch', 'pytorch', 'AI_ML', 'ACTIVE'),
  (UUID(), 'Machine Learning', 'machine-learning', 'AI_ML', 'ACTIVE'),
  (UUID(), 'AWS', 'aws', 'CLOUD', 'ACTIVE'),
  (UUID(), 'Docker', 'docker', 'CLOUD', 'ACTIVE'),
  (UUID(), 'Kubernetes', 'kubernetes', 'CLOUD', 'ACTIVE'),
  (UUID(), 'Data Analysis', 'data-analysis', 'DATA', 'ACTIVE'),
  (UUID(), 'Data Visualization', 'data-visualization', 'DATA', 'ACTIVE'),
  (UUID(), 'Figma', 'figma', 'DESIGN', 'ACTIVE'),
  (UUID(), 'UI/UX Design', 'ui-ux-design', 'DESIGN', 'ACTIVE'),
  (UUID(), 'Academic Writing', 'academic-writing', 'RESEARCH', 'ACTIVE'),
  (UUID(), 'Statistical Analysis', 'statistical-analysis', 'RESEARCH', 'ACTIVE'),
  (UUID(), 'Project Management', 'project-management', 'BUSINESS', 'ACTIVE'),
  (UUID(), 'Public Speaking', 'public-speaking', 'COMMUNICATION', 'ACTIVE'),
  (UUID(), 'Technical Writing', 'technical-writing', 'COMMUNICATION', 'ACTIVE'),
  (UUID(), 'Git', 'git', 'OTHER', 'ACTIVE'),
  (UUID(), 'Linux', 'linux', 'OTHER', 'ACTIVE')
ON DUPLICATE KEY UPDATE category = VALUES(category), status = VALUES(status);

-- ---- Academic interests -------------------------------------------------------
INSERT INTO interests (uuid, name, slug, category, status) VALUES
  (UUID(), 'Artificial Intelligence', 'artificial-intelligence', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'Healthcare', 'healthcare', 'HEALTH', 'ACTIVE'),
  (UUID(), 'Cybersecurity', 'cybersecurity', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'Computer Vision', 'computer-vision', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'Natural Language Processing', 'natural-language-processing', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'Robotics', 'robotics', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'FinTech', 'fintech', 'BUSINESS', 'ACTIVE'),
  (UUID(), 'Data Science', 'data-science', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'Climate Technology', 'climate-technology', 'SUSTAINABILITY', 'ACTIVE'),
  (UUID(), 'Renewable Energy', 'renewable-energy', 'SUSTAINABILITY', 'ACTIVE'),
  (UUID(), 'EdTech', 'edtech', 'EDUCATION', 'ACTIVE'),
  (UUID(), 'Blockchain', 'blockchain', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'Human-Computer Interaction', 'human-computer-interaction', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'Space Technology', 'space-technology', 'TECHNOLOGY', 'ACTIVE'),
  (UUID(), 'Social Impact', 'social-impact', 'SOCIAL', 'ACTIVE')
ON DUPLICATE KEY UPDATE category = VALUES(category), status = VALUES(status);

-- ---- Research areas (hierarchical) --------------------------------------------
-- Pass 1: insert every node with no parent yet (idempotent by slug).
INSERT INTO research_areas (uuid, name, slug, status) VALUES
  (UUID(), 'Artificial Intelligence', 'ra-artificial-intelligence', 'ACTIVE'),
  (UUID(), 'Machine Learning', 'ra-machine-learning', 'ACTIVE'),
  (UUID(), 'Deep Learning', 'ra-deep-learning', 'ACTIVE'),
  (UUID(), 'Reinforcement Learning', 'ra-reinforcement-learning', 'ACTIVE'),
  (UUID(), 'Natural Language Processing', 'ra-natural-language-processing', 'ACTIVE'),
  (UUID(), 'Computer Vision', 'ra-computer-vision', 'ACTIVE'),
  (UUID(), 'Cybersecurity', 'ra-cybersecurity', 'ACTIVE'),
  (UUID(), 'Network Security', 'ra-network-security', 'ACTIVE'),
  (UUID(), 'Cryptography', 'ra-cryptography', 'ACTIVE'),
  (UUID(), 'Data Science', 'ra-data-science', 'ACTIVE'),
  (UUID(), 'Big Data Analytics', 'ra-big-data-analytics', 'ACTIVE'),
  (UUID(), 'Healthcare Research', 'ra-healthcare-research', 'ACTIVE'),
  (UUID(), 'Bioinformatics', 'ra-bioinformatics', 'ACTIVE'),
  (UUID(), 'Medical Imaging', 'ra-medical-imaging', 'ACTIVE'),
  (UUID(), 'Robotics', 'ra-robotics', 'ACTIVE')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

-- Pass 2: wire up parent_id by slug, never by a hardcoded id — safe to
-- re-run, and independent of insertion order/auto-increment values.
UPDATE research_areas child
  JOIN research_areas parent ON parent.slug = 'ra-artificial-intelligence'
  SET child.parent_id = parent.id
  WHERE child.slug IN ('ra-machine-learning', 'ra-natural-language-processing', 'ra-computer-vision');

UPDATE research_areas child
  JOIN research_areas parent ON parent.slug = 'ra-machine-learning'
  SET child.parent_id = parent.id
  WHERE child.slug IN ('ra-deep-learning', 'ra-reinforcement-learning');

UPDATE research_areas child
  JOIN research_areas parent ON parent.slug = 'ra-cybersecurity'
  SET child.parent_id = parent.id
  WHERE child.slug IN ('ra-network-security', 'ra-cryptography');

UPDATE research_areas child
  JOIN research_areas parent ON parent.slug = 'ra-data-science'
  SET child.parent_id = parent.id
  WHERE child.slug IN ('ra-big-data-analytics');

UPDATE research_areas child
  JOIN research_areas parent ON parent.slug = 'ra-healthcare-research'
  SET child.parent_id = parent.id
  WHERE child.slug IN ('ra-bioinformatics', 'ra-medical-imaging');

-- ---- Languages ------------------------------------------------------------------
INSERT INTO languages (uuid, name, code, status) VALUES
  (UUID(), 'English', 'en', 'ACTIVE'),
  (UUID(), 'Spanish', 'es', 'ACTIVE'),
  (UUID(), 'French', 'fr', 'ACTIVE'),
  (UUID(), 'German', 'de', 'ACTIVE'),
  (UUID(), 'Mandarin Chinese', 'zh', 'ACTIVE'),
  (UUID(), 'Arabic', 'ar', 'ACTIVE'),
  (UUID(), 'Hindi', 'hi', 'ACTIVE'),
  (UUID(), 'Urdu', 'ur', 'ACTIVE'),
  (UUID(), 'Portuguese', 'pt', 'ACTIVE'),
  (UUID(), 'Russian', 'ru', 'ACTIVE'),
  (UUID(), 'Japanese', 'ja', 'ACTIVE'),
  (UUID(), 'Korean', 'ko', 'ACTIVE'),
  (UUID(), 'Italian', 'it', 'ACTIVE'),
  (UUID(), 'Bengali', 'bn', 'ACTIVE'),
  (UUID(), 'Turkish', 'tr', 'ACTIVE')
ON DUPLICATE KEY UPDATE status = VALUES(status);
