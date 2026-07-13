package com.example.absensiprototype.data.api

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/** Render free tier can take 30–60s to wake from cold start. */
private const val COLD_START_TIMEOUT_MS = 90_000L

expect fun createHttpClient(): HttpClient

fun HttpClientConfig<*>.installDefaults() {
    expectSuccess = true
    install(HttpTimeout) {
        requestTimeoutMillis = COLD_START_TIMEOUT_MS
        connectTimeoutMillis = COLD_START_TIMEOUT_MS
        socketTimeoutMillis = COLD_START_TIMEOUT_MS
    }
    install(ContentNegotiation) {
        json(
            Json {
                ignoreUnknownKeys = true
                isLenient = true
            },
        )
    }
    install(Logging) {
        level = LogLevel.INFO
        logger = object : Logger {
            override fun log(message: String) {
                println(message)
            }
        }
    }
    defaultRequest {
        contentType(ContentType.Application.Json)
    }
}
