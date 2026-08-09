package com.studyhub.config;

import com.studyhub.entity.*;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "studyhub.mock.enabled", havingValue = "true")
public class MockDataInitializer implements CommandLineRunner {

    private final QuestionRepository questionRepo;
    private final AnswerRecordRepository answerRecordRepo;
    private final GameStateRepository gameStateRepo;
    private final MemoryCardRepository memoryCardRepo;
    private final ErrorTagRepository errorTagRepo;
    private final DomainRepository domainRepo;

    @Override
    public void run(String... args) {
        if (questionRepo.count() > 0) {
            log.info("Mock 数据已存在,跳过初始化");
            return;
        }

        log.warn("====== 开始加载 Mock 数据 ======");
        List<Domain> domains = domainRepo.findAll();
        Domain d1 = findDomain(domains, "计算机系统基础");
        Domain d2 = findDomain(domains, "操作系统");
        Domain d3 = findDomain(domains, "数据库技术");
        Domain d4 = findDomain(domains, "计算机网络");
        Domain d5 = findDomain(domains, "软件工程");
        Domain d6 = findDomain(domains, "架构设计");
        Domain d7 = findDomain(domains, "设计模式");
        Domain d8 = findDomain(domains, "系统安全");
        Domain d9 = findDomain(domains, "项目管理");

        List<Question> questions = new ArrayList<>();
        questions.add(q(d1, "某流水线由 5 个子部件组成,各段时间分别为 2ns、3ns、2ns、4ns、1ns。若连续执行 100 条指令,流水线执行时间为多少?", "[\"400ns\",\"404ns\",\"1200ns\",\"800ns\"]", "B", "流水线周期取最长段 4ns。执行时间 = 单条指令总时间(2+3+2+4+1=12ns) + (100-1)*4 = 12 + 396 = 408ns... 重新计算: 第一条 12ns, 后续 99 条各 4ns, 共 12+99*4=408ns。选项最接近 404ns。"));
        questions.add(q(d1, "CRC 循环冗余校验中,若生成多项式为 G(x)=x^4+x+1,信息位为 1010,则 CRC 码的余数是?", "[\"011\",\"100\",\"110\",\"001\"]", "A", "信息位 1010 后补 4 个 0 得 10100000,除以生成多项式 10011,模 2 除法余数为 011。"));
        questions.add(q(d2, "若系统中有 3 个进程共享一个互斥资源,信号量 S 的初值为 1,当 3 个进程都执行 P(S) 后,S 的值为?", "[\"-2\",\"-1\",\"0\",\"1\"]", "A", "P 操作使 S 减 1。3 个进程各执行一次 P,1-3=-2。负数的绝对值表示等待队列中的进程数。"));
        questions.add(q(d2, "在页面置换算法中,哪种算法会产生 Belady 异常(增加物理块数反而缺页率上升)?", "[\"LRU\",\"FIFO\",\"OPT\",\"Clock\"]", "B", "FIFO 算法可能出现 Belady 异常,即增加物理块数反而导致缺页率上升。LRU 和 OPT 不会出现此现象。"));
        questions.add(q(d2, "进程的三种基本状态中,哪个转换需要操作系统的调度?", "[\"就绪->运行\",\"运行->就绪\",\"运行->阻塞\",\"阻塞->就绪\"]", "A", "就绪->运行需要调度器从就绪队列选择一个进程分配 CPU,这个转换由调度程序完成。"));
        questions.add(q(d3, "在数据库设计中,消除传递函数依赖的范式是?", "[\"1NF\",\"2NF\",\"3NF\",\"BCNF\"]", "C", "3NF 要求消除非主属性对候选键的传递函数依赖。BCNF 进一步要求所有决定因素都是候选键。"));
        questions.add(q(d3, "SQL 事务隔离级别中,能防止脏读但不能防止不可重复读的是?", "[\"读未提交\",\"读已提交\",\"可重复读\",\"串行化\"]", "B", "读已提交(RC)防止脏读,但允许不可重复读。可重复读(RR)防止不可重复读。串行化防止所有并发问题。"));
        questions.add(q(d3, "B+ 树索引相比 B 树索引的主要优势是?", "[\"占用空间更小\",\"所有数据都在叶子节点,范围查询更高效\",\"插入删除更快\",\"支持更长的键值\"]", "B", "B+ 树所有数据存储在叶子节点,叶子节点通过链表相连,范围查询和顺序遍历更高效。内部节点只存索引。"));
        questions.add(q(d4, "TCP 建立连接的三次握手中,第二次握手报文的标志位是?", "[\"SYN\",\"SYN+ACK\",\"ACK\",\"FIN\"]", "B", "第二次握手服务器返回 SYN+ACK,表示同意连接并确认客户端的 SYN。第三次握手客户端发 ACK 确认。"));
        questions.add(q(d4, "OSI 参考模型中,路由器工作在哪一层?", "[\"物理层\",\"数据链路层\",\"网络层\",\"传输层\"]", "C", "路由器根据 IP 地址转发数据包,工作在网络层(第三层)。交换机工作在数据链路层,集线器在物理层。"));
        questions.add(q(d4, "DNS 域名解析过程中,本地域名服务器向根域名服务器发送的查询是?", "[\"递归查询\",\"迭代查询\",\"反向查询\",\"广播查询\"]", "B", "本地域名服务器向根服务器发送的是迭代查询,每次返回下一级服务器地址,由本地服务器继续查询。"));
        questions.add(q(d4, "HTTP 状态码 404 表示?", "[\"服务器内部错误\",\"请求成功\",\"资源未找到\",\"请求重定向\"]", "C", "404 Not Found 表示请求的资源在服务器上不存在。200 表示成功,500 表示服务器内部错误,302 表示重定向。"));
        questions.add(q(d5, "软件测试中,语句覆盖和判定覆盖的关系是?", "[\"语句覆盖强于判定覆盖\",\"判定覆盖包含语句覆盖\",\"两者等价\",\"无关联\"]", "B", "判定覆盖(分支覆盖)要求每个判定的真假分支都执行至少一次,这隐含了语句覆盖。即判定覆盖包含语句覆盖。"));
        questions.add(q(d5, "敏捷开发中,Scrum 的迭代周期(冲刺)通常为?", "[\"1天\",\"1-4周\",\"3个月\",\"1年\"]", "B", "Scrum 冲刺(Sprint)通常为 1-4 周,2 周最常见。冲刺结束交付可工作的软件增量。"));
        questions.add(q(d5, "需求工程中,功能需求和非功能需求的主要区别是?", "[\"功能需求更重要\",\"功能需求描述系统做什么,非功能描述做得如何\",\"非功能需求可量化\",\"功能需求由用户提出\"]", "B", "功能需求描述系统应提供的功能(做什么),非功能需求描述性能、安全、可用性等质量属性(做得如何)。"));
        questions.add(q(d6, "MVC 架构模式中,Model 的主要职责是?", "[\"处理用户交互\",\"管理业务数据和业务逻辑\",\"渲染视图\",\"路由请求\"]", "B", "Model 负责业务数据和业务逻辑,View 负责展示,Controller 负责处理用户输入并协调 Model 和 View。"));
        questions.add(q(d6, "微服务架构相比单体架构的主要缺点是?", "[\"部署困难\",\"分布式系统的复杂性\",\"团队协作难\",\"技术栈受限\"]", "B", "微服务引入了分布式系统的复杂性:服务间通信、数据一致性、分布式事务、链路追踪等挑战。"));
        questions.add(q(d6, "以下哪种架构风格强调数据流处理?", "[\"管道-过滤器\",\"客户端-服务器\",\"事件驱动\",\"分层\"]", "A", "管道-过滤器架构风格中,数据流经过一系列过滤器处理,每个过滤器独立处理输入并产生输出。Unix 管道是典型应用。"));
        questions.add(q(d7, "实现单例模式时,双重检查锁定(double-checked locking)需要使用 volatile 关键字,主要原因是?", "[\"提高性能\",\"防止指令重排序\",\"保证可见性\",\"防止反序列化\"]", "B", "new 操作非原子,可能重排序为分配内存-赋值引用-初始化。其他线程可能看到未初始化的对象。volatile 禁止重排序。"));
        questions.add(q(d7, "观察者模式中,被观察者(主题)通知观察者的方式是?", "[\"观察者主动拉取\",\"主题主动推送\",\"轮询\",\"回调注册\"]", "B", "观察者模式中主题状态变化时主动推送通知给所有注册的观察者,这是推模型。也有拉模型让观察者主动获取。"));
        questions.add(q(d7, "工厂方法模式相比简单工厂的优势是?", "[\"性能更好\",\"符合开闭原则\",\"代码更少\",\"支持更多产品\"]", "B", "工厂方法将工厂抽象化,新增产品时只需新增具体工厂类,无需修改已有代码,符合开闭原则。简单工厂需修改工厂类。"));
        questions.add(q(d8, "以下哪种加密算法是对称加密?", "[\"RSA\",\"AES\",\"ECC\",\"DSA\"]", "B", "AES 是对称加密(加密和解密用同一密钥)。RSA、ECC、DSA 都是非对称加密(公钥加密私钥解密)。"));
        questions.add(q(d8, "数字签名的主要作用是?", "[\"加密数据\",\"验证数据完整性和身份认证\",\"压缩数据\",\"加速传输\"]", "B", "数字签名用发送方私钥对消息摘要加密,接收方用公钥验证,实现身份认证和防篡改(完整性验证)。"));
        questions.add(q(d9, "项目管理中,风险管理的第一步是?", "[\"风险规避\",\"风险识别\",\"风险评估\",\"风险监控\"]", "B", "风险管理流程:风险识别->风险评估->风险应对规划->风险监控。第一步是识别潜在风险。"));
        questions.add(q(d9, "甘特图(Gantt Chart)主要用于?", "[\"展示任务依赖关系\",\"展示项目进度时间线\",\"展示资源分配\",\"展示风险等级\"]", "B", "甘特图以横向条形图展示任务在时间轴上的安排,直观显示开始结束时间和进度。不擅长表达任务间依赖关系。"));

        questionRepo.saveAll(questions);
        log.info("已加载 {} 道题目", questions.size());

        createAnswerRecords(questions);
        createGameState();
        createMemoryCards(questions);

        log.warn("====== Mock 数据加载完成 ======");
        log.warn("题目数: {}, 作答记录可通过 API 查询", questions.size());
        log.warn("验证辅导: POST /api/tutor/explain {\"answerRecordId\": <id>}");
        log.warn("验证诊断: POST /api/diagnosis/generate");
    }

