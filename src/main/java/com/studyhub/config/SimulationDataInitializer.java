package com.studyhub.config;

import com.studyhub.entity.*;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.util.*;

@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "studyhub.mock.enabled", havingValue = "true")
public class SimulationDataInitializer implements CommandLineRunner {

    private final QuestionRepository questionRepo;
    private final DomainRepository domainRepo;

    @Override
    public void run(String... args) {
        long caseCount = questionRepo.findBySubject("案例分析").size();
        long essayCount = questionRepo.findBySubject("论文").size();

        if (caseCount > 0 && essayCount > 0) {
            log.info("案例分析和论文题目已存在,跳过初始化");
            return;
        }

        log.warn("====== 加载案例分析和论文题目 ======");
        List<Domain> domains = domainRepo.findAll();
        Domain arch = findDomain(domains, "架构设计");
        Domain se = findDomain(domains, "软件工程");
        Domain pm = findDomain(domains, "项目管理");
        Domain sec = findDomain(domains, "系统安全");
        Domain db = findDomain(domains, "数据库技术");

        List<Question> questions = new ArrayList<>();

        if (caseCount == 0) {
            questions.add(caseQ(arch,
                "某电商平台采用微服务架构,包含用户服务、商品服务、订单服务、支付服务和库存服务。在双十一大促期间,系统出现以下问题:\n" +
                "1. 订单服务调用库存服务超时,导致大量订单创建失败\n" +
                "2. 支付服务因数据库连接池耗尽而崩溃,连锁影响订单服务\n" +
                "3. 商品服务的缓存命中率从 95% 降至 60%,数据库负载激增\n\n" +
                "针对上述问题,以下解决方案中,哪项最能同时解决超时和级联故障问题?",
                "[\"加大库存服务的数据库连接池\", \"引入熔断器模式,在支付服务不可用时快速失败并降级\", \"增加商品服务缓存容量\", \"将订单服务改为异步消息队列处理\"]",
                "B",
                "熔断器模式(Circuit Breaker)能在下游服务不可用时快速失败,防止级联故障,同时配合降级策略保证核心功能可用。选项A只解决库存服务自身的连接问题;选项C解决的是缓存问题;选项D虽然能解耦,但无法解决支付服务崩溃导致的连锁反应。"));

            questions.add(caseQ(se,
                "某团队采用 Scrum 开发模式,在迭代回顾会议上发现以下问题:\n" +
                "- 迭代速度从最初的 40 点下降到 25 点\n" +
                "- 代码合并冲突频繁,每次合并耗时超过 2 小时\n" +
                "- 测试覆盖率为 35%,生产环境 Bug 率上升\n" +
                "- 团队成员对'完成'的定义理解不一致\n\n" +
                "以下哪项改进措施最能从根本上提升交付质量?",
                "[\"增加每日站会时间到 30 分钟\", \"定义统一的 DoD(Definition of Done)并引入持续集成流水线\", \"将迭代周期从 2 周延长到 4 周\", \"增加测试人员编制\"]",
                "B",
                "统一的 DoD 确保团队对完成标准达成共识,持续集成流水线自动化解决合并冲突和测试覆盖问题。选项A增加会议时间不解决根本问题;选项C延长迭代周期只是拖延问题;选项D增加测试人员治标不治本,且 Scrum 强调全栈负责。"));

            questions.add(caseQ(db,
                "某银行核心系统采用 MySQL 主从架构,日均交易量 500 万笔。近期出现以下性能问题:\n" +
                "- 活跃连接数经常达到 max_connections 上限(500)\n" +
                "- 慢查询日志显示,账户余额查询平均耗时 800ms\n" +
                "- 从库复制延迟最高达 30 分钟\n" +
                "- 月底结算期间,数据库 CPU 使用率持续 95% 以上\n\n" +
                "在不更换数据库类型的前提下,以下方案哪项最为合理?",
                "[\"将 max_connections 提升到 2000\", \"引入读写分离 + 分库分表 + Redis 热数据缓存\", \"增加从库数量到 5 个\", \"使用存储过程替代 ORM 查询\"]",
                "B",
                "读写分离将查询压力分散到从库,分库分表降低单表数据量,Redis 缓存热数据减少数据库访问。选项A提高连接数只是延缓问题;选项C增加从库不解决写压力;选项D存储过程增加维护成本且不解决架构瓶颈。"));

            questions.add(caseQ(sec,
                "某 SaaS 平台安全团队发现以下安全事件:\n" +
                "- 用户密码以 MD5 明文存储,数据库泄露风险高\n" +
                "- API 接口缺乏速率限制,存在暴力破解风险\n" +
                "- 管理后台使用 HTTP 协议传输\n" +
                "- 第三方依赖库存在已知 CVE 漏洞\n\n" +
                "按照安全优先级,以下整改顺序哪项最合理?",
                "[\"先升级 HTTPS,再修复密码存储,然后加速率限制,最后更新依赖\", \"先修复密码存储(改用 bcrypt),再加 API 速率限制,然后升级 HTTPS,最后更新依赖库\", \"先更新依赖库,再升级 HTTPS,然后修复密码,最后加速率限制\", \"四项同时进行,不分先后\"]",
                "B",
                "密码存储是最严重的数据泄露风险(直接影响用户),应优先修复。API 速率限制防止暴力破解(主动防御)。HTTPS 防止传输层窃听。依赖库更新是长期维护工作。按影响面和紧迫性排序最合理。"));

            questions.add(caseQ(pm,
                "某政府信息化项目预算 800 万,工期 12 个月。项目进行到第 6 个月时:\n" +
                "- 已花费预算 520 万(计划 400 万)\n" +
                "- 已完成功能 40%(计划 50%)\n" +
                "- 关键开发人员离职 2 人\n" +
                "- 甲方提出新增 3 个功能模块的需求变更\n\n" +
                "作为项目经理,以下应对策略哪项最合适?",
                "[\"同意需求变更并申请追加预算和工期\", \"拒绝需求变更,集中资源追赶进度\", \"评估需求变更影响,与甲方协商优先级并调整基准线\", \"立即招聘替换离职人员,按原计划执行\"]",
                "C",
                "PMBOK 的变更控制流程要求:评估影响->与干系人协商->调整基准线。选项A盲目同意可能导致更大超支;选项B拒绝变更可能违反合同且不考虑业务需求;选项D招聘周期长且原计划已不现实。选项C遵循变更管理最佳实践。"));
        }

        if (essayCount == 0) {
            questions.add(essayQ(arch,
                "论微服务架构及其应用\n\n"
                + "请围绕以下要点展开论述:\n"
                + "1. 微服务架构的概念与核心特征\n"
                + "2. 微服务架构与传统单体架构的对比分析\n"
                + "3. 微服务架构的优势与挑战\n"
                + "4. 结合你参与的项目,说明微服务架构的具体实践\n"
                + "5. 对微服务架构未来发展趋势的看法\n\n"
                + "要求:字数 2000-3000 字,条理清晰,有实际经验支撑。",
                "评分要点:\n"
                + "1. 概念准确(15分):明确定义微服务,提到服务自治、独立部署、去中心化治理等核心特征\n"
                + "2. 对比分析(15分):从架构复杂度、部署方式、技术栈选择、扩展性、运维成本等维度对比\n"
                + "3. 优势与挑战(20分):优势(独立部署、技术异构、弹性扩展),挑战(分布式事务、服务发现、链路追踪、数据一致性)\n"
                + "4. 实践经验(25分):有真实项目案例,提到服务拆分原则、API网关、配置中心、熔断降级等实践\n"
                + "5. 结构与表达(25分):论点清晰、论据充分、逻辑严密、语言流畅"));

            questions.add(essayQ(se,
                "论 DevOps 实践与持续交付\n\n"
                + "请围绕以下要点展开论述:\n"
                + "1. DevOps 的核心理念与文化\n"
                + "2. 持续集成/持续交付(CI/CD)的体系架构\n"
                + "3. 自动化测试在 DevOps 中的角色\n"
                + "4. 结合实际项目,说明 DevOps 落地的关键步骤\n"
                + "5. 度量 DevOps 成熟度的指标体系\n\n"
                + "要求:字数 2000-3000 字,理论结合实践。",
                "评分要点:\n"
                + "1. 理念阐述(15分):协作文化、自动化、度量、分享(CAMS模型)\n"
                + "2. CI/CD 架构(20分):代码托管->CI流水线->制品仓库->CD部署->监控反馈\n"
                + "3. 自动化测试(15分):单元测试、集成测试、E2E测试的分层策略\n"
                + "4. 落地实践(25分):有具体工具链(Jenkins/GitLab CI/GitHub Actions),有落地步骤和踩坑经验\n"
                + "5. 度量指标(25分):部署频率、变更前置时间、MTTR、变更失败率(DORA指标)"));

            questions.add(essayQ(db,
                "论高并发系统中的数据一致性保障\n\n"
                + "请围绕以下要点展开论述:\n"
                + "1. 分布式系统中的数据一致性挑战\n"
                + "2. CAP 定理与 BASE 理论的理解\n"
                + "3. 分布式事务的常见方案(2PC/TCC/Saga/本地消息表)\n"
                + "4. 结合项目经验,说明最终一致性的工程实践\n"
                + "5. 缓存与数据库一致性问题的解决方案\n\n"
                + "要求:字数 2000-3000 字,有深度分析。",
                "评分要点:\n"
                + "1. 一致性挑战(15分):网络分区、并发写入、时钟不同步等问题\n"
                + "2. CAP/BASE(15分):正确理解三选二,BASE的最终一致性思想\n"
                + "3. 分布式事务(25分):对比各方案的优缺点和适用场景\n"
                + "4. 工程实践(25分):消息队列+本地消息表、补偿机制、幂等设计\n"
                + "5. 缓存一致性(20分):Cache Aside、延迟双删、Canal监听binlog等方案"));
        }

        questionRepo.saveAll(questions);
        log.info("已加载 {} 道案例分析和论文题目", questions.size());
    }

    private Question caseQ(Domain domain, String stem, String options, String answer, String analysis) {
        Question q = new Question();
        q.setSource("MOCK");
        q.setSubject("案例分析");
        q.setDomain(domain);
        q.setStem(stem);
        q.setOptionsJson(options);
        q.setAnswer(answer);
        q.setAnalysis(analysis);
        q.setExamYear("2024");
        return q;
    }

    private Question essayQ(Domain domain, String stem, String scoringCriteria) {
        Question q = new Question();
        q.setSource("MOCK");
        q.setSubject("论文");
        q.setDomain(domain);
        q.setStem(stem);
        q.setOptionsJson(null);
        q.setAnswer(scoringCriteria);
        q.setAnalysis(scoringCriteria);
        q.setExamYear("2024");
        return q;
    }

    private Domain findDomain(List<Domain> domains, String name) {
        return domains.stream().filter(d -> d.getName().equals(name)).findFirst().orElse(null);
    }
}
