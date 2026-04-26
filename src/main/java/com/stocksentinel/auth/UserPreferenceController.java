package com.stocksentinel.auth;

import com.stocksentinel.auth.dto.UserPreferenceDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user/preferences")
@Tag(name = "User Preferences", description = "Endpoints for user settings")
public class UserPreferenceController {

    private static final Logger log = LoggerFactory.getLogger(UserPreferenceController.class);

    private final UserRepository userRepository;

    public UserPreferenceController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    @Operation(summary = "Get user preferences")
    public ResponseEntity<UserPreferenceDTO> getPreferences() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        log.info("GET /api/user/preferences for user: {}", email);

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserPreferenceDTO dto = UserPreferenceDTO.builder()
                .emailAlertsEnabled(user.isEmailAlertsEnabled())
                .minimumAlertSeverity(user.getMinimumAlertSeverity())
                .build();

        return ResponseEntity.ok(dto);
    }

    @PutMapping
    @Operation(summary = "Update user preferences")
    public ResponseEntity<UserPreferenceDTO> updatePreferences(@RequestBody UserPreferenceDTO request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        log.info("PUT /api/user/preferences for user: {}", email);

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setEmailAlertsEnabled(request.isEmailAlertsEnabled());
        user.setMinimumAlertSeverity(request.getMinimumAlertSeverity());
        userRepository.save(user);

        return ResponseEntity.ok(request);
    }
}
