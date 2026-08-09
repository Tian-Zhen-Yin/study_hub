package com.studyhub.repository;

import com.studyhub.entity.Simulation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SimulationRepository extends JpaRepository<Simulation, Long> {
    List<Simulation> findAllByOrderBySimDateDesc();
    List<Simulation> findTop3ByOrderBySimDateDesc();
}