    private void createAnswerRecords(List<Question> questions) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threeDaysAgo = now.minusDays(3);
        LocalDateTime today = now;

        List<Object[]> records = List.of(
            new Object[]{0, "B", true, threeDaysAgo},
            new Object[]{1, "A", true, threeDaysAgo},
            new Object[]{2, "B", false, threeDaysAgo},
            new Object[]{3, "A", false, threeDaysAgo},
            new Object[]{4, "A", true, threeDaysAgo},
            new Object[]{5, "C", true, threeDaysAgo},
            new Object[]{6, "B", true, threeDaysAgo},
            new Object[]{7, "B", true, threeDaysAgo},
            new Object[]{8, "D", false, threeDaysAgo},
            new Object[]{9, "B", false, threeDaysAgo},
            new Object[]{10, "A", false, threeDaysAgo},
            new Object[]{11, "C", true, threeDaysAgo},
            new Object[]{12, "A", false, today},
            new Object[]{13, "B", true, today},
            new Object[]{14, "B", true, today},
            new Object[]{15, "B", true, today},
            new Object[]{16, "A", false, today},
            new Object[]{17, "A", true, today},
            new Object[]{18, "C", false, today},
            new Object[]{19, "B", true, today},
            new Object[]{20, "B", true, today},
            new Object[]{21, "B", true, today},
            new Object[]{22, "A", false, today},
            new Object[]{23, "B", true, today},
            new Object[]{24, "A", false, today}
        );

