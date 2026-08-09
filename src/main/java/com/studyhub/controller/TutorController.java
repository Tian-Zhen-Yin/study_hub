package com.studyhub.controller;

import com.studyhub.dto.TutorRequest;
import com.studyhub.dto.TutorResponse;
import com.studyhub.entity.AnswerRecord;
import com.studyhub.repository.AnswerRecordRepository;
import com.studyhub.service.TutorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/tutor")
@RequiredArgsConstructor
public class TutorController {

    private final TutorService tutorService;
    private final AnswerRecordRepository answerRecordRepo;

    @PostMapping("/explain")
    public ResponseEntity<TutorResponse> explain(@RequestBody TutorRequest req) {
        if (req.getAnswerRecordId() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "answerRecordId 不能为空");
        }
        AnswerRecord record = answerRecordRepo.findById(req.getAnswerRecordId())
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "作答记录不存在: " + req.getAnswerRecordId()));

        if (Boolean.TRUE.equals(record.getIsCorrect())) {
            throw new ResponseStatusException(BAD_REQUEST, "该题已答对，无需辅导");
        }
        return ResponseEntity.ok(tutorService.explain(record));
    }
}
