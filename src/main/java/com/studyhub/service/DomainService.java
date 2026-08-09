package com.studyhub.service;

import com.studyhub.dto.DomainDTO;
import com.studyhub.entity.Domain;
import com.studyhub.repository.DomainRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DomainService {
    private final DomainRepository domainRepository;

    public DomainService(DomainRepository domainRepository) {
        this.domainRepository = domainRepository;
    }

    public List<DomainDTO> getAllDomains() {
        return domainRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public DomainDTO updateDomain(Long id, DomainDTO dto) {
        Domain domain = domainRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Domain not found: " + id));
        if (dto.getPct() != null) domain.setPct(dto.getPct());
        if (dto.getState() != null) domain.setState(dto.getState());
        if (dto.getPriority() != null) domain.setPriority(dto.getPriority());
        return toDTO(domainRepository.save(domain));
    }

    private DomainDTO toDTO(Domain d) {
        return new DomainDTO(d.getId(), d.getName(), d.getPct(), d.getPriority(), d.getState());
    }
}
