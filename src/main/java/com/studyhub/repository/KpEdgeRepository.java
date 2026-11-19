package com.studyhub.repository;

import com.studyhub.entity.KpEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface KpEdgeRepository extends JpaRepository<KpEdge, Long> {

    /** 某考点的语义关联邻居（学习关联边） */
    @Query("SELECT e FROM KpEdge e WHERE e.kind = 'semantic' AND (e.srcId = :id OR e.dstId = :id)")
    List<KpEdge> findSemanticNeighbors(@Param("id") Long id);
}
