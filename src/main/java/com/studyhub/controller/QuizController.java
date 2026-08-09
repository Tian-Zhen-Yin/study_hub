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
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/quiz/answer")
    public ResponseEntity<AnswerResponse> answer(@RequestBody AnswerRequest req) {
        return ResponseEntity.ok(quizService.gradeAnswer(req.getQuestionId(), req.getUserAnswer(), gameService));
    }
}
