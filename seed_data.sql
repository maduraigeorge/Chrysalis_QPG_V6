-- Chrysalis Sample Data Flooding Script
-- Targets: Mathematics Grade 1
-- Requirements: 5 Lessons, 5 LOs per Lesson, 30 Questions per LO (5 per type)

USE chrysalis_db;

-- 1. Clean existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE questions;
TRUNCATE TABLE learning_outcomes;
TRUNCATE TABLE lessons;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. Insert Grade 10 Samples (for consistency)
INSERT INTO lessons (id, subject, grade, title) VALUES
(100, 'Mathematics', 'Grade 10', 'Algebraic Identities'),
(101, 'Science', 'Grade 10', 'Cell Structure');

INSERT INTO learning_outcomes (id, lesson_id, description) VALUES
(1000, 100, 'Solve quadratic equations using factoring'),
(1001, 101, 'Identify parts of a plant cell');

-- 3. Procedure to flood Grade 1 Math
DELIMITER //

CREATE PROCEDURE FloodGrade1Math()
BEGIN
    DECLARE lesson_counter INT DEFAULT 1;
    DECLARE lo_counter INT DEFAULT 1;
    DECLARE q_type_idx INT;
    DECLARE q_count INT;
    DECLARE current_lesson_id INT;
    DECLARE current_lo_id INT;
    DECLARE q_text TEXT;
    DECLARE q_type VARCHAR(50);
    
    -- 5 Lessons for Grade 1 Math
    WHILE lesson_counter <= 5 DO
        INSERT INTO lessons (subject, grade, title) 
        VALUES ('Mathematics', 'Grade 1', 
            CASE lesson_counter 
                WHEN 1 THEN 'Counting to 100'
                WHEN 2 THEN 'Adding within 20'
                WHEN 3 THEN 'Subtracting within 20'
                WHEN 4 THEN 'Shapes & Space'
                ELSE 'Time & Measurement' 
            END);
        SET current_lesson_id = LAST_INSERT_ID();
        
        -- 5 LOs per Lesson
        SET lo_counter = 1;
        WHILE lo_counter <= 5 DO
            INSERT INTO learning_outcomes (lesson_id, description)
            VALUES (current_lesson_id, CONCAT('Mastery Skill ', lo_counter, ' for ', 
                (SELECT title FROM lessons WHERE id = current_lesson_id)));
            SET current_lo_id = LAST_INSERT_ID();
            
            -- Questions: 6 Types, 5 Questions per Type = 30 Questions per LO
            SET q_type_idx = 1;
            WHILE q_type_idx <= 6 DO
                SET q_type = CASE q_type_idx 
                    WHEN 1 THEN 'MCQ'
                    WHEN 2 THEN 'True/False'
                    WHEN 3 THEN 'Short Answer'
                    WHEN 4 THEN 'Long Answer'
                    WHEN 5 THEN 'Fill in the Blanks'
                    ELSE 'Match the Following' 
                END;
                
                SET q_count = 1;
                WHILE q_count <= 5 DO
                    INSERT INTO questions (subject, grade, lesson_id, learning_outcome_id, question_type, marks, question_text, answer_key, difficulty)
                    VALUES (
                        'Mathematics', 
                        'Grade 1', 
                        current_lesson_id, 
                        current_lo_id, 
                        q_type,
                        CASE WHEN q_type = 'Long Answer' THEN 5 WHEN q_type = 'Short Answer' THEN 2 ELSE 1 END,
                        CONCAT('Grade 1 Math Problem (', q_type, ' #', q_count, '): What is ', lesson_counter + lo_counter + q_count, ' plus one? This tests your understanding of ', q_type, ' style logic.'),
                        CONCAT('Result: ', lesson_counter + lo_counter + q_count + 1),
                        (q_count % 3) + 1
                    );
                    SET q_count = q_count + 1;
                END WHILE;
                
                SET q_type_idx = q_type_idx + 1;
            END WHILE;
            
            SET lo_counter = lo_counter + 1;
        END WHILE;
        
        SET lesson_counter = lesson_counter + 1;
    END WHILE;
END //

DELIMITER ;

-- 4. Execute Flooding
CALL FloodGrade1Math();

-- 5. Cleanup
DROP PROCEDURE FloodGrade1Math;

SELECT 'SUCCESS: Database flooded with ~750 Questions for Grade 1 Math' as Result;
