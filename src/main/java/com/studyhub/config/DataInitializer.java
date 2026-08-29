package com.studyhub.config;

import com.studyhub.entity.Domain;
import com.studyhub.entity.Question;
import com.studyhub.repository.DomainRepository;
import com.studyhub.repository.QuestionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Optional;

@Component
@Order(1)
public class DataInitializer implements CommandLineRunner {
    private final DomainRepository domainRepository;
    private final QuestionRepository questionRepository;
    private final JdbcTemplate jdbcTemplate;

    public DataInitializer(DomainRepository domainRepository, QuestionRepository questionRepository,
                           JdbcTemplate jdbcTemplate) {
        this.domainRepository = domainRepository;
        this.questionRepository = questionRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        migrateSchema();
        initBaseDomains();
        Domain caseDomain = ensureDomain("案例分析", "必备");
        Domain essayDomain = ensureDomain("论文写作", "必备");
        seedSubjectiveQuestions(caseDomain, essayDomain);
    }

    /** 手动 schema 迁移（ddl-auto:update 不会扩容已存在列） */
    private void migrateSchema() {
        try {
            // 主观题自评等级 SELF_PARTIAL(12字符) 超出原 varchar(10)
            jdbcTemplate.execute("ALTER TABLE answer_records MODIFY COLUMN user_answer VARCHAR(20) NOT NULL");
        } catch (Exception e) {
            // 已是目标类型或权限不足时忽略，不影响启动
            System.out.println("[Migration] answer_records.user_answer 跳过: " + e.getMessage());
        }
    }

    /** 首次启动时初始化 9 个基础知识领域 */
    private void initBaseDomains() {
        if (domainRepository.count() > 0) return;
        List<Domain> domains = List.of(
            new Domain(null, "计算机系统基础", 0, "掌握", "待诊断"),
            new Domain(null, "操作系统", 0, "掌握", "待诊断"),
            new Domain(null, "数据库技术", 0, "必备", "待诊断"),
            new Domain(null, "计算机网络", 0, "掌握", "待诊断"),
            new Domain(null, "软件工程", 0, "必备", "待诊断"),
            new Domain(null, "架构设计", 0, "必备", "待诊断"),
            new Domain(null, "设计模式", 0, "必备", "待诊断"),
            new Domain(null, "系统安全", 0, "掌握", "待诊断"),
            new Domain(null, "项目管理", 0, "了解", "待诊断")
        );
        domainRepository.saveAll(domains);
    }

    /** 按名字幂等确保主观题领域存在（已有数据时也会补充新节点） */
    private Domain ensureDomain(String name, String priority) {
        Optional<Domain> existing = domainRepository.findByName(name);
        if (existing.isPresent()) return existing.get();
        Domain d = new Domain(null, name, 0, priority, "待诊断");
        return domainRepository.save(d);
    }

    /** 案例分析/论文写作种子真题：仅当对应领域无题时插入，幂等 */
    private void seedSubjectiveQuestions(Domain caseDomain, Domain essayDomain) {
        if (questionRepository.findByDomainId(caseDomain.getId()).isEmpty()) {
            questionRepository.saveAll(List.of(buildCase1(caseDomain), buildCase2(caseDomain)));
        }
        if (questionRepository.findByDomainId(essayDomain.getId()).isEmpty()) {
            questionRepository.saveAll(List.of(buildEssay1(essayDomain), buildEssay2(essayDomain)));
        }
    }