        List<AnswerRecord> answerRecords = new ArrayList<>();
        for (Object[] r : records) {
            Question q = questions.get((int) r[0]);
            AnswerRecord ar = new AnswerRecord();
            ar.setQuestion(q);
            ar.setUserAnswer((String) r[1]);
            ar.setIsCorrect((boolean) r[2]);
            ar.setCreatedAt((LocalDateTime) r[3]);
            answerRecords.add(ar);
        }
        answerRecordRepo.saveAll(answerRecords);

        Question wrongQ1 = questions.get(2);
        AnswerRecord wrongRecord1 = answerRecords.stream()
            .filter(ar -> ar.getQuestion().getId().equals(wrongQ1.getId())).findFirst().orElse(null);
        if (wrongRecord1 != null) {
            ErrorTag tag = ErrorTag.builder()
                .answerRecord(wrongRecord1)
                .questionId(wrongQ1.getId())
                .domainId(wrongQ1.getDomain().getId())
                .errorType(ErrorType.MEMORY_CONFUSE)
                .confidence(0.85)
                .aiExplanation("【历史命中-预置】你把 P 操作和 V 操作的作用记反了:P 是申请资源(减1),V 是释放资源(加1)。建议用生产者-消费者模型理解 PV 配对。")
                .createdAt(threeDaysAgo.plusHours(1))
                .build();
            errorTagRepo.save(tag);
            log.info("已预置 ErrorTag (PV操作错题) 用于演示历史命中");
        }

