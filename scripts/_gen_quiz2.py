java_code = '''package com.studyhub.controller;

import com.studyhub.dto.DomainDTO;
import com.studyhub.dto.QuestionDTO;
import com.studyhub.service.DomainService;
import com.studyhub.service.QuestionService;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.util.List;

@Controller
public class QuizController {

    private final DomainService domainService;
    private final QuestionService questionService;

    public QuizController(DomainService domainService, QuestionService questionService) {
        this.domainService = domainService;
        this.questionService = questionService;
    }

    @GetMapping("/quiz")
    public void quiz(@RequestParam(required = false) Long domain,
                     @RequestParam(required = false, defaultValue = "0") int q,
                     @RequestParam(required = false) String a,
                     HttpServletResponse resp) throws Exception {
        resp.setContentType("text/html;charset=UTF-8");
        PrintWriter w = resp.getWriter();

        List<DomainDTO> domains = domainService.getAllDomains();

        w.println("<!DOCTYPE html><html><head><meta charset=\\"UTF-8\\"><title>Quiz</title>");
        w.println("<style>");
        w.println("body{font-family:sans-serif;max-width:800px;margin:20px auto;padding:20px;background:#FAFAF9;color:#1C1C1C}");
        w.println("a.btn{display:inline-block;padding:8px 16px;margin:4px;border:2px solid #E5E7EB;border-radius:6px;text-decoration:none;color:#1C1C1C;background:#FFF}");
        w.println("a.btn:hover{border-color:#1D4ED8}");
        w.println(".qbox{margin:20px 0;padding:16px;background:#FFF;border-radius:8px;border-left:3px solid #1D4ED8;font-size:1.1em;line-height:1.8}");
        w.println("a.opt{display:block;padding:10px 16px;margin:6px 0;border:2px solid #E5E7EB;border-radius:6px;text-decoration:none;color:#1C1C1C}");
        w.println("a.opt:hover{border-color:#1D4ED8;background:rgba(29,78,216,.04)}");
        w.println(".ans{margin-top:12px;padding:12px;border-radius:6px;font-weight:bold}");
        w.println(".ok{background:#d4edda;border:1px solid #28a745}");
        w.println(".fail{background:#f8d7da;border:1px solid #dc3545}");
        w.println("button{padding:10px 24px;background:#1D4ED8;color:#FFF;border:none;border-radius:6px;cursor:pointer;margin:4px;font-size:1em}");
        w.println("</style></head><body>");
        w.println("<h1>Study Hub Quiz</h1>");

        // Domain buttons
        w.println("<p>");
        for (DomainDTO d : domains) {
            String active = domain != null && domain.equals(d.getId()) ? "background:#1D4ED8;color:#FFF" : "";
            w.println("<a class=\\"btn\\" style=\\"" + active + "\\" href=\\"/quiz?domain=" + d.getId() + "\\">" + esc(d.getName()) + "</a>");
        }
        w.println("</p><hr>");

        // Questions
        if (domain != null) {
            List<QuestionDTO> questions = questionService.getQuestions(domain, 10, null);
            if (questions.isEmpty()) {
                w.println("<p>No questions in this domain.</p>");
            } else {
                int qi = Math.max(0, Math.min(q, questions.size() - 1));
                QuestionDTO dto = questions.get(qi);
                String[] opts = parseOptions(dto.getOptionsJson());

                w.println("<p>Question " + (qi + 1) + " / " + questions.size() + "</p>");
                w.println("<div class=\\"qbox\\">" + (qi + 1) + ". " + esc(dto.getStem()) + "</div>");

                for (int i = 0; i < opts.length; i++) {
                    String label = String.valueOf((char) ('A' + i));
                    w.println("<a class=\\"opt\\" href=\\"/quiz?domain=" + domain + "&q=" + qi + "&a=" + label + "\\">" + label + ". " + esc(opts[i]) + "</a>");
                }

                if (a != null && !a.isEmpty()) {
                    boolean ok = a.equals(dto.getAnswer());
                    w.println("<div class=\\"ans " + (ok ? "ok" : "fail") + "\\">" + (ok ? "Correct!" : "Wrong! Answer: " + esc(dto.getAnswer())) + "</div>");
                    if (dto.getAnalysis() != null && !dto.getAnalysis().isEmpty()) {
                        w.println("<p style=\\"line-height:1.7;margin-top:8px\\">" + esc(dto.getAnalysis()) + "</p>");
                    }
                }

                w.println("<p>");
                if (qi > 0) {
                    w.println("<a href=\\"/quiz?domain=" + domain + "&q=" + (qi - 1) + "\\"><button>Prev</button></a>");
                }
                if (qi < questions.size() - 1) {
                    w.println("<a href=\\"/quiz?domain=" + domain + "&q=" + (qi + 1) + "\\"><button>Next</button></a>");
                }
                w.println("<a href=\\"/quiz?domain=" + domain + "\\"><button>Restart</button></a>");
                w.println("</p>");
            }
        }
        w.println("</body></html>");
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String[] parseOptions(String json) {
        if (json == null || json.isEmpty()) return new String[0];
        try {
            json = json.trim();
            if (json.startsWith("[") && json.endsWith("]")) {
                json = json.substring(1, json.length() - 1);
                java.util.ArrayList<String> list = new java.util.ArrayList<>();
                StringBuilder sb = new StringBuilder();
                boolean inQuote = false;
                for (int i = 0; i < json.length(); i++) {
                    char c = json.charAt(i);
                    if (c == '"' && (i == 0 || json.charAt(i - 1) != '\\\\')) {
                        inQuote = !inQuote;
                    } else if (c == ',' && !inQuote) {
                        String item = sb.toString().trim();
                        if (item.startsWith("\\"") && item.endsWith("\\"")) {
                            item = item.substring(1, item.length() - 1);
                        }
                        list.add(item);
                        sb = new StringBuilder();
                    } else {
                        sb.append(c);
                    }
                }
                String last = sb.toString().trim();
                if (last.startsWith("\\"") && last.endsWith("\\"")) {
                    last = last.substring(1, last.length() - 1);
                }
                if (!last.isEmpty()) list.add(last);
                return list.toArray(new String[0]);
            }
        } catch (Exception e) {}
        return new String[0];
    }
}
'''

with open(r'E:\AiProject\study_hub\src\main\java\com\studyhub\controller\QuizController.java', 'w', encoding='utf-8') as f:
    f.write(java_code)
print('QuizController written')
