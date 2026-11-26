package com.studyhub;

import com.studyhub.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 端到端 H2 零依赖模式冒烟测试：
 * 验证全量实体建表、StarterPack 播种、核心接口、H2 日期趋势查询、知识图谱与通用 OpenAI/Ollama 配置。
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:studyhub_smoke;MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=DAY,VALUE,USER,KEY;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "studyhub.llm.provider=mock",
    "studyhub.mock.enabled=false"
})
class StudyHubH2SmokeTest {

    @Autowired MockMvc mockMvc;
    @Autowired DomainRepository domainRepo;
    @Autowired QuestionRepository questionRepo;
    @Autowired WeeklyTaskRepository weeklyTaskRepo;
    @Autowired DiagnosisRepository diagnosisRepo;
    @Autowired EssayRepository essayRepo;
    @Autowired KpNodeRepository kpNodeRepo;
    @Autowired KpEdgeRepository kpEdgeRepo;

    @Test
    void h2SchemaAndStarterPackSeedCorrectly() {
        assertThat(domainRepo.count()).isEqualTo(11);
        assertThat(questionRepo.count()).isGreaterThanOrEqualTo(29);
        assertThat(kpNodeRepo.count()).isGreaterThanOrEqualTo(17);
        assertThat(kpEdgeRepo.count()).isGreaterThanOrEqualTo(9);
        // 验证含保留字(day)和 MEDIUMTEXT 的表在 H2 下建表并可正常查询
        assertThat(weeklyTaskRepo.count()).isEqualTo(0);
        assertThat(diagnosisRepo.count()).isEqualTo(0);
        assertThat(essayRepo.count()).isEqualTo(0);
    }

    @Test
    void coreApiEndpointsWorkInH2ZeroSetupMode() throws Exception {
        mockMvc.perform(get("/api/config"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));

        mockMvc.perform(get("/api/domains"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(11)));

        mockMvc.perform(get("/api/dashboard"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));

        mockMvc.perform(get("/api/dashboard/trend"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.days").value(7));

        mockMvc.perform(get("/api/kp/tree"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nodes", hasSize(greaterThanOrEqualTo(17))));

        mockMvc.perform(get("/api/kp/edges"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.edges", hasSize(greaterThanOrEqualTo(9))));

        mockMvc.perform(get("/api/llm/settings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.providers[*].value", hasItem("OPENAI_COMPAT")))
            .andExpect(jsonPath("$.data.configs", hasSize(greaterThanOrEqualTo(5))));

        mockMvc.perform(post("/api/quiz/set")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"mode\":\"quick\",\"count\":5}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))));

        // 提交一条作答记录并再次查询 H2 趋势聚合，验证 LocalDate 转换与写入闭环
        Long firstQId = questionRepo.findAll().get(0).getId();
        mockMvc.perform(post("/api/quiz/answer")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionId\":" + firstQId + ",\"userAnswer\":\"B\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.correct").isBoolean());

        mockMvc.perform(get("/api/dashboard/trend"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalAnswered", greaterThanOrEqualTo(1)));
    }
}
