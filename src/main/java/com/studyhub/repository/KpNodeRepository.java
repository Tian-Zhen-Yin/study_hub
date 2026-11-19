package com.studyhub.repository;

import com.studyhub.entity.KpNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KpNodeRepository extends JpaRepository<KpNode, Long> {
    List<KpNode> findByParentId(Long parentId);

    List<KpNode> findByName(String name);
}
