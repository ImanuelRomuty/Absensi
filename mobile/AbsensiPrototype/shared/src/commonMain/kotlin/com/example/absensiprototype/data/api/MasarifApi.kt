package com.example.absensiprototype.data.api

import com.example.absensiprototype.config.AppConfig
import com.example.absensiprototype.data.session.TokenStore
import com.example.absensiprototype.domain.model.AttendanceRecord
import com.example.absensiprototype.domain.model.PunchType
import com.example.absensiprototype.domain.model.UserSession
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.json.Json

class MasarifApi(
    private val tokenStore: TokenStore,
    private val httpClient: HttpClient = createHttpClient(),
) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    suspend fun login(email: String, password: String): UserSession {
        try {
            val response = httpClient.post("$BASE/api/v1/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(LoginRequest(email = email.trim(), password = password))
            }.body<DataEnvelope<LoginData>>()

            val data = response.data
            val session = UserSession(
                accessToken = data.accessToken,
                refreshToken = data.refreshToken,
                email = data.user.email,
                role = data.user.role,
                employeeId = data.user.employeeId,
                employeeName = data.user.employee?.name,
            )
            persistSession(session)
            return session
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }

    suspend fun clock(type: PunchType, latitude: Double, longitude: Double, accuracy: Double?, idempotencyKey: String): AttendanceRecord {
        val path = when (type) {
            PunchType.CLOCK_IN -> "clock-in"
            PunchType.CLOCK_OUT -> "clock-out"
        }
        val token = tokenStore.accessToken
            ?: throw ApiException("UNAUTHORIZED", "Silakan login ulang")
        try {
            val response = httpClient.post("$BASE/api/v1/attendance/$path") {
                bearerAuth(token)
                contentType(ContentType.Application.Json)
                setBody(
                    PunchRequest(
                        latitude = latitude,
                        longitude = longitude,
                        accuracyMeters = accuracy,
                        idempotencyKey = idempotencyKey,
                    ),
                )
            }.body<DataEnvelope<AttendanceDto>>()
            return response.data.toDomain()
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }

    suspend fun myAttendance(page: Int = 1, limit: Int = 30): List<AttendanceRecord> {
        val token = tokenStore.accessToken
            ?: throw ApiException("UNAUTHORIZED", "Silakan login ulang")
        try {
            val response = httpClient.get("$BASE/api/v1/attendance/me?page=$page&limit=$limit") {
                bearerAuth(token)
            }.body<AttendanceListEnvelope>()
            return response.data.map { it.toDomain() }
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }

    fun currentSession(): UserSession? {
        val access = tokenStore.accessToken ?: return null
        val refresh = tokenStore.refreshToken ?: return null
        val email = tokenStore.email ?: return null
        return UserSession(
            accessToken = access,
            refreshToken = refresh,
            email = email,
            role = tokenStore.role.orEmpty(),
            employeeId = tokenStore.employeeId,
            employeeName = tokenStore.employeeName,
        )
    }

    fun logout() {
        tokenStore.clearSession()
    }

    private fun persistSession(session: UserSession) {
        tokenStore.accessToken = session.accessToken
        tokenStore.refreshToken = session.refreshToken
        tokenStore.email = session.email
        tokenStore.role = session.role
        tokenStore.employeeId = session.employeeId
        tokenStore.employeeName = session.employeeName
    }

    private suspend fun parseError(e: ClientRequestException): ApiException {
        val text = runCatching { e.response.bodyAsText() }.getOrNull().orEmpty()
        val parsed = runCatching { json.decodeFromString<ApiErrorEnvelope>(text) }.getOrNull()
        return ApiException(
            code = parsed?.error?.code ?: "HTTP_${e.response.status.value}",
            message = parsed?.error?.message ?: e.message,
        )
    }

    private fun AttendanceDto.toDomain() = AttendanceRecord(
        id = id,
        type = if (type == "CLOCK_OUT") PunchType.CLOCK_OUT else PunchType.CLOCK_IN,
        recordedAt = recordedAt,
        locationName = location?.name,
        isLate = isLate,
        isEarly = isEarly,
    )

    companion object {
        private val BASE = AppConfig.API_BASE_URL.trimEnd('/')
    }
}