    private Question buildCase1(Domain d) {
        Question q = new Question();
        q.setSource("SEED");
        q.setSubject("案例分析");
        q.setType("CASE");
        q.setDomain(d);
        q.setExamYear("2024");
        q.setStem("阅读以下关于某电商平台\"促销秒杀系统\"架构演进的说明，回答问题。\n\n"
            + "某软件公司为电商客户开发的促销秒杀系统，最初采用传统三层架构（Nginx + 应用服务器集群 + MySQL 主从）。"
            + "在大促期间暴露出严重问题：开抢瞬间流量达到日常的 50 倍，数据库连接池耗尽、行锁竞争激烈导致大量订单超时，"
            + "甚至引发主从延迟和缓存雪崩，页面可用性跌至 70%。\n\n"
            + "架构组决定重构：接入层引入限流与排队，热点数据多级缓存（本地缓存 + Redis），"
            + "下单链路通过消息队列异步化，库存扣减改为 Redis 预扣 + 数据库最终一致，并按业务拆分为商品、库存、订单、支付等微服务。\n\n"
            + "【问题】（25分）");
        q.setOptionsJson("["
            + "{\"no\":1,\"q\":\"从质量属性角度分析原三层架构在秒杀场景下的主要问题（至少三个属性，结合场景说明）。\",\"score\":8},"
            + "{\"no\":2,\"q\":\"新架构中：①引入多级缓存主要解决什么问题，需防范哪些风险？②说明消息队列\"削峰填谷\"的原理，以及下单异步化后如何保证用户体验与数据一致性。\",\"score\":9},"
            + "{\"no\":3,\"q\":\"微服务拆分的服务边界划分原则是什么？拆分后跨服务的订单-库存一致性问题可采用哪些方案？说明各自适用场景。\",\"score\":8}"
            + "]");
        q.setAnswer("【问题1】①性能：单库行锁竞争、连接池耗尽，响应时间剧增；②可用性：雪崩效应导致服务不可用（70%）；"
            + "③可伸缩性：应用层可水平扩展但数据库层难以扩展，成为瓶颈；④可修改性：单体耦合，大促类瞬时高并发场景难以针对性优化。\n\n"
            + "【问题2】①多级缓存解决热点数据的读性能问题，将 95%+ 读请求挡在数据库之外；风险：缓存穿透（空值缓存/布隆过滤器）、"
            + "缓存雪崩（过期时间加随机值/多级容灾）、缓存与库一致性（延迟双删/订阅 binlog）。②削峰原理：请求先入队，消费者按数据库"
            + "可持续的处理速率消费，把瞬时峰值摊平为平稳流量；用户体验靠排队页+轮询/长连接回执；一致性靠消息持久化、幂等消费、"
            + "失败补偿与对账。\n\n"
            + "【问题3】拆分原则：单一职责、按业务能力（DDD 限界上下文）划分、团队自治（康威定律）、数据私有、高内聚低耦合、"
            + "避免分布式单体。跨服务一致性方案：①最终一致（消息+幂等+补偿，适合秒杀下单）；②TCC/Saga（长流程、需编排）；"
            + "③2PC/XA（强一致但性能差，仅适合并发低的内部场景）；④可靠消息模式（事务消息/本地消息表）。");
        q.setAnalysis("评分要点：问题1 每个属性 2 分，须结合秒杀场景描述，只罗列属性概念不得全分；"
            + "问题2 削峰原理 4 分（入队、按速率消费、峰值摊平），缓存风险每个 2 分；"
            + "问题3 拆分原则答出 3 条得 3 分，一致性方案每个 2 分并说明适用场景。"
            + "阅卷常见扣分：混淆缓存穿透与雪崩、TCC 与 Saga 不区分适用场景。");
        return q;
    }

