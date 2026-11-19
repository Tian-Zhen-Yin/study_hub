package com.studyhub.repository;

import com.studyhub.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByDomainId(Long domainId);

    List<Question> findBySource(String source);

    List<Question> findByExamYear(String examYear);

    List<Question> findBySubject(String subject);

    @Query(value = "SELECT * FROM questions WHERE domain_id = :domainId AND source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') AND flag_type IS NULL ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Question> findRandomByDomain(@Param("domainId") Long domainId, @Param("count") int count);

    @Query("SELECT COUNT(q) FROM Question q WHERE q.domain.id = :domainId AND q.source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') AND q.flagType IS NULL")
    long countByDomainId(@Param("domainId") Long domainId);

    @Query(value = "SELECT * FROM questions WHERE source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') AND flag_type IS NULL ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Question> findRandomAcrossAll(@Param("count") int count);

    /** 全真模拟·综合知识：只抽客观单选题（排除案例/论文题型） */
    @Query(value = "SELECT * FROM questions WHERE source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') AND flag_type IS NULL " +
           "AND (question_type = '' OR question_type = 'MCQ') ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Question> findRandomMcqAcrossAll(@Param("count") int count);

    /** 按知识域抽单选题（真实配额抽题用） */
    @Query(value = "SELECT * FROM questions WHERE domain_id = :domainId AND source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') " +
           "AND flag_type IS NULL AND (question_type = '' OR question_type = 'MCQ') ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Question> findRandomMcqByDomain(@Param("domainId") Long domainId, @Param("count") int count);

    /** 按导入文件抽单选题（知识产权/标准化等未独立成域的配额桶） */
    @Query(value = "SELECT * FROM questions WHERE source_file = :sourceFile AND source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') " +
           "AND flag_type IS NULL AND (question_type = '' OR question_type = 'MCQ') ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Question> findRandomMcqBySourceFile(@Param("sourceFile") String sourceFile, @Param("count") int count);

    /** 从全池随机补齐，排除已抽中的题 */
    @Query(value = "SELECT * FROM questions WHERE source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') AND flag_type IS NULL " +
           "AND (question_type = '' OR question_type = 'MCQ') AND id NOT IN (:excludeIds) ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Question> findRandomMcqExcluding(@Param("excludeIds") List<Long> excludeIds, @Param("count") int count);

    /** 全真模拟·案例分析：纯 CASE 题 */
    @Query(value = "SELECT * FROM questions WHERE question_type = 'CASE' AND source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') AND flag_type IS NULL ORDER BY RAND()", nativeQuery = true)
    List<Question> findActiveCaseQuestions();

    /** 全真模拟·论文：纯 ESSAY 题 */
    @Query(value = "SELECT * FROM questions WHERE question_type = 'ESSAY' AND source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') AND flag_type IS NULL ORDER BY RAND()", nativeQuery = true)
    List<Question> findActiveEssayQuestions();

    @Query("SELECT COUNT(q) FROM Question q WHERE q.source NOT IN ('OUTDATED', 'MOCK', 'ARCH_EXCL') AND q.flagType IS NULL")
    long countAllActive();

    List<Question> findByFlagTypeIsNotNull();

    /** 历年真题：按试卷题号排序 */
    List<Question> findByPaperIdOrderByExamSortAsc(Long paperId);

    /** 知识图谱：考点下题目，按年份倒序 */
    List<Question> findByKpNodeIdOrderByExamYearDesc(Long kpNodeId);

    /** 图谱共现边计算：已归入试卷和考点的题目 */
    List<Question> findByPaperIdIsNotNullAndKpNodeIdIsNotNull();

    /** 知识图谱：考点×考试科目(架构师/分析师)的真题数量，用于按考试过滤 */
    @Query(value = "SELECT q.kp_node_id, p.subject, COUNT(*) FROM questions q " +
           "JOIN exam_papers p ON q.paper_id = p.id " +
           "WHERE q.kp_node_id IS NOT NULL GROUP BY q.kp_node_id, p.subject", nativeQuery = true)
    List<Object[]> countByKpAndSubject();
}
