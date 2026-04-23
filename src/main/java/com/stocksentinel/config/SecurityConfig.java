package com.stocksentinel.config;

import com.stocksentinel.auth.JwtAuthFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        log.info("Security configuration loaded");
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Auth endpoints
                        .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                        // Swagger & H2
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/api-docs/**").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        // Public read-only API — dashboard works without login
                        .requestMatchers(HttpMethod.GET, "/api/stocks/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/stocks").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/datasource/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/anomalies/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/anomalies").permitAll()
                        // Static resources (for future SPA serving)
                        .requestMatchers("/", "/index.html", "/assets/**", "/*.js", "/*.css", "/*.ico").permitAll()
                        // Everything else (CSV upload, watchlist, alerts) needs auth
                        .anyRequest().authenticated())
                .headers(headers -> headers.frameOptions(frame -> frame.disable()))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