    private Question buildCase2(Domain d) {
        Question q = new Question();
        q.setSource("SEED");
        q.setSubject("案例分析");
        q.setType("CASE");
        q.setDomain(d);
        q.setExamYear("2023");
        q.setStem("阅读以下关于某航空公司订票系统架构评估（ATAM）的说明，回答问题。\n\n"
            + "某航空公司核心订票系统拟进行架构改造，改造后的系统要求：支持高峰期 10 万并发查询、订票成功率 99.9%、"
            + "退改签业务变化频繁（预计每年 30% 的规则调整）、航班数据多渠道分发（官网/APP/代理）。"
            + "架构师给出了候选架构：微服务 + 读写分离 + CQRS + 事件驱动分发。\n\n"
            + "评估组采用 ATAM 方法进行架构评估，构建了质量属性效用树，部分场景如下：\n"
            + "（S1）高峰期查询响应时间 ≤ 200ms（高优先级）\n"
            + "（S2）订票链路任一服务故障不导致整体不可用（高优先级）\n"
            + "（S3）退改签规则变更在 1 周内完成上线（中优先级）\n"
            + "（S4）航班数据变更 3 秒内同步到所有渠道（中优先级）\n\n"
            + "【问题】（25分）");
        q.setOptionsJson("["
            + "{\"no\":1,\"q\":\"说明质量属性效用树在 ATAM 中的作用，并将 S1~S4 场景归类到对应的质量属性。\",\"score\":7},"
            + "{\"no\":2,\"q\":\"指出候选架构中针对 S1、S2 的架构决策分别属于敏感点还是权衡点，并说明理由。\",\"score\":9},"
            + "{\"no\":3,\"q\":\"简述 ATAM 评估的主要步骤，以及风险点、非风险点、敏感点、权衡点四类发现物的含义。\",\"score\":9}"
            + "]");
        q.setAnswer("【问题1】效用树作用：把相关者关心的质量属性需求组织成\"属性-属性细分-场景\"的树状结构，"
            + "按重要性×难度排序，聚焦高优先级场景驱动评估。归类：S1→性能（效率）；S2→可用性/可靠性；"
            + "S3→可修改性；S4→一致性/性能（数据分发时效，一般归为性能或可修改性均可，须说明理由）。\n\n"
            + "【问题2】读写分离+CQRS 针对读多写少提升 S1 查询性能，属于敏感点（对性能响应明显）；"
            + "微服务拆分提升 S2 可用性（故障隔离），但增加分布式复杂度、降低可修改性/可测试性，属于权衡点"
            + "（同时影响多个质量属性，一升一降）；事件驱动分发对 S4 时效敏感，也属敏感点。"
            + "答对\"敏感点=单属性显著影响、权衡点=多属性此消彼长\"的判别标准是关键。\n\n"
            + "【问题3】ATAM 步骤：①介绍 ATAM 方法；②介绍商业动机；③介绍架构；④识别架构方法；⑤生成效用树；"
            + "⑥分析架构方法（识别敏感点/权衡点）；⑦头脑风暴并确定场景优先级；⑧再次分析架构方法；⑨呈现结果。"
            + "四类发现物：风险点=危及某质量属性的架构决策；非风险点=经分析不会危及质量属性的决策；"
            + "敏感点=对单一质量属性影响显著的设计点；权衡点=影响多个质量属性且相互制约的设计点。");
        q.setAnalysis("评分要点：问题1 效用树作用 3 分、归类每个 1 分；问题2 S1 敏感点 3 分、S2 权衡点 4 分"
            + "（必须写明影响多个属性才算权衡点）、S4 敏感点 2 分；问题3 步骤答出 6 步以上得 5 分、四类发现物每个 1 分。"
            + "高频失分：把所有架构决策都答成权衡点，缺少\"多属性相互制约\"的判定。");
        return q;
    }

    private Question buildEssay1(Domain d) {
        Question q = new Question();
        q.setSource("SEED");
        q.setSubject("论文");
        q.setType("ESSAY");
        q.setDomain(d);
        q.setExamYear("2024");
        q.setStem("论微服务架构及其应用\n\n"
            + "随着互联网业务的快速发展，传统单体架构在可伸缩性、可维护性和交付效率等方面逐渐暴露出问题，"
            + "微服务架构通过服务的独立部署、独立伸缩和团队自治，成为大型分布式系统的主流架构风格。"
            + "请围绕\"微服务架构及其应用\"论题，依次对以下三个方面进行论述。\n"
            + "①概要叙述你参与管理和开发的软件项目，以及你在其中承担的主要工作。"
            + "②分析单体架构演进到微服务架构的驱动力，详细说明微服务拆分的方法与治理手段（注册发现、配置中心、链路追踪、服务网格等）。"
            + "③结合你参与的实际项目，具体阐述微服务架构落地过程中遇到的问题（如分布式事务、数据一致性、运维复杂度）及其解决方案，并说明实际效果。");
        q.setOptionsJson("["
            + "{\"label\":\"摘要\",\"req\":\"320字以内：项目背景+你的角色+采用的微服务相关技术+落地效果（量化），不写具体技术细节的展开\"},"
            + "{\"label\":\"正文\",\"req\":\"2200~2800字：第一段项目概述（300字）；第二段理论（驱动力+拆分方法+治理体系，700字）；第三段实践（问题+方案+过程，900字，全文核心）；第四段效果与不足反思（300字）\"},"
            + "{\"label\":\"硬性要求\",\"req\":\"必须有真实项目实践细节，判卷重点看第三部分；效果要有数据（发布频率、故障率、伸缩时间等）\"}"
            + "]");
        q.setAnswer("审题要点：题眼三个——驱动力（为什么拆）、拆分与治理（怎么拆怎么管）、实际问题与解决（拆了之后怎么办）。"
            + "三问必须全部覆盖，缺第三问实践部分基本不及格。\n\n"
            + "写作提纲：\n"
            + "①项目概述：电商订单中台/会员平台类项目（日订单百万级），你任架构师，负责服务拆分设计与治理框架选型。\n"
            + "②理论段：驱动力=业务迭代快、团队规模扩大、单体发布互相阻塞、局部流量无法独立伸缩；"
            + "拆分=按 DDD 限界上下文划分（订单/库存/支付/营销），数据随服务走；"
            + "治理=注册发现（Nacos）、配置中心、网关、链路追踪（SkyWalking）、熔断限流（Sentinel）、CI/CD 独立流水线。\n"
            + "③实践段（重点）：分布式事务采用本地消息表+可靠消息最终一致；测试环境治理用契约测试；"
            + "故障排查用全链路日志与 traceID；灰度发布解决发布风险。\n"
            + "④效果：发布周期从双周到按天、大促扩容从小时级到分钟级、故障影响面从全站降到单服务。");
        q.setAnalysis("论文评分维度（满分75，45及格）：①摘要（10分）：是否概括项目+技术+效果，字数是否达标；"
            + "②正文结构（20分）：四段式完整、理论实践比例得当；③实践真实度（30分）：有无真实项目细节、"
            + "问题描述具体、方案合理可行；④文字表达（15分）：条理、字数、卷面。"
            + "常见不及格原因：全文堆砌理论无实践、实践与理论脱节、字数不足 2000、摘要写成正文缩写。");
        return q;
    }

