package com.studyhub.service;

import com.studyhub.dto.ProgressSummary;
import com.studyhub.entity.*;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private final AnswerRecordRepository answerRecordRepo;
    private final BookmarkRepository bookmarkRepo;
    private final GameStateRepository gameStateRepo;
    private final AchievementRepository achievementRepo;
    private final TerritoryRepository territoryRepo;
    private final QuestionRepository questionRepo;

    public Map<String, Object> exportProgress() {
        GameState gs = gameStateRepo.findTopByOrderByIdAsc().orElse(null);
        List<Map<String, Object>> attempts = new ArrayList<>();
        for (AnswerRecord a : answerRecordRepo.findAll()) {
            Map<String, Object> m = new HashMap<>();
            m.put("questionId", a.getQuestion() != null ? String.valueOf(a.getQuestion().getId()) : "");
            m.put("answer", a.getUserAnswer());
            m.put("correctAnswer", a.getQuestion() != null ? a.getQuestion().getAnswer() : "");
            m.put("correct", a.getIsCorrect());
            m.put("answeredAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : "");
            attempts.add(m);
        }

        List<Map<String, Object>> bookmarks = bookmarkRepo.findAll().stream().map(b -> {
            Map<String, Object> m = new HashMap<>();
            m.put("questionId", String.valueOf(b.getQuestionId()));
            m.put("createdAt", b.getCreatedAt() != null ? b.getCreatedAt().toString() : "");
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("schemaVersion", 1);
        result.put("exportedAt", LocalDateTime.now().toString());
        result.put("attempts", attempts);
        result.put("bookmarks", bookmarks);

        if (gs != null) {
            Map<String, Object> game = new HashMap<>();
            game.put("exp", gs.getExp());
            game.put("gold", gs.getGold());
            game.put("level", gs.getLevel());
            game.put("title", gs.getTitle());
            game.put("maxCombo", gs.getMaxCombo());
            game.put("loginStreak", gs.getLoginStreak());
            game.put("achievements", achievementRepo.findAll().stream()
                .map(Achievement::getAchievementKey).collect(Collectors.toList()));
            result.put("game", game);
        }
        return result;
    }

    public ProgressSummary previewImport(Map<String, Object> payload) {
        ProgressSummary s = new ProgressSummary();
        s.setSchemaVersion((int) payload.getOrDefault("schemaVersion", 0));
        s.setExportedAt((String) payload.getOrDefault("exportedAt", ""));
        List<Map> atts = (List<Map>) payload.getOrDefault("attempts", Collections.emptyList());
        s.setAttempts(atts.size());
        s.setAnsweredQuestions((int) atts.stream().map(a -> a.get("questionId")).distinct().count());
        s.setWrong((int) atts.stream().filter(a -> !Boolean.TRUE.equals(a.get("correct"))).count());
        List<Map> bm = (List<Map>) payload.getOrDefault("bookmarks", Collections.emptyList());
        s.setBookmarks(bm.size());
        s.setLatestAt((String) atts.stream().map(a -> (String) a.get("answeredAt"))
            .filter(Objects::nonNull).max(String::compareTo).orElse(""));
        return s;
    }

    @Transactional
    public void applyImport(Map<String, Object> payload) {
        answerRecordRepo.deleteAll();
        bookmarkRepo.deleteAll();
        List<Map> atts = (List<Map>) payload.getOrDefault("attempts", Collections.emptyList());
        for (Map a : atts) {
            String qid = String.valueOf(a.get("questionId"));
            Question q = questionRepo.findById(Long.valueOf(qid)).orElse(null);
            if (q == null) continue;
            AnswerRecord r = new AnswerRecord();
            r.setQuestion(q);
            r.setUserAnswer((String) a.get("answer"));
            r.setIsCorrect(Boolean.TRUE.equals(a.get("correct")));
            String at = (String) a.get("answeredAt");
            r.setCreatedAt(at != null ? LocalDateTime.parse(at) : LocalDateTime.now());
            answerRecordRepo.save(r);
        }
        List<Map> bm = (List<Map>) payload.getOrDefault("bookmarks", Collections.emptyList());
        for (Map b : bm) {
            Bookmark bk = new Bookmark();
            bk.setQuestionId(Long.valueOf(String.valueOf(b.get("questionId"))));
            String cat = (String) b.get("createdAt");
            bk.setCreatedAt(cat != null ? LocalDateTime.parse(cat) : LocalDateTime.now());
            bookmarkRepo.save(bk);
        }
    }

    @Deprecated
    public Map<String, Object> generateDiagnosis() {
        Map<String, Object> diag = new HashMap<>();
        diag.put("schemaVersion", 1);
        diag.put("generatedAt", LocalDateTime.now().toString());
        diag.put("app", "study-hub");
        List<String> instructions = new ArrayList<>();
        instructions.add("\u5148\u6309\u6a21\u5757\u6b63\u786e\u7387\u627e\u77ed\u677f\uff0c\u4e0d\u8981\u53ea\u770b\u5355\u9898\u3002");
        instructions.add("\u533a\u5206\u6982\u5ff5\u4e0d\u4f1a\u3001\u5ba1\u9898\u5931\u8bef\u3001\u8bb0\u5fc6\u6df7\u6dc6\u3001\u8ba1\u7b97\u9519\u8bef\u3002");
        instructions.add("\u7ed9\u51fa\u4e0b\u4e00\u54686-8\u5c0f\u65f6\u53ef\u6267\u884c\u5b66\u4e60\u5b89\u6392\u3002");
        instructions.add("\u7ed3\u5408\u6e38\u620f\u6570\u636e\uff08\u7b49\u7ea7/\u6210\u5c31/\u9886\u571f\uff09\u8bc4\u4f30\u5b66\u4e60\u6295\u5165\u5ea6\u3002");
        diag.put("aiInstructions", instructions);
        return diag;
    }
}
