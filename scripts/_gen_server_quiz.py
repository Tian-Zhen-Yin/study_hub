with open(r'E:\AiProject\study_hub\src\main\java\com\studyhub\controller\QuizController.java', 'w', encoding='utf-8') as f:
    f.write('''package com.studyhub.controller;

import com.studyhub.dto.DomainDTO;
import com.studyhub.dto.QuestionDTO;
import com.studyhub.service.DomainService;
import com.studyhub.service.QuestionService;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.util.List;

@Controller
public class QuizController {
    private final DomainService domainService;
    private final QuestionService questionService;

    public QuizController(DomainService ds, QuestionService qs) {
        this.domainService = ds;
        this.questionService = qs;
    }

    @GetMapping("/quiz")
    public void quiz(HttpServletResponse r) throws Exception {
        r.setContentType("text/html;charset=UTF-8");
        PrintWriter w = r.getWriter();
        List<DomainDTO> domains = domainService.getAllDomains();
        w.println("<!DOCTYPE html><html><head><meta charset=\\"UTF-8\\"><title>Quiz</title>");
        w.println("<style>body{font-family:sans-serif;max-width:800px;margin:20px auto;padding:20px;background:#FAFAF9}");
        w.println("a{display:inline-block;padding:8px 16px;margin:4px;border:2px solid #E5E7EB;border-radius:6px;text-decoration:none;color:#1C1C1C;background:#FFF}");
        w.println("a:hover{border-color:#1D4ED8}.q{margin:20px 0;padding:16px;background:#FFF;border-radius:8px;border-left:3px solid #1D4ED8}");
        w.println(".opt{display:block;padding:10px 16px;margin:6px 0;border:2px solid #E5E7EB;border-radius:6px;cursor:pointer}");
        w.println(".opt:hover{border-color:#1D4ED8}.ans{margin-top:12px;padding:12px;border-radius:6px;font-weight:bold}");
        w.println(".correct{background:#d4edda;border:1px solid #28a745}.wrong{background:#f8d7da;border:1px solid #dc3545}");
        w.println("button{padding:10px 24px;background:#1D4ED8;color:#FFF;border:none;border-radius:6px;cursor:pointer;margin:4px}");
        w.println("</style></head><body><h1>Study Hub Quiz</h1><p>Domains:</p>");
        for (DomainDTO d : domains) {
            w.println("<a href=\\"/quiz?domain=" + d.getId() + "\\">" + esc(d.getName()) + "</a> ");
        }
        w.println("<hr>");
        String domainParam = r.getParameter("domain");
        if (domainParam != null) {
            try {
                long domainId = Long.parseLong(domainParam);
                List<QuestionDTO> questions = questionService.getQuestions(domainId, 10, null);
                if (questions.isEmpty()) {
                    w.println("<p>No questions in this domain.</p>");
                } else {
                    qnum = r.getParameter("q");
                    int qi = qnum != null ? Integer.parseInt(qnum) : 0;
                    if (qi < 0) qi = 0;
                    if (qi >= questions.size()) qi = questions.size() - 1;
                    QuestionDTO q = questions.get(qi);
                    w.println("<p>Question " + (qi+1) + " / " + questions.size() + "</p>");
                    w.println("<div class=\\"q\\">" + (qi+1) + ". " + esc(q.getStem()) + "</div>");
                    String[] opts = parseOptions(q.getOptionsJson());
                    String ans = r.getParameter("a");
                    for (int i = 0; i < opts.length; i++) {
                        String label = String.valueOf((char)('A' + i));
                        w.println("<a class=\\"opt\\" href=\\"/quiz?domain=" + domainId + "&q=" + qi + "&a=" + label + "\\">" + label + ". " + esc(opts[i]) + "</a>");
                    }
                    if (ans != null) {
                        boolean ok = ans.equals(q.getAnswer());
                        w.println("<div class=\\"ans " + (ok ? "correct" : "wrong") + "\\">" + (ok ? "Correct!" : "Wrong! Answer: " + q.getAnswer()) + "</div>");
                        if (q.getAnalysis() != null) w.println("<p>" + esc(q.getAnalysis()) + "</p>");
                    }
                    w.println("<p>");
                    if (qi > 0) w.println("<a href=\\"/quiz?domain=" + domainId + "&q=" + (qi-1) + "\\"><button>Prev</button></a>");
                    if (qi < questions.size() - 1) w.println("<a href=\\"/quiz?domain=" + domainId + "&q=" + (qi+1) + "\\"><button>Next</button></a>");
                    w.println("</p>");
                }
            } catch (Exception e) {
                w.println("<p>Error: " + esc(e.getMessage()) + "</p>");
            }
        }
        w.println("</body></html>");
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\\"", "&quot;");
    }

    private String[] parseOptions(String json) {
        if (json == null) return new String[0];
        try {
            json = json.trim();
            if (json.startsWith("[") && json.endsWith("]")) {
                json = json.substring(1, json.length() - 1);
                String[] parts = json.split(",(?=(?:[^\\"]*\\"[^\\"]*\\")*[^\\"]*$)");
                String[] result = new String[parts.length];
                for (int i = 0; i < parts.length; i++) {
                    String p = parts[i].trim();
                    if (p.startsWith("\\"") && p.endsWith("\\"")) p = p.substring(1, p.length() - 1);
                    result[i] = p;
                }
                return result;
            }
        } catch (Exception e) {}
        return new String[0];
    }
}
''')
print('QuizController written')
