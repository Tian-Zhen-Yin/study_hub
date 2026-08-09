path = r'E:\AiProject\study_hub\src\main\java\com\studyhub\controller\QuestionController.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for PutMapping and QuestionRepository
old_import = 'import org.springframework.web.bind.annotation.*;'
new_import = '''import org.springframework.web.bind.annotation.*;
import com.studyhub.repository.QuestionRepository;
import com.studyhub.entity.Question;
import java.util.Optional;'''
content = content.replace(old_import, new_import)

# Add repository field
old_field = 'private final QuestionService questionService;'
new_field = '''private final QuestionService questionService;
    private final QuestionRepository questionRepository;'''
content = content.replace(old_field, new_field)

# Update constructor
old_ctor = 'public QuestionController(QuestionService questionService) {'
new_ctor = '''public QuestionController(QuestionService questionService, QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;'''
content = content.replace(old_ctor, new_ctor)
content = content.replace('this.questionService = questionService;', 'this.questionService = questionService;')

# Add PUT method before last }
put_method = '''
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateQuestion(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Question q = questionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question not found: " + id));
        if (body.containsKey("optionsJson")) q.setOptionsJson(body.get("optionsJson"));
        if (body.containsKey("answer")) q.setAnswer(body.get("answer"));
        q.setAnalysis(body.getOrDefault("analysis", q.getAnalysis()));
        questionRepository.save(q);
        return ResponseEntity.ok(Map.of("code", 200, "message", "ok"));
    }
'''
last_brace = content.rfind('}')
content = content[:last_brace] + put_method + '\n}'

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('PUT endpoint added')
