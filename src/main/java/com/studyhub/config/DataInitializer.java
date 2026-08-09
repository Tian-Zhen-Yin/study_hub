package com.studyhub.config;

import com.studyhub.entity.Domain;
import com.studyhub.repository.DomainRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
@Order(1)
public class DataInitializer implements CommandLineRunner {
    private final DomainRepository domainRepository;

    public DataInitializer(DomainRepository domainRepository) {
        this.domainRepository = domainRepository;
    }

    @Override
    public void run(String... args) {
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
}