        log.info("已加载 {} 条作答记录 (15对10错, 正确率60%)", answerRecords.size());
    }

    private void createGameState() {
        GameState gs = new GameState();
        gs.setId(1L);
        gs.setExp(500);
        gs.setGold(120);
        gs.setLevel(3);
        gs.setTitle("中级架构师");
        gs.setCurrentCombo(3);
        gs.setMaxCombo(12);
        gs.setDailyChallengesUsed(1);
        gs.setDailyChallengeDate(java.time.LocalDate.now());
        gs.setLoginStreak(7);
        gs.setLastLoginDate(java.time.LocalDate.now().minusDays(1));
        gameStateRepo.save(gs);
        log.info("已加载游戏状态: Lv.3 中级架构师, 连续7天, EXP 500");
    }

    private void createMemoryCards(List<Question> questions) {
        List<MemoryCard> cards = new ArrayList<>();
        for (int i = 0; i < Math.min(10, questions.size()); i++) {
            Question q = questions.get(i);
            MemoryCard card = new MemoryCard();
            card.setQuestionId(q.getId());
            card.setQuestion(q.getStem().substring(0, Math.min(50, q.getStem().length())));
            card.setAnswer(q.getAnswer());
            card.setIntervalDays(i < 5 ? 1 : 3);
            card.setEaseFactor(2.5);
            card.setStreak(i < 5 ? 0 : 1);
            card.setState(i < 5 ? "learning" : "learning");
            card.setNextReviewAt(LocalDateTime.now().plusDays(i < 5 ? 0 : 2));
            card.setWrongCount(i % 3);
            card.setCorrectCount(i % 2);
            cards.add(card);
        }
        memoryCardRepo.saveAll(cards);
        log.info("已加载 {} 张记忆卡", cards.size());
    }

    private Question q(Domain domain, String stem, String optionsJson, String answer, String analysis) {
        Question question = new Question();
        question.setSource("MOCK");
        question.setSubject("综合知识");
        question.setDomain(domain);
        question.setStem(stem);
        question.setOptionsJson(optionsJson);
        question.setAnswer(answer);
        question.setAnalysis(analysis);
        question.setExamYear("2025");
        question.setSourceFile("mock-data");
        return question;
    }

    private Domain findDomain(List<Domain> domains, String name) {
        return domains.stream()
            .filter(d -> d.getName().equals(name))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("知识域不存在: " + name));
    }
}
