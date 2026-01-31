-- Chrysalis Database Schema
-- Use this to initialize your MySQL database

CREATE TABLE IF NOT EXISTS lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_outcomes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  lesson_id INT NOT NULL,
  learning_outcome_id INT,
  question_type VARCHAR(50) NOT NULL,
  marks INT NOT NULL,
  question_text TEXT NOT NULL,
  answer_key TEXT,
  image_url TEXT,
  difficulty INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);