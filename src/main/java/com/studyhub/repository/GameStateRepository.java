package com.studyhub.repository;

import com.studyhub.entity.GameState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GameStateRepository extends JpaRepository<GameState, Long> {
    Optional<GameState> findTopByOrderByIdAsc();
}
