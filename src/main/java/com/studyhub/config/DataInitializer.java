package com.studyhub.config;

import com.studyhub.entity.Domain;
import com.studyhub.entity.KpEdge;
import com.studyhub.entity.KpNode;
import com.studyhub.entity.Question;
import com.studyhub.repository.DomainRepository;
import com.studyhub.repository.KpEdgeRepository;
import com.studyhub.repository.KpNodeRepository;
import com.studyhub.repository.QuestionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Component
@Order(1)
public class DataInitializer implements CommandLineRunner {
    private final DomainRepository domainRepository;
    private final QuestionRepository questionRepository;
    private final KpNodeRepository kpNodeRepository;
    private final KpEdgeRepository kpEdgeRepository;
    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public DataInitializer(DomainRepository domainRepository,
                           QuestionRepository questionRepository,
                           KpNodeRepository kpNodeRepository,
                           KpEdgeRepository kpEdgeRepository,
                           JdbcTemplate jdbcTemplate,
                           DataSource dataSource) {
        this.domainRepository = domainRepository;
        this.questionRepository = questionRepository;
        this.kpNodeRepository = kpNodeRepository;
        this.kpEdgeRepository = kpEdgeRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        migrateSchemaIfMysql();
        initBaseDomains();
        Domain caseDomain = ensureDomain("案例分析", "必备");
        Domain essayDomain = ensureDomain("论文写作", "必备");
        seedStarterKpGraph();
        seedStarterMcqQuestions();
        seedSubjectiveQuestions(caseDomain, essayDomain);
    }

