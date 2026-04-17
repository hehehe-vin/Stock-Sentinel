package com.stocksentinel.auth;

import com.stocksentinel.auth.dto.AuthResponseDTO;
import com.stocksentinel.auth.dto.LoginRequestDTO;
import com.stocksentinel.auth.dto.RegisterRequestDTO;
import com.stocksentinel.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, JwtUtil jwtUtil, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponseDTO register(RegisterRequestDTO request) {
        String email = request.getEmail();
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already registered: " + email);
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());

        UserEntity user = UserEntity.builder()
                .name(request.getName())
                .email(email)
                .password(encodedPassword)
                .role("USER")
                .build();

        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getEmail());
        log.info("New user registered: {}", request.getEmail());

        return AuthResponseDTO.builder()
                .token(token)
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .message("Registration successful")
                .build();
    }

    public AuthResponseDTO login(LoginRequestDTO request) {
        String email = request.getEmail();
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        boolean isPasswordValid = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!isPasswordValid) {
            throw new RuntimeException("Invalid password");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        log.info("User logged in: {}", request.getEmail());

        return AuthResponseDTO.builder()
                .token(token)
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .message("Login successful")
                .build();
    }
}
