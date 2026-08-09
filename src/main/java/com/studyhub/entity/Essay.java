package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "essays")
public class Essay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 50)
    private String direction;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(name = "word_count")
    private Integer wordCount = 0;

    @Column(name = "last_modified")
    private LocalDateTime lastModified = LocalDateTime.now();
}