    /** 仅在 MySQL 存量库执行列扩容迁移（H2 建表已按最新实体长度生成，跳过） */
    private void migrateSchemaIfMysql() {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName();
            if (product == null || !product.toLowerCase().contains("mysql")) {
                return;
            }
            jdbcTemplate.execute("ALTER TABLE answer_records MODIFY COLUMN user_answer VARCHAR(20) NOT NULL");
        } catch (Exception e) {
            log.debug("[Migration] answer_records.user_answer 跳过: {}", e.getMessage());
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

    /** 首次启动播种核心大纲知识图谱，避免新用户打开「知识图谱」白屏 */
    private void seedStarterKpGraph() {
        if (kpNodeRepository.count() > 0) return;

        List<KpNode> nodes = List.of(
            // 父层级节点
            new KpNode(100L, "计算机与系统基础", null, true, "高频", "软考系统架构设计师基础计算机硬件、操作系统与网络核心考点。", 0),
            new KpNode(200L, "数据库与缓存架构", null, true, "高频", "关系型数据库理论、事务隔离、索引优化与高并发多级缓存架构。", 0),
            new KpNode(300L, "软件架构与质量属性", null, true, "高频", "系统架构风格、质量属性效用树、ATAM 评估与微服务演进。", 0),
            new KpNode(400L, "工程实践与系统安全", null, true, "中频", "软件工程、设计模式、信息安全与项目管理核心理论。", 0),

            // 叶子考点
            new KpNode(101L, "指令流水线与性能计算", 100L, false, "高频", "流水线执行时间 = 首条指令各段之和 + (n - 1) × 最长段周期；吞吐率 = n / 执行时间。", 2),
            new KpNode(102L, "进程调度与 PV 信号量", 100L, false, "高频", "P 操作申请资源（S 减 1），V 操作释放资源（S 加 1）；S < 0 时绝对值为等待队列长度。", 3),
            new KpNode(103L, "网络协议与分层模型", 100L, false, "高频", "OSI 七层与 TCP/IP 四层对应关系、三次握手、DNS 迭代/递归查询、HTTP 状态码。", 4),

            new KpNode(201L, "数据库范式与函数依赖", 200L, false, "高频", "1NF 原子性 → 2NF 消除部分依赖 → 3NF 消除传递依赖 → BCNF 消除主属性依赖。", 1),
            new KpNode(202L, "事务隔离与 B+ 树索引", 200L, false, "高频", "读已提交防脏读、可重复读防不可重复读；B+ 树叶子节点链表支撑高效范围查询。", 2),
            new KpNode(203L, "多级缓存与高并发削峰", 200L, false, "高频", "缓存穿透（布隆过滤器/空值）、击穿（互斥锁/逻辑过期）、雪崩（随机 TTL/熔断），配合 MQ 异步削峰。", 1),

            new KpNode(301L, "软件架构风格与模式", 300L, false, "高频", "数据流（管道-过滤器）、调用/返回（分层/MVC）、独立构件（事件驱动）、微服务与云原生。", 3),
            new KpNode(302L, "质量属性与 ATAM 评估", 300L, false, "高频", "效用树驱动评估；敏感点影响单一质量属性，权衡点同时影响多个相互制约的质量属性。", 2),
            new KpNode(303L, "微服务拆分与分布式一致性", 300L, false, "高频", "基于 DDD 限界上下文拆分；跨服务一致性可选最终一致（可靠消息）、Saga/TCC、2PC。", 2),

            new KpNode(401L, "软件工程与测试覆盖", 400L, false, "中频", "判定覆盖包含语句覆盖；敏捷 Scrum 迭代 1-4 周；需求分为功能需求与质量属性需求。", 3),
            new KpNode(402L, "经典设计模式（GoF）", 400L, false, "高频", "创建型（单例/工厂方法）、结构型（代理/适配器）、行为型（观察者/策略），聚焦开闭原则与解耦。", 3),
            new KpNode(403L, "加密体系与数字签名", 400L, false, "高频", "对称加密（AES）效率高，非对称加密（RSA/ECC）用于密钥交换与数字签名（防篡改+身份认证）。", 2),
            new KpNode(404L, "风险管理与进度控制", 400L, false, "中频", "风险识别 → 评估 → 应对 → 监控；甘特图展示进度时间线，关键路径法（CPM）识别工期瓶颈。", 2)
        );
        kpNodeRepository.saveAll(nodes);

        if (kpEdgeRepository.count() == 0) {
            List<KpEdge> edges = List.of(
                new KpEdge(null, 102L, 202L, "semantic", 2, "并发互斥与数据库锁/事务隔离机制相通"),
                new KpEdge(null, 103L, 303L, "semantic", 2, "网络通信协议支撑微服务远程调用与治理"),
                new KpEdge(null, 202L, 203L, "semantic", 3, "索引优化与多级缓存共同解决高并发读瓶颈"),
                new KpEdge(null, 203L, 303L, "semantic", 3, "缓存、消息队列与微服务拆分常在高并发案例中组合考察"),
                new KpEdge(null, 301L, 302L, "semantic", 3, "架构风格选择直接决定质量属性权衡点与敏感点"),
                new KpEdge(null, 301L, 303L, "semantic", 3, "单体到微服务演进是高频架构风格变迁路径"),
                new KpEdge(null, 301L, 402L, "semantic", 2, "架构模式关注宏观结构，设计模式关注模块级解耦"),
                new KpEdge(null, 302L, 401L, "semantic", 2, "非功能需求通过质量属性场景转化为架构评估依据"),
                new KpEdge(null, 103L, 403L, "semantic", 2, "HTTPS/TLS 将对称加密、非对称加密与数字证书结合")
            );
            kpEdgeRepository.saveAll(edges);
        }
        log.info("[StarterPack] 已初始化 {} 个核心知识图谱考点", nodes.size());
    }

    /** 首次启动播种 25 道高频基础选择题（source=STARTER），让新用户开箱即可体验完整刷题/模拟/图谱闭环 */
    private void seedStarterMcqQuestions() {
        long existingMcq = questionRepository.findAll().stream()
            .filter(q -> q.getType() == null || q.getType().isEmpty() || "MCQ".equalsIgnoreCase(q.getType()))
            .count();
        if (existingMcq > 0) return;

        Map<String, Domain> byName = domainRepository.findAll().stream()
            .collect(Collectors.toMap(Domain::getName, d -> d, (a, b) -> a));

        Domain d1 = byName.get("计算机系统基础");
        Domain d2 = byName.get("操作系统");
        Domain d3 = byName.get("数据库技术");
        Domain d4 = byName.get("计算机网络");
        Domain d5 = byName.get("软件工程");
        Domain d6 = byName.get("架构设计");
        Domain d7 = byName.get("设计模式");
        Domain d8 = byName.get("系统安全");
        Domain d9 = byName.get("项目管理");
        if (d1 == null || d6 == null) return;

        List<Question> questions = new ArrayList<>();
        questions.add(mcq(d1, 101L, "某流水线由 5 个子部件组成，各段时间分别为 2ns、3ns、2ns、4ns、1ns。若连续执行 100 条指令，流水线执行时间为多少？", "[\"400ns\",\"408ns\",\"1200ns\",\"800ns\"]", "B", "流水线周期取最长段 4ns。执行时间 = 首条指令各段之和 (2+3+2+4+1 = 12ns) + (100 - 1) × 4ns = 12 + 396 = 408ns。"));
        questions.add(mcq(d1, 101L, "CRC 循环冗余校验中，若生成多项式为 G(x)=x^4+x+1，信息位为 1010，则 CRC 码的余数是？", "[\"0110\",\"1001\",\"1100\",\"0011\"]", "A", "信息位 1010 后补 4 个 0 得 10100000，除以生成多项式 10011，模 2 除法余数为 0110。"));
        questions.add(mcq(d2, 102L, "若系统中有 3 个进程共享一个互斥资源，信号量 S 的初值为 1，当 3 个进程都执行 P(S) 后，S 的值为？", "[\"-2\",\"-1\",\"0\",\"1\"]", "A", "P 操作使 S 减 1。3 个进程各执行一次 P，1 - 3 = -2。负数的绝对值表示等待队列中的进程数。"));
        questions.add(mcq(d2, 102L, "在页面置换算法中，哪种算法会产生 Belady 异常（增加物理块数反而缺页率上升）？", "[\"LRU\",\"FIFO\",\"OPT\",\"Clock\"]", "B", "FIFO 算法可能出现 Belady 异常，即增加物理块数反而导致缺页率上升。LRU 和 OPT 属于栈算法，不会出现此现象。"));
        questions.add(mcq(d2, 102L, "进程的三种基本状态中，哪个转换需要操作系统的调度？", "[\"就绪->运行\",\"运行->就绪\",\"运行->阻塞\",\"阻塞->就绪\"]", "A", "就绪->运行需要调度器从就绪队列选择一个进程分配 CPU，这个转换由调度程序完成。"));
        questions.add(mcq(d3, 201L, "在数据库设计中，消除非主属性对候选键传递函数依赖的范式是？", "[\"1NF\",\"2NF\",\"3NF\",\"BCNF\"]", "C", "3NF 要求消除非主属性对候选键的传递函数依赖。BCNF 进一步要求所有决定因素都是候选键。"));
        questions.add(mcq(d3, 202L, "SQL 事务隔离级别中，能防止脏读但不能防止不可重复读的是？", "[\"读未提交\",\"读已提交\",\"可重复读\",\"串行化\"]", "B", "读已提交（RC）防止脏读，但允许不可重复读。可重复读（RR）防止不可重复读。串行化防止所有并发问题。"));
        questions.add(mcq(d3, 202L, "B+ 树索引相比 B 树索引的主要优势是？", "[\"占用空间更小\",\"所有数据都在叶子节点，范围查询更高效\",\"插入删除更快\",\"支持更长的键值\"]", "B", "B+ 树所有数据记录指针都存储在叶子节点，叶子节点通过链表顺序相连，范围查询和顺序遍历更高效，且内部节点可容纳更多索引键降低树高。"));
        questions.add(mcq(d4, 103L, "TCP 建立连接的三次握手中，第二次握手报文的标志位是？", "[\"SYN\",\"SYN+ACK\",\"ACK\",\"FIN\"]", "B", "第二次握手服务器返回 SYN+ACK，表示同意连接并确认客户端的 SYN。第三次握手客户端发 ACK 确认。"));
        questions.add(mcq(d4, 103L, "OSI 参考模型中，路由器工作在哪一层？", "[\"物理层\",\"数据链路层\",\"网络层\",\"传输层\"]", "C", "路由器根据 IP 地址转发数据包，工作在网络层（第三层）。交换机工作在数据链路层，集线器在物理层。"));
        questions.add(mcq(d4, 103L, "DNS 域名解析过程中，本地域名服务器向根域名服务器发送的查询通常是？", "[\"递归查询\",\"迭代查询\",\"反向查询\",\"广播查询\"]", "B", "本地域名服务器向根服务器发送的通常是迭代查询，根服务器返回顶级域名服务器地址，由本地域名服务器继续查询。"));
        questions.add(mcq(d4, 103L, "HTTP 状态码 404 表示？", "[\"服务器内部错误\",\"请求成功\",\"资源未找到\",\"请求重定向\"]", "C", "404 Not Found 表示请求的资源在服务器上不存在。200 表示成功，500 表示服务器内部错误，302 表示临时重定向。"));
        questions.add(mcq(d5, 401L, "软件白盒测试中，语句覆盖和判定覆盖的关系是？", "[\"语句覆盖强于判定覆盖\",\"判定覆盖包含语句覆盖\",\"两者等价\",\"无关联\"]", "B", "判定覆盖（分支覆盖）要求每个判定的真假分支都至少执行一次，这必然覆盖所有可执行语句，即判定覆盖包含语句覆盖。"));
        questions.add(mcq(d5, 401L, "敏捷开发中，Scrum 的迭代周期（冲刺 Sprint）通常为？", "[\"1天\",\"1-4周\",\"3个月\",\"1年\"]", "B", "Scrum 冲刺（Sprint）通常为 1-4 周，以 2 周最为常见，每个冲刺结束交付潜在可发布的产品增量。"));
        questions.add(mcq(d5, 401L, "需求工程中，功能需求和非功能需求的主要区别是？", "[\"功能需求更重要\",\"功能需求描述系统做什么，非功能需求描述做得如何\",\"非功能需求不可量化\",\"功能需求只能由开发提出\"]", "B", "功能需求描述系统应提供的业务行为（做什么），非功能需求描述性能、安全、可用性、可修改性等质量属性（做得如何）。"));
        questions.add(mcq(d6, 301L, "MVC 架构模式中，Model 的主要职责是？", "[\"处理用户交互\",\"管理业务数据和业务逻辑\",\"渲染视图\",\"路由请求\"]", "B", "Model 负责封装核心业务数据与领域逻辑，View 负责展示，Controller 负责接收用户输入并协调 Model 和 View。"));
        questions.add(mcq(d6, 303L, "微服务架构相比单体架构引入的主要挑战是？", "[\"难以技术异构\",\"分布式系统的治理与一致性复杂性\",\"无法独立部署\",\"团队规模受限\"]", "B", "微服务引入了分布式系统的固有复杂性：服务间网络通信、分布式事务、最终一致性、链路追踪、自动化运维与监控等。"));
        questions.add(mcq(d6, 301L, "以下哪种架构风格最适合批处理或流式数据转换场景？", "[\"管道-过滤器\",\"客户端-服务器\",\"分层架构\",\"黑板架构\"]", "A", "管道-过滤器架构风格中，数据流经过一系列独立过滤器逐步变换并输出，具有高复用性与并发处理潜力，Unix 管道和编译器前端是典型应用。"));
        questions.add(mcq(d7, 402L, "Java 实现单例模式的双重检查锁定（DCL）需要使用 volatile 关键字，主要原因是？", "[\"提高锁性能\",\"防止对象初始化过程的指令重排序\",\"替代 synchronized\",\"防止反序列化破坏单例\"]", "B", "new 操作非原子，可能重排序为「分配内存 → 赋值引用 → 初始化对象」，其他线程可能读到半初始化对象。volatile 禁止重排序并保证可见性。"));
        questions.add(mcq(d7, 402L, "观察者模式（Observer）的核心设计意图是？", "[\"将复杂对象构建与表示分离\",\"定义对象间一对多依赖，主题状态变更时自动通知依赖者\",\"动态为对象添加额外职责\",\"封装算法族使其可互相替换\"]", "B", "观察者模式解耦发布者（Subject）与订阅者（Observer），状态变更时自动广播通知，是事件驱动架构的基础模式之一。"));
        questions.add(mcq(d7, 402L, "工厂方法模式相比简单工厂模式的主要优势是？", "[\"运行性能更高\",\"新增产品时无需修改原有工厂代码，符合开闭原则\",\"代码类数量更少\",\"支持创建产品族\"]", "B", "工厂方法将对象创建延迟到子类工厂，新增具体产品时只需扩展具体工厂类，不修改现有代码，符合开闭原则（OCP）。"));
        questions.add(mcq(d8, 403L, "以下哪种加密算法属于对称加密算法？", "[\"RSA\",\"AES\",\"ECC\",\"DSA\"]", "B", "AES 是对称加密（加解密使用同一密钥，适合大量数据加密）。RSA、ECC、DSA 均属于非对称密码体制。"));
        questions.add(mcq(d8, 403L, "数字签名（发送方私钥签名、接收方公钥验签）的主要作用是？", "[\"加密明文防窃听\",\"验证数据完整性、身份认证与抗抵赖\",\"压缩传输数据\",\"加速网络传输\"]", "B", "数字签名通过对消息摘要使用发送方私钥加密，接收方用公钥验证，实现身份认证、完整性校验与不可否认性（抗抵赖）。"));
        questions.add(mcq(d9, 404L, "项目管理中，风险管理流程的第一步是？", "[\"风险规避\",\"风险识别\",\"风险定量分析\",\"风险监控\"]", "B", "标准风险管理流程为：风险管理规划 → 风险识别 → 定性/定量风险分析 → 风险应对规划 → 风险监控。第一步是识别潜在风险。"));
        questions.add(mcq(d9, 404L, "甘特图（Gantt Chart）主要用于？", "[\"精确计算关键路径与浮动时间\",\"直观展示任务进度与起止时间线\",\"展示多维资源冲突\",\"分析风险因果关系\"]", "B", "甘特图以横向条形图直观呈现各任务的起止时间与当前进度，易于汇报沟通，但不擅长清晰表达复杂任务间的逻辑依赖关系。"));

        questionRepository.saveAll(questions);
        log.info("[StarterPack] 已初始化 {} 道精选示例选择题（source=STARTER）", questions.size());
    }

    private Question mcq(Domain domain, Long kpNodeId, String stem, String optionsJson, String answer, String analysis) {
        Question q = new Question();
        q.setSource("STARTER");
        q.setSubject("综合知识");
        q.setType("MCQ");
        q.setDomain(domain);
        q.setKpNodeId(kpNodeId);
        q.setStem(stem);
        q.setOptionsJson(optionsJson);
        q.setAnswer(answer);
        q.setAnalysis(analysis);
        q.setExamYear("2025");
        q.setSourceFile("starter-pack");
        return q;
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
        q.setKpNodeId(203L);
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
        q.setKpNodeId(302L);
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
        q.setKpNodeId(303L);
        q.setExamYear("2024");
        q.setStem("论微服务架构及其应用\n\n"
            + "随着互联网业务的快速发展，传统单体架构在可伸缩性、可维护性和交付效率等方面逐渐暴露出问题，"
            + "微服务架构通过服务的独立部署、独立伸缩和团队自治，成为大型分布式系统的主流架构风格。"
            + "请围绕\"微服务架构及其应用\"论题，依次对以下三个方面进行论述。\n"
            + "①概要叙述你参与管理和开发的软件项目，以及你在其中承担的主要工作。\n"
            + "②分析单体架构演进到微服务架构的驱动力，详细说明微服务拆分的方法与治理手段（注册发现、配置中心、链路追踪、服务网格等）。\n"
            + "③结合你参与的实际项目，具体阐述微服务架构落地过程中遇到的问题（如分布式事务、数据一致性、运维复杂度）及其解决方案，并说明实际效果。");
        q.setOptionsJson("["
            + "{\"label\":\"摘要\",\"req\":\"300字以内：项目背景+你的角色+采用的微服务相关技术+落地效果（量化），不写具体技术细节的展开\"},"
            + "{\"label\":\"正文\",\"req\":\"2200~2500字（机考硬限）：第一段项目概述（300字）；第二段理论（驱动力+拆分方法+治理体系，600字）；第三段实践（问题+方案+过程，1000字，全文核心）；第四段效果与不足反思（300字）\"},"
            + "{\"label\":\"硬性要求\",\"req\":\"必须有真实项目实践细节，判卷重点看第三部分；效果要有数据（发布频率、故障率、伸缩时间等）\"}"
            + "]");
        q.setAnswer("审题要点：题眼三个——驱动力（为什么拆）、拆分与治理（怎么拆怎么管）、实际问题与解决（拆了之后怎么办）。"
            + "三问必须全部覆盖，缺第三问实践部分基本不及格。\n\n"
            + "写作提纲：\n"
            + "①项目概述：电商订单中台/智能财务分析平台类项目，你任架构师，负责服务拆分设计与治理框架选型。\n"
            + "②理论段：驱动力=业务迭代快、团队规模扩大、单体发布互相阻塞、局部流量无法独立伸缩；"
            + "拆分=按 DDD 限界上下文划分，数据随服务走；"
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
        q.setKpNodeId(302L);
        q.setExamYear("2023");
        q.setStem("论软件系统架构评估方法及其应用\n\n"
            + "软件架构评估是在架构确定之后、系统实现之前对架构质量的系统性检查，是降低架构风险的重要手段。"
            + "常见的评估方法有 SAAM、ATAM、CBAM 等。请围绕\"软件系统架构评估方法及其应用\"论题，依次对以下三个方面进行论述。\n"
            + "①概要叙述你参与管理和开发的软件项目，以及你在其中承担的主要工作。\n"
            + "②详细论述 ATAM 方法的主要步骤，以及风险点、非风险点、敏感点、权衡点等关键概念。\n"
            + "③结合你参与的实际项目，具体阐述如何运用 ATAM 对系统架构进行评估，发现的问题及由此带来的架构改进。");
        q.setOptionsJson("["
            + "{\"label\":\"摘要\",\"req\":\"300字以内：项目+角色+采用的评估方法+评估发现的问题与改进效果\"},"
            + "{\"label\":\"正文\",\"req\":\"2200~2500字：项目概述、ATAM 方法与关键概念、评估实践过程（场景生成-效用树-架构分析-发现物-改进）、效果与总结\"},"
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