    private Question buildEssay2(Domain d) {
        Question q = new Question();
        q.setSource("SEED");
        q.setSubject("论文");
        q.setType("ESSAY");
        q.setDomain(d);
        q.setExamYear("2023");
        q.setStem("论软件系统架构评估方法及其应用\n\n"
            + "软件架构评估是在架构确定之后、系统实现之前对架构质量的系统性检查，是降低架构风险的重要手段。"
            + "常见的评估方法有 SAAM、ATAM、CBAM 等。请围绕\"软件系统架构评估方法及其应用\"论题，依次对以下三个方面进行论述。\n"
            + "①概要叙述你参与管理和开发的软件项目，以及你在其中承担的主要工作。"
            + "②详细论述 ATAM 方法的主要步骤，以及风险点、非风险点、敏感点、权衡点等关键概念。"
            + "③结合你参与的实际项目，具体阐述如何运用 ATAM 对系统架构进行评估，发现的问题及由此带来的架构改进。");
        q.setOptionsJson("["
            + "{\"label\":\"摘要\",\"req\":\"320字以内：项目+角色+采用的评估方法+评估发现的问题与改进效果\"},"
            + "{\"label\":\"正文\",\"req\":\"2200~2800字：项目概述、ATAM 方法与关键概念、评估实践过程（场景生成-效用树-架构分析-发现物-改进）、效果与总结\"},"
            + "{\"label\":\"硬性要求\",\"req\":\"第三部分须有具体的评估过程：至少 2 个场景、明确的敏感点/权衡点识别结果、具体的架构改进措施\"}"
            + "]");
        q.setAnswer("审题要点：核心是\"用 ATAM 评估真实项目\"，必须有评估过程和发现物，纯理论复述得分很低。\n\n"
            + "写作提纲：\n"
            + "①项目概述：如保险核心业务系统/物流调度平台，你任架构师或评估组织者。\n"
            + "②理论段：ATAM 九个步骤（分介绍/调查分析/测试三阶段）；四类发现物定义；效用树的作用。\n"
            + "③实践段（重点）：场景头脑风暴收集 20 个场景投票取前 6；构建效用树示例（性能：高峰响应≤500ms 高/难；"
            + "可用性：核心链路 99.99% 高/中；可修改性：费率规则 2 周内上线 中/易）；"
            + "分析发现：数据库单点是风险点；读写分离对性能是敏感点；微服务拆分是可用性与一致性/可测试性的权衡点；"
            + "引入多级缓存是性能与一致性的权衡点；改进措施：双机房容灾、缓存架构调整、费率规则引擎化。\n"
            + "④效果：上线后高峰期故障率下降、规则变更周期缩短，验证评估有效性。");
        q.setAnalysis("评分维度同论文通用标准。本题高频失分：只写 ATAM 理论步骤而无项目评估实例；"
            + "混淆敏感点与权衡点；效用树场景没有优先级标注；改进措施与发现的问题不对应。");
        return q;
    }
}
