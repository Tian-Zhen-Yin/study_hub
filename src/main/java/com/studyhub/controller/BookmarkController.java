package com.studyhub.controller;

import com.studyhub.entity.Bookmark;
import com.studyhub.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkRepository bookmarkRepo;

    @PostMapping("/{questionId}")
    public ResponseEntity<Map<String, Object>> toggle(@PathVariable Long questionId) {
        Optional<Bookmark> existing = bookmarkRepo.findByQuestionId(questionId);
        if (existing.isPresent()) {
            bookmarkRepo.deleteByQuestionId(questionId);
            Map<String, Object> resp = new HashMap<>();
            resp.put("bookmarked", false);
            return ResponseEntity.ok(resp);
        }
        Bookmark b = new Bookmark();
        b.setQuestionId(questionId);
        bookmarkRepo.save(b);
        Map<String, Object> resp = new HashMap<>();
        resp.put("bookmarked", true);
        return ResponseEntity.ok(resp);
    }

    @GetMapping
    public ResponseEntity<List<Bookmark>> getAll() {
        return ResponseEntity.ok(bookmarkRepo.findAll());
    }
}
