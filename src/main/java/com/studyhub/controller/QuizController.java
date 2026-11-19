package com.studyhub.controller;

import com.studyhub.dto.*;
import com.studyhub.entity.Question;
import com.studyhub.repository.QuestionRepository;
import com.studyhub.service.QuizService;
import com.studyhub.service.GameService;
import com.studyhub.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;
    private final GameService gameService;
    private final QuestionService questionService;
    private final QuestionRepository questionRepo;

    @GetMapping("/questions/modules")
    public ResponseEntity<List<java.util.Map<String, Object>>> getModules() {
        return ResponseEntity.ok(questionService.getModuleStats());
    }

    @PostMapping("/quiz/set")
    public ResponseEntity<List<QuestionDTO>> createQuizSet(@RequestBody QuizSetRequest req) {
        List<Question> questions = quizService.buildPracticeSet(req);
        List<QuestionDTO> dtos = questions.stream()
            .map(questionService::toDTOPublic)
            .collect(Collectors.toList());
        questionService.annotateAnsweredStatus(dtos);
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/quiz/answer")
    public ResponseEntity<AnswerResponse> answer(@RequestBody AnswerRequest req) {
        return ResponseEntity.ok(quizService.gradeAnswer(req.getQuestionId(), req.getUserAnswer(), gameService));
    }

    /** 案例专项方向汇总（题干【案例题型·XX】前缀统计），供 quiz 页专项面板 */
    @GetMapping("/quiz/case-summary")
    public ResponseEntity<List<java.util.Map<String, Object>>> caseSummary() {
        return ResponseEntity.ok(quizService.caseSummary());
    }

    /** 同考点变式题（举一反三） */
    @GetMapping("/quiz/variants/{id}")
    public ResponseEntity<List<QuestionDTO>> variants(@PathVariable Long id,
                                                      @RequestParam(defaultValue = "3") int count) {
        List<QuestionDTO> dtos = quizService.findVariants(id, count).stream()
            .map(questionService::toDTOPublic)
            .collect(Collectors.toList());
        questionService.annotateAnsweredStatus(dtos);
        return ResponseEntity.ok(dtos);
    }
}
