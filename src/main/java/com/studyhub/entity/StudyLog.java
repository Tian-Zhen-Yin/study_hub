package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "study_logs")
public class StudyLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "study_date", nullable = false)
    private LocalDate studyDate;

    @Column(nullable = false, columnDefinition = "DECIMAL(3,1)")
    private BigDecimal hours;

    @Column(nullable = false, length = 20)
    private String category; // 鐪熼璇婃柇/鏁欐潗绮捐/閫夋嫨棰樺埛棰?妗堜緥鍒嗘瀽/璁烘枃鍐欎綔/鍏ㄧ湡妯℃嫙/澶嶇洏鎬荤粨

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domain_id")
    private Domain domain;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
